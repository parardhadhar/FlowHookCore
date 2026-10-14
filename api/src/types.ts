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
  step: 'received' | 'verified' | 'enqueued' | 'action_called' | 'action_failed' | 'action_succeeded';
  payload: Record<string, any> | null;
  created_at: string;
}

export interface IdempotencyKey {
  source: string;
  external_event_id: string;
  run_id: string | null;
  created_at: string;
}

export interface JobPayload {
  run_id: string;
}
