'use client';

export default function TriageBadge({ level }) {
  const labels = {
    RED: '🔴 EMERGENCY',
    AMBER: '🟡 PRIORITY',
    GREEN: '🟢 ROUTINE',
  };
  return (
    <span className={`triage-badge triage-${level || 'GREEN'}`}>
      {labels[level] || labels.GREEN}
    </span>
  );
}
