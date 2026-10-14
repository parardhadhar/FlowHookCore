import { getWorkflowRuns, getWorkflows } from '@/lib/api';
import LogoStrip from '@/components/LogoStrip';
import NavSidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TracePanel from '@/components/TracePanel';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

export default async function WorkflowRunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [wfs, runs] = await Promise.all([getWorkflows(), getWorkflowRuns(id)]);
  const wf = wfs.find((w) => w.id === id);
  return (
    <div className="shell">
      <LogoStrip />
      <NavSidebar />
      <TopBar />
      <div className="main-content animate-enter">
        <div className="breadcrumb">
          <Link href="/workflows">Workflows</Link>
          <span className="breadcrumb-sep">/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{wf?.name ?? id}</span>
          <span className="breadcrumb-sep">/</span>
          <span>Runs</span>
        </div>
        <h1 className="page-heading">{wf?.name ?? 'Workflow Runs'}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Runs', value: runs.length },
            { label: 'Succeeded', value: runs.filter((r) => r.status === 'succeeded').length, color: '#4ade80' },
            { label: 'Failed', value: runs.filter((r) => r.status === 'failed' || r.status === 'dead_letter').length, color: '#f87171' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', color: color ?? 'var(--text-white)' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="activity-wrap">
          <table className="activity-table">
            <thead><tr><th>Run ID</th><th>Status</th><th>Attempts</th><th>Started</th><th>Duration</th><th>Error</th></tr></thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>No runs yet</td></tr>
              ) : runs.map((run) => {
                const dur = run.started_at && run.finished_at
                  ? `${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s` : '—';
                return (
                  <tr key={run.id}>
                    <td><Link href={`/runs/${run.id}`} className="mono" style={{ color: '#a78bfa', fontSize: 12 }}>{run.id.substring(0,8)}…</Link></td>
                    <td><StatusBadge status={run.status} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{run.attempt_count}</td>
                    <td className="col-time">{run.started_at ? new Date(run.started_at).toLocaleString() : '—'}</td>
                    <td className="col-lat">{dur}</td>
                    <td>{run.error ? <span className="mono" style={{ color: '#f87171', fontSize: 11 }}>{run.error.substring(0,50)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <TracePanel />
    </div>
  );
}
