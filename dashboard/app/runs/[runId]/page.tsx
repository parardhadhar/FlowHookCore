import { getRunLogs, getAllRuns, getWorkflows } from '@/lib/api';
import LogoStrip from '@/components/LogoStrip';
import NavSidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TracePanel from '@/components/TracePanel';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

const STEP_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  received:         { icon: '↓', label: 'Event Received',    color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  verified:         { icon: '✓', label: 'Signature Verified', color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
  enqueued:         { icon: '◎', label: 'Job Enqueued',       color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' },
  action_called:    { icon: '→', label: 'Action Dispatched',  color: '#facc15', bg: 'rgba(234,179,8,0.1)' },
  action_succeeded: { icon: '✓', label: 'Action Succeeded',   color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
  action_failed:    { icon: '✕', label: 'Action Failed',      color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
};

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const [allRuns, logs, wfs] = await Promise.all([getAllRuns(), getRunLogs(runId), getWorkflows()]);
  const run = allRuns.find((r) => r.id === runId);
  const wf = wfs.find((w) => w.id === run?.workflow_id);
  const duration = run?.started_at && run?.finished_at
    ? `${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s` : null;

  return (
    <div className="shell">
      <LogoStrip />
      <NavSidebar />
      <TopBar />
      <div className="main-content animate-enter">
        <div className="breadcrumb">
          <Link href="/runs">Runs</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="mono" style={{ color: '#a78bfa' }}>{runId.substring(0, 8)}…</span>
        </div>

        {/* Run header */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 12, padding: '22px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          {run && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${run.status === 'succeeded' ? 'rgba(34,197,94,0.5)' : run.status === 'failed' || run.status === 'dead_letter' ? 'rgba(239,68,68,0.5)' : 'rgba(139,92,246,0.5)'}, transparent)`
            }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{runId}</div>
              <h1 className="page-heading" style={{ margin: 0, fontSize: 18 }}>{wf?.name ?? 'Unknown Workflow'}</h1>
              {wf && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}><span className="mono">{wf.trigger_type}</span> → <span className="mono">{wf.action_type}</span></div>}
            </div>
            {run && <StatusBadge status={run.status} />}
          </div>
          {run && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
              {[
                { label: 'Attempts', value: run.attempt_count },
                { label: 'Started', value: run.started_at ? new Date(run.started_at).toLocaleTimeString() : '—' },
                { label: 'Duration', value: duration ?? '—' },
                { label: 'Status', value: run.status },
              ].map(({ label, value }) => (
                <div key={label} style={{ paddingRight: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-white)' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
          {run?.error && (
            <div className="mono" style={{ marginTop: 12, padding: '8px 12px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#f87171' }}>{run.error}</div>
          )}
        </div>

        {/* Trace */}
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-white)', marginBottom: 16, letterSpacing: '-0.01em' }}>Pipeline Trace</h2>
        <div className="run-timeline">
          {logs.map((log, i) => {
            const m = STEP_META[log.step] ?? { icon: '●', label: log.step, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
            return (
              <div key={log.id} className="run-tl-item">
                <div className="run-tl-spine">
                  <div className="run-tl-dot" style={{ background: m.bg, border: `1px solid ${m.color}44`, color: m.color, fontSize: 12 }}>{m.icon}</div>
                  {i < logs.length - 1 && <div className="run-tl-line" />}
                </div>
                <div className="run-tl-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="run-tl-name" style={{ color: m.color }}>{m.label}</div>
                    <div className="run-tl-time">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</div>
                  </div>
                  {log.payload && (
                    <pre className="code-block">{JSON.stringify(log.payload, null, 2)}</pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Raw payload */}
        {run?.event_payload && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-white)', marginBottom: 12, letterSpacing: '-0.01em' }}>Raw Event Payload</h2>
            <pre className="code-block" style={{ color: '#7dd3fc', maxHeight: 280 }}>{JSON.stringify(run.event_payload, null, 2)}</pre>
          </div>
        )}
      </div>
      <TracePanel />
    </div>
  );
}
