export type StatusType = 'queued' | 'running' | 'succeeded' | 'retrying' | 'failed' | 'dead_letter';

const META: Record<StatusType, { label: string; dot: string }> = {
  queued:      { label: 'Queued',      dot: '#9ca3af' },
  running:     { label: 'Running',     dot: '#67e8f9' },
  succeeded:   { label: 'Succeeded',   dot: '#4ade80' },
  retrying:    { label: 'Retrying',    dot: '#facc15' },
  failed:      { label: 'Failed',      dot: '#f87171' },
  dead_letter: { label: 'Dead Letter', dot: '#fca5a5' },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const { label, dot } = META[status] ?? META.queued;
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" style={{ background: dot }} />
      {label}
    </span>
  );
}
