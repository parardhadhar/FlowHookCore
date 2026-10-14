-- FlowHook Database Schema
-- Run this against your Postgres instance to initialize

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- A user-configured automation
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,      -- 'stripe.payment_succeeded' | 'github.issue_opened'
  action_type TEXT NOT NULL,       -- 'slack.message' | 'email.send'
  action_config JSONB NOT NULL,    -- e.g. {"webhook_url": "...", "template": "...", "to": "..."}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One execution attempt of a workflow, for one incoming event
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  event_payload JSONB,
  status TEXT NOT NULL DEFAULT 'queued',  -- 'queued' | 'running' | 'succeeded' | 'retrying' | 'failed' | 'dead_letter'
  attempt_count INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step-level trace for debugging in the dashboard
CREATE TABLE IF NOT EXISTS run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  step TEXT NOT NULL,              -- 'received' | 'verified' | 'enqueued' | 'action_called' | 'action_failed' | 'action_succeeded'
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevents double-processing the same external event
CREATE TABLE IF NOT EXISTS idempotency_keys (
  source TEXT NOT NULL,            -- 'stripe' | 'github'
  external_event_id TEXT NOT NULL, -- Stripe event.id / GitHub delivery ID
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (source, external_event_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_runs_workflow_id ON runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_logs_run_id ON run_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
