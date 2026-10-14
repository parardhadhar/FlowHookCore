import Link from 'next/link';
export default function TracePanel() {
  return <aside style={{gridColumn:4, gridRow:'1 / span 2',padding:'40px 24px',borderLeft:'1px solid rgba(255,255,255,.08)',background:'#10121e'}}>
    <div style={{color:'#a78bfa',fontSize:11,letterSpacing:2,marginBottom:12}}>THE EXECUTION PATH</div>
    <h2 style={{fontSize:24,marginBottom:32}}>From event<br/>to action.</h2>
    {[
      ['01','Receive & verify','HMAC signatures authenticate webhook payloads.'],
      ['02','Persist & deduplicate','PostgreSQL tracks events and workflow runs.'],
      ['03','Queue the work','BullMQ coordinates background jobs through Redis.'],
      ['04','Execute & retry','Workers run actions with exponential backoff.'],
      ['05','Inspect the result','Open a run to see its actual execution logs.'],
    ].map(([n,title,detail]) => <div key={n} style={{marginBottom:28}}>
      <div style={{color:'#a78bfa',fontSize:12,marginBottom:6}}>{n} / {title}</div>
      <p style={{color:'#939bb5',fontSize:13,lineHeight:1.7}}>{detail}</p>
    </div>)}
    <Link href="/runs" style={{color:'#c4b5fd',fontSize:13}}>View execution history →</Link>
  </aside>;
}
