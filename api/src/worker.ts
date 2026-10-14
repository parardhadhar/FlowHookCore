import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { pool, query, queryOne } from './db';
import { redisConnection } from './queue';
import { sendSlackMessage, sendEmail } from './adapters';
import { JobPayload, Run, Workflow } from './types';

const QUEUE_NAME = 'action-queue';

const worker = new Worker<JobPayload>(
  QUEUE_NAME,
  async (job: Job<JobPayload>) => {
    const { run_id } = job.data;
    console.log(`[worker] Processing run ${run_id} (attempt ${job.attemptsMade + 1})`);

    const client = await pool.connect();
    try {
      // Mark run as running
      await client.query(
        `UPDATE runs SET status = 'running', started_at = now(), attempt_count = $1 WHERE id = $2`,
        [job.attemptsMade + 1, run_id]
      );

      const run = await queryOne<Run>(
        `SELECT * FROM runs WHERE id = $1`,
        [run_id]
      );
      if (!run) throw new Error(`Run ${run_id} not found`);

      const workflow = await queryOne<Workflow>(
        `SELECT * FROM workflows WHERE id = $1`,
        [run.workflow_id]
      );
      if (!workflow) throw new Error(`Workflow ${run.workflow_id} not found`);

      const payload = run.event_payload ?? {};

      // Log action_called step
      await client.query(
        `INSERT INTO run_logs (run_id, step, payload) VALUES ($1, 'action_called', $2)`,
        [run_id, JSON.stringify({ action_type: workflow.action_type })]
      );

      // Execute the correct adapter
      if (workflow.action_type === 'slack.message') {
        await sendSlackMessage(workflow.action_config as any, payload);
      } else if (workflow.action_type === 'email.send') {
        await sendEmail(workflow.action_config as any, payload);
      } else {
        throw new Error(`Unknown action_type: ${workflow.action_type}`);
      }

      // Success
      await client.query(
        `UPDATE runs SET status = 'succeeded', finished_at = now(), error = NULL WHERE id = $1`,
        [run_id]
      );
      await client.query(
        `INSERT INTO run_logs (run_id, step, payload) VALUES ($1, 'action_succeeded', $2)`,
        [run_id, JSON.stringify({ message: 'Action completed successfully' })]
      );

      console.log(`[worker] Run ${run_id} succeeded`);
    } catch (err: any) {
      console.error(`[worker] Run ${run_id} failed:`, err.message);

      const isLastAttempt = (job.attemptsMade + 1) >= (job.opts.attempts ?? 5);
      const newStatus = isLastAttempt ? 'dead_letter' : 'retrying';

      await client.query(
        `UPDATE runs SET status = $1, finished_at = now(), error = $2 WHERE id = $3`,
        [newStatus, err.message, run_id]
      );
      await client.query(
        `INSERT INTO run_logs (run_id, step, payload) VALUES ($1, 'action_failed', $2)`,
        [run_id, JSON.stringify({ error: err.message, attempt: job.attemptsMade + 1, final: isLastAttempt })]
      );

      // Re-throw so BullMQ handles the retry
      throw err;
    } finally {
      client.release();
    }
  },
  {
    connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err);
});

console.log(`[worker] Started — listening on "${QUEUE_NAME}"`);
