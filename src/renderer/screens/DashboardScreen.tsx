import { useState, useEffect } from 'react';
import type { DashboardSession } from '../../shared/types';

interface DashboardScreenProps {
  onStartSession: () => void;
  onSettings: () => void;
  onSessionClick: (sessionId: string) => void;
}

export default function DashboardScreen({
  onStartSession,
  onSettings,
  onSessionClick,
}: DashboardScreenProps) {
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.api.dashboardGetSessions({ limit: 10 });
        setSessions(result);
      } catch {
        // Silently fail, show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isNewUser = !loading && sessions.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg-primary overflow-hidden">
      <WaveTopLeft />
      <WaveBottomRight />

      <header className="relative z-10 flex items-center justify-between px-xl py-md">
        <h1 className="font-heading text-h3 font-semibold leading-[1.4] text-text-primary">
          Self Reflection
        </h1>
        <button
          onClick={onSettings}
          className="flex items-center gap-sm rounded-md border border-border bg-bg-elevated px-md py-sm text-small font-medium text-text-secondary shadow-sm transition-colors duration-[150ms] hover:border-primary-400 hover:text-primary-600"
        >
          <KeyIcon />
          API Key
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-md py-xl">
        <div className="w-full max-w-[520px]">
          {/* Hero */}
          <div className="text-center mb-2xl pt-md">
            {isNewUser ? (
              <>
                <span className="mb-md text-[48px] leading-none" role="img" aria-label="Waving hand">👋</span>
                <h2 className="font-heading text-display font-bold leading-[1.2] text-text-primary mb-sm">
                  Welcome
                </h2>
                <p className="text-body leading-[1.6] text-text-secondary max-w-[420px] mx-auto">
                  Track your focus sessions, understand your work habits, and
                  get personalized insights after every session.
                </p>
              </>
            ) : (
              <h2 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary">
                Welcome back
              </h2>
            )}

            <button
              onClick={onStartSession}
              className="mt-xl mx-auto w-full max-w-[320px] flex items-center justify-center rounded-md bg-primary-500 px-xl py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700"
            >
              Start New Session
            </button>
          </div>

          {/* Sessions */}
          <section>
            <div className="flex items-center gap-sm mb-md">
              <div className="h-[2px] w-4 rounded-full bg-primary-500" />
              <h2 className="font-heading text-small font-semibold uppercase tracking-wide text-text-secondary">
                Recent Sessions
              </h2>
            </div>

            {loading && (
              <div className="flex justify-center py-2xl">
                <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
              </div>
            )}

            {!loading && sessions.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-elevated px-lg py-xl text-center">
                <p className="text-body leading-[1.6] text-text-secondary">
                  Your sessions will appear here
                </p>
              </div>
            )}

            {!loading && sessions.length > 0 && (
              <div className="space-y-sm">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.session_id}
                    session={session}
                    onClick={() => onSessionClick(session.session_id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SessionCard({ session, onClick }: { session: DashboardSession; onClick: () => void }) {
  const date = formatDate(session.started_at);
  const duration = formatDuration(session.duration_minutes);

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-md rounded-lg border border-border bg-bg-elevated px-lg py-md shadow-sm text-left transition-all duration-[150ms] ease-out hover:shadow-md hover:border-primary-200"
    >
      <div className="h-8 w-1 rounded-full bg-primary-200 transition-colors duration-[150ms] group-hover:bg-primary-500" />
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium leading-[1.6] text-text-primary truncate">
          {session.name}
        </p>
        <p className="text-small leading-[1.5] text-text-tertiary mt-xs">
          {date}
        </p>
      </div>
      <span className="text-small font-medium leading-[1.5] text-text-secondary whitespace-nowrap">
        {duration}
      </span>
      <svg className="h-4 w-4 text-text-tertiary transition-colors duration-[150ms] group-hover:text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function WaveTopLeft() {
  return (
    <svg
      className="absolute top-0 left-0 w-[360px] h-[320px] text-primary-200"
      viewBox="0 0 360 320"
      fill="currentColor"
      preserveAspectRatio="none"
    >
      <path d="M0 0h360c0 0-50 90-140 140S50 230 0 320V0z" />
    </svg>
  );
}

function WaveBottomRight() {
  return (
    <svg
      className="absolute bottom-0 right-0 w-[360px] h-[320px] text-primary-200"
      viewBox="0 0 360 320"
      fill="currentColor"
      preserveAspectRatio="none"
    >
      <path d="M360 320H0c0 0 50-90 140-140S310-10 360 0v320z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}
