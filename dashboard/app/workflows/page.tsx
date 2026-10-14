'use client';

import { useState, useEffect } from 'react';
import LogoStrip from '@/components/LogoStrip';
import NavSidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TracePanel from '@/components/TracePanel';
import { getWorkflows, toggleWorkflow, deleteWorkflow, createWorkflow, Workflow } from '@/lib/api';
import {
  IconStripe,
  IconGitHub,
  IconSlack,
  IconEmail,
  IconClose,
  IconBolt,
  IconCheck,
  IconArrowRight,
  IconSparkles,
} from '@/components/Icons';
import { LuxuryButton } from '@/components/LuxuryButton';
import Link from 'next/link';

interface TriggerOption {
  value: string;
  name: string;
  sub: string;
  icon: (props: { size?: number }) => React.JSX.Element;
}

interface ActionOption {
  value: string;
  name: string;
  sub: string;
  icon: (props: { size?: number }) => React.JSX.Element;
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    value: 'stripe.payment_succeeded',
    name: 'Stripe Payment',
    sub: 'payment_intent.succeeded',
    icon: IconStripe,
  },
  {
    value: 'github.issue_opened',
    name: 'GitHub Issue',
    sub: 'issues.opened',
    icon: IconGitHub,
  },
];

const ACTION_OPTIONS: ActionOption[] = [
  {
    value: 'slack.message',
    name: 'Slack Notification',
    sub: 'incoming_webhook',
    icon: IconSlack,
  },
  {
    value: 'email.send',
    name: 'Email Dispatch',
    sub: 'smtp.send',
    icon: IconEmail,
  },
];

