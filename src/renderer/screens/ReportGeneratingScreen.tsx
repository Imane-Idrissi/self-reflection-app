import { useEffect, useRef } from 'react';
import type { SessionSummary } from '../../shared/types';

interface ReportGeneratingScreenProps {
  sessionId: string;
  summary: SessionSummary;
  onReady: () => void;
  onFailed: () => void;
}

export default function ReportGeneratingScreen({
  sessionId,
  summary,
  onReady,
  onFailed,
}: ReportGeneratingScreenProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const result = await window.api.reportGet({ session_id: sessionId });
        if (result.status === 'ready') {
          onReady();
        } else if (result.status === 'failed') {
          onFailed();
        }
      } catch {
        // Polling error — keep trying
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, onReady, onFailed]);

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
      <div className="w-full max-w-[520px] text-center">
        <div className="mx-auto mb-xl flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
          <div className="h-5 w-5 rounded-full bg-primary-500 animate-pulse" />
        </div>

        <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
          Analyzing your session
        </h1>
        <p className="text-body leading-[1.6] text-text-secondary mb-xl">
          Building your behavioral analysis report. This usually takes 10–30 seconds.
        </p>

        <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-lg">
          <div className="grid grid-cols-3 gap-md">
            <div>
              <p className="text-small font-medium text-text-tertiary mb-xs">Total</p>
              <p className="font-heading text-h3 font-semibold text-text-primary">
                {formatDuration(summary.total_minutes)}
              </p>
            </div>
            <div>
              <p className="text-small font-medium text-text-tertiary mb-xs">Active</p>
              <p className="font-heading text-h3 font-semibold text-text-primary">
                {formatDuration(summary.active_minutes)}
              </p>
            </div>
            <div>
              <p className="text-small font-medium text-text-tertiary mb-xs">Paused</p>
              <p className="font-heading text-h3 font-semibold text-text-primary">
                {formatDuration(summary.paused_minutes)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-lg text-small text-text-tertiary">
          <span>{summary.capture_count} captures</span>
          <span>{summary.feeling_count} feelings</span>
        </div>
      </div>
    </div>
  );
}
