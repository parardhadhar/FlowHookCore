import { verifyStripeSignature, verifyGitHubSignature } from './signatures';
import { Request, Response } from 'express';
import { pool, query, queryOne } from '../db';
import { actionQueue } from '../queue';
import { Workflow } from '../types';

/** Core receive-and-enqueue logic, shared by Stripe and GitHub handlers */
async function enqueueEvent(opts: {
  source: 'stripe' | 'github';
  externalEventId: string;
  triggerType: string;
  payload: Record<string, any>;
  res: Response;
}): Promise<void> {
  const { source, externalEventId, triggerType, payload, res } = opts;

  // Find all active workflows for this trigger
  const workflows = await query<Workflow>(
    `SELECT * FROM workflows WHERE trigger_type = $1 AND is_active = true`,
    [triggerType]
  );

  if (workflows.length === 0) {
    res.json({ ok: true, message: 'No active workflows for this trigger' });
    return;
  }

  const jobs: string[] = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const workflow of workflows) {
      // Create a run row
      const run = await client.query(
        `INSERT INTO runs (workflow_id, event_payload, status)
         VALUES ($1, $2, 'queued') RETURNING id`,
        [workflow.id, JSON.stringify(payload)]
      );
      const runId: string = run.rows[0].id;

      // Try to insert idempotency key; ON CONFLICT means already processed
      const idempotencyId = `${externalEventId}::${workflow.id}`;
      const ikResult = await client.query(
        `INSERT INTO idempotency_keys (source, external_event_id, run_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (source, external_event_id) DO NOTHING
         RETURNING source`,
        [source, idempotencyId, runId]
      );

      if (ikResult.rowCount === 0) {
        // Already processed – roll back this run and skip
        await client.query(`DELETE FROM runs WHERE id = $1`, [runId]);
        console.log(`[idempotency] Duplicate event ${externalEventId} for workflow ${workflow.id} – skipped`);
        continue;
      }

      // Log the received step
      await client.query(
        `INSERT INTO run_logs (run_id, step, payload)
         VALUES ($1, 'received', $2)`,
        [runId, JSON.stringify({ source, externalEventId, triggerType })]
      );

      // Enqueue the BullMQ job
      jobs.push(runId);

      await client.query(
        `INSERT INTO run_logs (run_id, step, payload)
         VALUES ($1, 'enqueued', $2)`,
        [runId, JSON.stringify({ job_id: runId })]
      );
    }

    await client.query('COMMIT');
    // Publish only after the rows are visible to the worker.
    for (const runId of jobs) {
      await actionQueue.add('execute', { run_id: runId }, { jobId: runId });
    }
    res.json({ ok: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[receiver] Transaction failed:', err.message);
    res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
}

/** POST /webhooks/stripe */
export async function handleStripe(req: Request, res: Response): Promise<void> {
  const rawBody: Buffer = (req as any).rawBody;
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig || !rawBody) {
    res.status(400).json({ error: 'Missing signature or body' });
    return;
  }

  const { valid } = verifyStripeSignature(rawBody, sig, secret);
  if (!valid) {
    console.warn('[stripe] Signature verification failed');
    res.status(401).json({ error: 'Signature mismatch' });
    return;
  }

  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); }
  catch { res.status(400).json({ error: 'Invalid JSON' }); return; }
  if (typeof event?.id !== 'string' || !event.id) {
    res.status(400).json({ error: 'Missing event ID' }); return;
  }

  if (event.type !== 'payment_intent.succeeded') {
    // Acknowledge other event types without processing
    res.json({ ok: true, ignored: true });
    return;
  }

  await enqueueEvent({
    source: 'stripe',
    externalEventId: event.id,
    triggerType: 'stripe.payment_succeeded',
    payload: event,
    res,
  });
}

/** POST /webhooks/github */
export async function handleGitHub(req: Request, res: Response): Promise<void> {
  const rawBody: Buffer = (req as any).rawBody;
  const sig = req.headers['x-hub-signature-256'] as string;
  const eventType = req.headers['x-github-event'] as string;
  const deliveryId = req.headers['x-github-delivery'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;

  if (!sig || !rawBody) {
    res.status(400).json({ error: 'Missing signature or body' });
    return;
  }

  const valid = verifyGitHubSignature(rawBody, sig, secret);
  if (!valid) {
    console.warn('[github] Signature verification failed');
    res.status(401).json({ error: 'Signature mismatch' });
    return;
  }

  let payload;
  try { payload = JSON.parse(rawBody.toString('utf8')); }
  catch { res.status(400).json({ error: 'Invalid JSON' }); return; }
  if (!deliveryId) {
    res.status(400).json({ error: 'Missing delivery ID' }); return;
  }
  if (eventType !== 'issues' || payload?.action !== 'opened') {
    res.json({ ok: true, ignored: true });
    return;
  }

  await enqueueEvent({
    source: 'github',
    externalEventId: deliveryId,
    triggerType: 'github.issue_opened',
    payload,
    res,
  });
}
