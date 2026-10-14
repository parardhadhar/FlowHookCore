import { Router } from 'express';
import { query, queryOne } from '../db';
import { Workflow, Run, RunLog } from '../types';

const router = Router();

// GET /api/workflows
router.get('/', async (req, res) => {
  const workflows = await query<Workflow>(
    `SELECT * FROM workflows ORDER BY created_at DESC`
  );
  res.json(workflows);
});

// POST /api/workflows
router.post('/', async (req, res) => {
  const { name, trigger_type, action_type, action_config } = req.body;
  if (!name || !trigger_type || !action_type || !action_config) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const [wf] = await query<Workflow>(
    `INSERT INTO workflows (name, trigger_type, action_type, action_config)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, trigger_type, action_type, JSON.stringify(action_config)]
  );
  res.status(201).json(wf);
});

// PATCH /api/workflows/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  const wf = await queryOne<Workflow>(
    `UPDATE workflows SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!wf) return res.status(404).json({ error: 'Not found' });
  res.json(wf);
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  await query(`DELETE FROM workflows WHERE id = $1`, [req.params.id]);
  res.status(204).send();
});

// GET /api/workflows/:id/runs
router.get('/:id/runs', async (req, res) => {
  const runs = await query<Run>(
    `SELECT * FROM runs WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.params.id]
  );
  res.json(runs);
});

// GET /api/runs/:runId/logs
router.get('/runs/:runId/logs', async (req, res) => {
  const logs = await query<RunLog>(
    `SELECT * FROM run_logs WHERE run_id = $1 ORDER BY created_at ASC`,
    [req.params.runId]
  );
  res.json(logs);
});

// GET /api/runs (all runs, for dashboard overview)
router.get('/runs', async (req, res) => {
  const runs = await query<Run & { workflow_name: string }>(
    `SELECT r.*, w.name as workflow_name
     FROM runs r
     JOIN workflows w ON r.workflow_id = w.id
     ORDER BY r.created_at DESC
     LIMIT 100`
  );
  res.json(runs);
});

export default router;
