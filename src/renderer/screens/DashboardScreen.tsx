import { useState, useEffect, useRef, useCallback } from 'react';
import type { DashboardSession } from '../../shared/types';
import { UnblurryLogo } from '../components/UnblurryLogo';
import ThemeToggle from '../components/ThemeToggle';

interface DashboardScreenProps {
  onStartSession: () => void;
  onSettings: () => void;
  onSessionClick: (sessionId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function DashboardScreen({
  onStartSession,
  onSettings,
  onSessionClick,
  theme,
  onToggleTheme,
}: DashboardScreenProps) {
  const PAGE_SIZE = 20;
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [searchResults, setSearchResults] = useState<DashboardSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.api.dashboardGetSessions({ limit: PAGE_SIZE, offset: 0 });
        setSessions(result);
        setHasMore(result.length === PAGE_SIZE);
      } catch {
        // Silently fail, show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const searchServer = useCallback((query: string) => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await window.api.dashboardGetSessions({ search: query, limit: 50 });
        setSearchResults(result);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchServer(value);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await window.api.dashboardGetSessions({ limit: PAGE_SIZE, offset: sessions.length });
      setSessions((prev) => [...prev, ...result]);
      setHasMore(result.length === PAGE_SIZE);
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<DashboardSession | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, session: DashboardSession) => {
    e.stopPropagation();
    setDeleteTarget(session);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.session_id;
    setDeleteTarget(null);
    const result = await window.api.sessionDelete({ session_id: id });
    if (result.success) {
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
      if (searchResults) {
        setSearchResults((prev) => prev!.filter((s) => s.session_id !== id));
      }
    }
  };

  const displayedSessions = searchResults !== null ? searchResults : sessions;
  const isSearching = searchQuery.trim().length > 0;
  const isNewUser = !loading && sessions.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg-primary overflow-hidden">
      <WaveTopLeft />
      <WaveBottomRight />

      <header className="relative z-50 no-drag flex items-center justify-between pl-xl pr-xl pt-[46px] pb-md">
        <UnblurryLogo size={24} />
        <div className="flex items-center gap-sm">
          <button
            onClick={onSettings}
            className="flex items-center gap-sm rounded-md border border-border bg-bg-elevated px-md py-sm text-small font-medium text-text-secondary shadow-sm transition-colors duration-[150ms] hover:border-primary-400 hover:text-primary-600"
          >
            <KeyIcon />
            API Key
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
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
                <p className="text-body leading-[1.6] text-text-primary max-w-[420px] mx-auto">
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

            {!loading && sessions.length > 0 && (
              <div className="relative mb-md">
                <svg className="pointer-events-none absolute left-[12px] top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full rounded-md border border-border bg-bg-elevated py-sm pl-[36px] pr-md text-body text-text-primary placeholder:text-text-tertiary transition-colors duration-[150ms] focus:border-primary-500 focus:outline-none"
                />
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-2xl">
                <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
              </div>
            )}

            {!loading && sessions.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-elevated px-lg py-xl text-center">
                <div className="mx-auto mb-sm flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary">
                  <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-body leading-[1.6] text-text-secondary">
                  Your sessions will appear here
                </p>
              </div>
            )}

            {!loading && sessions.length > 0 && displayedSessions.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-elevated px-lg py-xl text-center">
                <p className="text-body leading-[1.6] text-text-secondary">
                  No matching sessions
                </p>
              </div>
            )}

            {!loading && displayedSessions.length > 0 && (
              <div className="space-y-sm">
                {displayedSessions.map((session) => (
                  <SessionCard
                    key={session.session_id}
                    session={session}
                    onClick={() => onSessionClick(session.session_id)}
                    onDelete={(e) => handleDeleteClick(e, session)}
                  />
                ))}
              </div>
            )}

            {!loading && hasMore && !isSearching && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-md w-full rounded-md border border-border bg-bg-elevated py-sm text-small font-medium text-text-secondary transition-colors duration-[150ms] hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load more sessions'}
              </button>
            )}
          </section>
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-[360px] rounded-xl bg-bg-elevated p-xl shadow-xl mx-md">
            <h2 className="font-heading text-h3 font-semibold text-text-primary mb-sm">
              Delete this session?
            </h2>
            <p className="text-body leading-[1.6] text-text-secondary mb-lg">
              {deleteTarget.has_report
                ? 'This session has a report. Download it before deleting if you want to keep it. This action is permanent.'
                : 'All data for this session will be permanently deleted.'}
            </p>
            {deleteTarget.has_report && (
              <button
                onClick={() => {
                  const id = deleteTarget.session_id;
                  setDeleteTarget(null);
                  onSessionClick(id);
                }}
                className="mb-md w-full flex items-center justify-center gap-sm rounded-md border border-primary-300 bg-bg-elevated px-lg py-[12px] text-body font-medium text-primary-600 shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                View & Download Report
              </button>
            )}
            <div className="flex gap-sm">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-secondary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-md bg-negative px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-red-700 active:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, onClick, onDelete }: { session: DashboardSession; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const date = formatDate(session.started_at);
  const duration = formatDuration(session.duration_minutes);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="group w-full flex items-center gap-md rounded-lg border border-border bg-bg-elevated px-lg py-md shadow-sm text-left cursor-pointer transition-all duration-[150ms] ease-out hover:shadow-md hover:border-primary-200"
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
      <span className="flex items-center gap-[4px] text-small font-medium leading-[1.5] text-text-secondary whitespace-nowrap" title="Session duration">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {duration}
      </span>
      <button
        onClick={onDelete}
        className="rounded-md p-[6px] text-text-tertiary transition-all duration-[150ms] hover:bg-negative-bg hover:text-negative"
        title="Delete session"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
      <svg className="h-4 w-4 text-text-tertiary transition-colors duration-[150ms] group-hover:text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
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

function WaveTopLeft() {
  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 w-[360px] h-[320px] text-primary-200"
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
      className="pointer-events-none absolute bottom-0 right-0 w-[360px] h-[320px] text-primary-200"
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

