const API_URL = typeof window === 'undefined' ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Workflow {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface Run {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  event_payload: Record<string, any> | null;
  status: 'queued' | 'running' | 'succeeded' | 'retrying' | 'failed' | 'dead_letter';
  attempt_count: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_at: string;
}

export interface RunLog {
  id: string;
  run_id: string;
  step: string;
  payload: Record<string, any> | null;
  created_at: string;
}

export async function getWorkflows(): Promise<Workflow[]> {
  const res = await fetch(`${API_URL}/api/workflows`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function toggleWorkflow(id: string): Promise<Workflow> {
  const res = await fetch(`${API_URL}/api/workflows/${id}/toggle`, { method: 'PATCH' });
  return res.json();
}

export async function deleteWorkflow(id: string): Promise<void> {
  await fetch(`${API_URL}/api/workflows/${id}`, { method: 'DELETE' });
}

export async function createWorkflow(data: {
  name: string;
  trigger_type: string;
  action_type: string;
  action_config: Record<string, any>;
}): Promise<Workflow> {
  const res = await fetch(`${API_URL}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getWorkflowRuns(workflowId: string): Promise<Run[]> {
  const res = await fetch(`${API_URL}/api/workflows/${workflowId}/runs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function getAllRuns(): Promise<Run[]> {
  const res = await fetch(`${API_URL}/api/workflows/runs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function getRunLogs(runId: string): Promise<RunLog[]> {
  const res = await fetch(`${API_URL}/api/workflows/runs/${runId}/logs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}
