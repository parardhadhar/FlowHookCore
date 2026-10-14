import { getWorkflows, getAllRuns } from '@/lib/api';
import LogoStrip from '@/components/LogoStrip';
import NavSidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import TracePanel from '@/components/TracePanel';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

export default async function DashboardPage() {
  const [workflows, runs] = await Promise.all([getWorkflows(), getAllRuns()]);
  const completed = runs.filter(r => r.status === 'succeeded' || r.status === 'dead_letter');
  const succeeded = completed.filter(r => r.status === 'succeeded').length;
  const stats = [
    {label: 'ACTIVE WORKFLOWS', value: workflows.filter(w => w.is_active).length, detail: 'Configured event-to-action pipelines'},
    {label: 'RECENT EXECUTIONS', value: runs.length, detail: 'Latest 100 runs from PostgreSQL'},
    {label: 'COMPLETION SUCCESS', value: completed.length ? `${Math.round(succeeded / completed.length * 100)}%` : '—', detail: 'Succeeded / terminal runs in this window'},
  ];
  return <div className="shell">
    <LogoStrip /><NavSidebar /><TopBar />
    <div className="main-content animate-enter">
      <h1 className="page-heading">Dashboard</h1>
      <p style={{color:'var(--text-secondary)', marginBottom:28}}>Your events. Your automations. Every execution accounted for.</p>
      <div className="stat-grid">{stats.map(s => <div className="stat-card" key={s.label}>
        <div className="stat-card-glow" /><div className="stat-label">{s.label}</div>
        <div className="stat-value">{s.value}</div><div className="stat-status">{s.detail}</div>
      </div>)}</div>
      <h2 className="section-heading">Recent executions</h2>
      <div className="activity-wrap"><table className="activity-table">
        <thead><tr><th>Run</th><th>Workflow</th><th>Status</th><th>Attempts</th><th>Created</th></tr></thead>
        <tbody>{runs.length ? runs.slice(0,10).map(r => <tr key={r.id}>
          <td><Link href={`/runs/${r.id}`} style={{color:'#a78bfa'}}>{r.id.slice(0,8)}</Link></td>
          <td>{r.workflow_name}</td><td><StatusBadge status={r.status}/></td><td>{r.attempt_count}</td>
          <td>{new Date(r.created_at).toLocaleString('en-US', {timeZone:'UTC'})} UTC</td>
        </tr>) : <tr><td colSpan={5} style={{padding:48,textAlign:'center'}}>No executions yet. Create a workflow and send a signed webhook.</td></tr>}</tbody>
      </table></div>
      <div style={{display:'flex',gap:16,marginTop:24}}><Link href="/workflows" className="btn-ghost">Manage workflows →</Link><Link href="/runs" className="btn-ghost">Explore execution traces →</Link></div>
    </div><TracePanel />
  </div>;
}