function WfCard({ wf, onToggle, onDelete }: { wf: Workflow; onToggle: () => void; onDelete: () => void }) {
  const isStripe = wf.trigger_type.includes('stripe');
  const isGitHub = wf.trigger_type.includes('github');
  const isSlack = wf.action_type.includes('slack');
  const isEmail = wf.action_type.includes('email');

  return (
    <div className="wf-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-name">{wf.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.28)',
                color: '#c4b5fd',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {isStripe ? <IconStripe size={13} /> : isGitHub ? <IconGitHub size={13} /> : <IconBolt size={13} />}
              {isStripe ? 'Stripe' : isGitHub ? 'GitHub' : wf.trigger_type}
            </span>
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
              <IconArrowRight size={11} />
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                color: '#67e8f9',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {isSlack ? <IconSlack size={13} /> : isEmail ? <IconEmail size={13} /> : <IconBolt size={13} />}
              {isSlack ? 'Slack' : isEmail ? 'Email' : wf.action_type}
            </span>
          </div>
        </div>

        <label className="toggle" title="Toggle active status">
          <input type="checkbox" checked={wf.is_active} onChange={onToggle} />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="wf-config-preview">
        {JSON.stringify(wf.action_config).substring(0, 110)}…
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <Link
          href={`/workflows/${wf.id}/runs`}
          className="btn-ghost"
          style={{ padding: '6px 12px', fontSize: 11.5, gap: 5 }}
        >
          View Runs
          <IconArrowRight size={11} />
        </Link>
        <button onClick={onDelete} className="btn-danger">
          Delete
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: wf.is_active ? '#22c55e' : '#6b7280',
              boxShadow: wf.is_active ? '0 0 8px #22c55e' : 'none',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: wf.is_active ? '#4ade80' : 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {wf.is_active ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('stripe.payment_succeeded');
  const [action, setAction] = useState('slack.message');
  const [cfg, setCfg] = useState('{\n  "webhook_url": "https://hooks.slack.com/services/XXX",\n  "template": "Payment of {{amount}} received!"\n}');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    let config: any;
    try {
      config = JSON.parse(cfg);
    } catch {
      setErr('Invalid JSON syntax in action config');
      return;
    }
    setLoading(true);
    await onCreate({ name, trigger_type: trigger, action_type: action, action_config: config });
    setLoading(false);
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '3px 9px', borderRadius: 99, background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.28)' }}>
              <span className="pulse-dot" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4b5fd' }}>
                New Pipeline
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', margin: 0 }}>
              Create Workflow
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Configure triggers and automated downstream actions.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-close-modal" aria-label="Close modal">
            <IconClose size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 1 }}>
          <div>
            <label className="form-label">Workflow Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Stripe Payment → Slack Alert"
              className="input"
              autoFocus
            />
          </div>

          {/* Trigger Selector */}
          <div>
            <label className="form-label">Event Trigger Source</label>
            <div className="selector-grid">
              {TRIGGER_OPTIONS.map((opt) => {
                const isSelected = trigger === opt.value;
                const IconComponent = opt.icon;
                return (
                  <div
                    key={opt.value}
                    className={`selector-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setTrigger(opt.value)}
                  >
                    <IconComponent size={20} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="selector-card-title">{opt.name}</div>
                      <div className="selector-card-sub">{opt.sub}</div>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#a78bfa', display: 'flex' }}>
                        <IconCheck size={14} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Selector */}
          <div>
            <label className="form-label">Downstream Action</label>
            <div className="selector-grid">
              {ACTION_OPTIONS.map((opt) => {
                const isSelected = action === opt.value;
                const IconComponent = opt.icon;
                return (
                  <div
                    key={opt.value}
                    className={`selector-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setAction(opt.value);
                      if (opt.value === 'email.send') {
                        setCfg('{\n  "to": "ops@example.com",\n  "ai_summary": true, "subject": "New event: {{title}}",\n  "template": "{{ai_summary}}"\n}');
                      } else {
                        setCfg('{\n  "webhook_url": "https://hooks.slack.com/services/XXX",\n  "template": "Payment of {{amount}} received!"\n}');
                      }
                    }}
                  >
                    <IconComponent size={20} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="selector-card-title">{opt.name}</div>
                      <div className="selector-card-sub">{opt.sub}</div>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#a78bfa', display: 'flex' }}>
                        <IconCheck size={14} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* JSON Config Box */}
          <div>
            <label className="form-label">Action Payload Configuration</label>
            <div className="code-editor-box">
              <div className="code-editor-header">
                <div className="code-editor-tab">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
                  config.json
                </div>
                <span className="code-editor-tag">JSON SCHEMA</span>
              </div>
              <textarea
                value={cfg}
                onChange={(e) => setCfg(e.target.value)}
                rows={4}
                className="code-textarea"
                spellCheck={false}
              />
            </div>
          </div>

          {err && (
            <div
              style={{
                fontSize: 12,
                color: '#fca5a5',
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              {err}
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <LuxuryButton
              type="submit"
              disabled={loading}
              style={{ flex: 1.5, opacity: loading ? 0.7 : 1 }}
              icon={!loading ? <IconSparkles size={15} /> : undefined}
            >
              {loading ? 'Deploying…' : 'Deploy Workflow'}
            </LuxuryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [wfs, setWfs] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getWorkflows().then((d) => {
      setWfs(d);
      setLoading(false);
    });
  }, []);

  async function toggle(id: string) {
    const u = await toggleWorkflow(id);
    setWfs((ws) => ws.map((w) => (w.id === id ? u : w)));
  }

  async function remove(id: string) {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    await deleteWorkflow(id);
    setWfs((ws) => ws.filter((w) => w.id !== id));
  }

  async function create(d: any) {
    const wf = await createWorkflow(d);
    setWfs((ws) => [wf, ...ws]);
  }

  return (
    <div className="shell">
      <LogoStrip />
      <NavSidebar />
      <TopBar />
      <div className="main-content animate-enter">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
              Automation Engine
            </div>
            <h1 className="page-heading" style={{ margin: 0 }}>
              Workflows
            </h1>
          </div>
          <LuxuryButton onClick={() => setShowCreate(true)} icon={<IconSparkles size={15} />}>
            New Workflow
          </LuxuryButton>
        </div>

        {loading ? (
          <div className="workflow-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
            ))}
          </div>
        ) : wfs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '90px 20px',
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#a78bfa',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <IconBolt size={24} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-white)', marginBottom: 6 }}>
              No Active Workflows
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, maxWidth: 360, margin: '0 auto 22px' }}>
              Create your first automation pipeline to begin processing webhook events in real-time.
            </div>
            <LuxuryButton onClick={() => setShowCreate(true)} icon={<IconSparkles size={15} />}>
              Create Workflow
            </LuxuryButton>
          </div>
        ) : (
          <div className="workflow-grid">
            {wfs.map((wf) => (
              <WfCard
                key={wf.id}
                wf={wf}
                onToggle={() => toggle(wf.id)}
                onDelete={() => remove(wf.id)}
              />
            ))}
          </div>
        )}

        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={create} />}
      </div>
      <TracePanel />
    </div>
  );
}

