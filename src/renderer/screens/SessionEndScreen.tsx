import type { SessionSummary } from '../../shared/types';

interface SessionEndScreenProps {
  summary: SessionSummary;
  wasAutoEnded?: boolean;
  onStartNew: () => void;
}

export default function SessionEndScreen({
  summary,
  wasAutoEnded,
  onStartNew,
}: SessionEndScreenProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '<1 min';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-lg">
          <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-positive-bg">
            <svg
              className="h-8 w-8 text-positive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-xs">
            Session Complete
          </h1>
          {wasAutoEnded && (
            <p className="text-small leading-[1.5] text-text-tertiary">
              This session was ended automatically.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-xl">
          <div className="grid grid-cols-2 gap-lg">
            <StatItem label="Total time" value={formatDuration(summary.total_minutes)} />
            <StatItem label="Active time" value={formatDuration(summary.active_minutes)} />
            <StatItem label="Paused time" value={formatDuration(summary.paused_minutes)} />
            <StatItem label="Captures" value={String(summary.capture_count)} />
            <StatItem label="Feeling logs" value={String(summary.feeling_count)} />
          </div>
        </div>

        <button
          onClick={onStartNew}
          className="w-full rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700"
        >
          Start New Session
        </button>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-small font-medium text-text-tertiary mb-xs">{label}</p>
      <p className="font-heading text-h3 font-semibold text-text-primary">{value}</p>
    </div>
  );
}
