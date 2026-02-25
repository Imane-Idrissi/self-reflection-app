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
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <Header onSettings={onSettings} />

      <main className="flex-1 px-xl py-2xl">
        <div className="mx-auto max-w-[640px]">
          <WelcomeSection isNewUser={isNewUser} onStartSession={onStartSession} />

          <section className="mt-2xl">
            <h2 className="font-heading text-h3 font-semibold leading-[1.4] text-text-primary mb-md">
              Recent Sessions
            </h2>

            {loading && (
              <div className="flex justify-center py-2xl">
                <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
              </div>
            )}

            {!loading && sessions.length === 0 && (
              <EmptyState />
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

function Header({ onSettings }: { onSettings: () => void }) {
  return (
    <header className="flex items-center justify-between px-xl py-md border-b border-border">
      <h1 className="font-heading text-h3 font-semibold leading-[1.4] text-text-primary">
        Self Reflection
      </h1>
      <button
        onClick={onSettings}
        className="p-sm rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors duration-[150ms]"
        title="Settings"
      >
        <GearIcon />
      </button>
    </header>
  );
}

function WelcomeSection({ isNewUser, onStartSession }: { isNewUser: boolean; onStartSession: () => void }) {
  return (
    <div className="text-center">
      {isNewUser ? (
        <>
          <h2 className="font-heading text-display font-bold leading-[1.2] text-text-primary mb-sm">
            Welcome
          </h2>
          <p className="text-body leading-[1.6] text-text-secondary max-w-[460px] mx-auto mb-xl">
            Track your focus sessions, understand your work habits, and get
            personalized insights after every session.
          </p>
        </>
      ) : (
        <h2 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-xl">
          Welcome back
        </h2>
      )}

      <button
        onClick={onStartSession}
        className="inline-flex items-center justify-center rounded-md bg-primary-500 px-xl py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700"
      >
        Start New Session
      </button>
    </div>
  );
}

function SessionCard({ session, onClick }: { session: DashboardSession; onClick: () => void }) {
  const date = formatDate(session.started_at);
  const duration = formatDuration(session.duration_minutes);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-md rounded-lg border border-border bg-bg-elevated px-lg py-md shadow-sm text-left transition-all duration-[150ms] ease-out hover:shadow-md hover:border-primary-200"
    >
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
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-lg py-2xl text-center shadow-sm">
      <div className="mx-auto mb-md flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary">
        <svg className="h-6 w-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-body leading-[1.6] text-text-secondary">
        Your sessions will appear here
      </p>
    </div>
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

function GearIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
