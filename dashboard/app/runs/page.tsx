import { getAllRuns, getWorkflows } from '@/lib/api';
import LogoStrip from '@/components/LogoStrip';
import NavSidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TracePanel from '@/components/TracePanel';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

const TL: Record<string, string> = { 'stripe.payment_succeeded': 'Stripe', 'github.issue_opened': 'GitHub' };
const AL: Record<string, string> = { 'slack.message': 'Slack', 'email.send': 'Email' };

export default async function RunsPage() {
  const [runs, wfs] = await Promise.all([getAllRuns(), getWorkflows()]);
  return (
    <div className="shell">
      <LogoStrip />
      <NavSidebar />
      <TopBar />
      <div className="main-content animate-enter">
        <h1 className="page-heading">Run History</h1>
        <div className="activity-wrap">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Workflow</th>
                <th>Pipeline</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#a78bfa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>No runs yet — fire a webhook to begin</div>
                </td></tr>
              ) : runs.map((run) => {
                const wf = wfs.find((w) => w.id === run.workflow_id);
                return (
                  <tr key={run.id}>
                    <td><Link href={`/runs/${run.id}`} className="mono" style={{ color: '#a78bfa', fontSize: 12 }}>{run.id.substring(0,8)}…</Link></td>
                    <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-white)' }}>{run.workflow_name ?? wf?.name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="pill pill-trigger" style={{ padding: '2px 7px', fontSize: 10 }}>{TL[wf?.trigger_type ?? ''] ?? '—'}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                        <span className="pill pill-action" style={{ padding: '2px 7px', fontSize: 10 }}>{AL[wf?.action_type ?? ''] ?? '—'}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={run.status} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{run.attempt_count}</td>
                    <td className="col-time">{new Date(run.created_at).toLocaleString()}</td>
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
