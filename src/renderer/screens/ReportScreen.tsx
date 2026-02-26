import { useState, useEffect } from 'react';
import type { ReportGetResponse, ReportPattern, ReportEvidence } from '../../shared/types';

interface ReportScreenProps {
  sessionId: string;
  skipped?: boolean;
  summary?: { total_minutes: number; active_minutes: number; paused_minutes: number };
  onStartNew: () => void;
}

export default function ReportScreen({
  sessionId,
  skipped,
  summary: skippedSummary,
  onStartNew,
}: ReportScreenProps) {
  const [data, setData] = useState<ReportGetResponse | null>(null);
  const [proofModal, setProofModal] = useState<{
    evidence: ReportEvidence;
    sessionId: string;
  } | null>(null);

  useEffect(() => {
    if (skipped) return;
    const load = async () => {
      const result = await window.api.reportGet({ session_id: sessionId });
      setData(result);
    };
    load();
  }, [sessionId, skipped]);

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '<1 min';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const sessionData = skipped
    ? { name: '', intent: '', ...skippedSummary! }
    : data?.session;

  const report = skipped ? null : data?.report;

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-[680px] px-lg py-3xl">
        {/* Section 1: Intent + Session Overview */}
        <section className="mb-2xl">
          <div className="mb-xl">
            <p className="text-small font-medium text-text-tertiary mb-xs">Session Report</p>
            <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary">
              {sessionData?.name || 'Untitled Session'}
            </h1>
          </div>

          {sessionData?.intent && (
            <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-lg">
              <p className="text-small font-medium text-text-tertiary mb-xs">Your intent</p>
              <p className="text-body leading-[1.6] text-text-primary">{sessionData.intent}</p>
            </div>
          )}

          {sessionData && (
            <div className="grid grid-cols-3 gap-md mb-lg">
              <div className="rounded-lg border border-border bg-bg-elevated px-md py-md shadow-sm text-center">
                <p className="text-small font-medium text-text-tertiary mb-xs">Total</p>
                <p className="font-heading text-h3 font-semibold text-text-primary">
                  {formatDuration(sessionData.total_minutes)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg-elevated px-md py-md shadow-sm text-center">
                <p className="text-small font-medium text-text-tertiary mb-xs">Active</p>
                <p className="font-heading text-h3 font-semibold text-text-primary">
                  {formatDuration(sessionData.active_minutes)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg-elevated px-md py-md shadow-sm text-center">
                <p className="text-small font-medium text-text-tertiary mb-xs">Paused</p>
                <p className="font-heading text-h3 font-semibold text-text-primary">
                  {formatDuration(sessionData.paused_minutes)}
                </p>
              </div>
            </div>
          )}

          {report && (
            <div className="rounded-lg border border-primary-100 bg-primary-50 px-lg py-md">
              <p className="text-body leading-[1.6] text-text-primary">{report.verdict}</p>
            </div>
          )}
        </section>

        {/* Section 2: Behavioral Patterns */}
        {skipped ? (
          <section className="mb-2xl">
            <div className="rounded-lg border border-border bg-bg-elevated px-lg py-xl shadow-sm text-center">
              <p className="text-body text-text-tertiary">Report not available.</p>
            </div>
          </section>
        ) : report && (
          <>
            <section className="mb-2xl">
              <h2 className="font-heading text-h2 font-semibold leading-[1.35] text-text-primary mb-lg">
                Behavioral Patterns
              </h2>
              {report.patterns.length === 0 ? (
                <p className="text-body text-text-tertiary">No patterns identified.</p>
              ) : (
                <div className="space-y-md">
                  {report.patterns.map((pattern, i) => (
                    <PatternCard
                      key={i}
                      pattern={pattern}
                      onEvidenceClick={(evidence) =>
                        setProofModal({ evidence, sessionId })
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Suggestions */}
            <section className="mb-2xl">
              <h2 className="font-heading text-h2 font-semibold leading-[1.35] text-text-primary mb-lg">
                Suggestions
              </h2>
              {report.suggestions.length === 0 ? (
                <p className="text-body text-text-tertiary">No suggestions — keep it up!</p>
              ) : (
                <div className="space-y-md">
                  {report.suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm"
                    >
                      <p className="text-body leading-[1.6] text-text-primary mb-sm">
                        {suggestion.text}
                      </p>
                      <span className="inline-block rounded-sm bg-bg-secondary px-sm py-xs text-caption font-medium text-text-tertiary">
                        {suggestion.addresses_pattern}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <button
          onClick={onStartNew}
          className="w-full rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700"
        >
          Start New Session
        </button>
      </div>

      {proofModal && (
        <ProofModal
          evidence={proofModal.evidence}
          sessionId={proofModal.sessionId}
          onClose={() => setProofModal(null)}
        />
      )}
    </div>
  );
}

function PatternCard({
  pattern,
  onEvidenceClick,
}: {
  pattern: ReportPattern;
  onEvidenceClick: (evidence: ReportEvidence) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const confidenceStyles = {
    high: 'bg-positive-bg text-positive',
    medium: 'bg-caution-bg text-caution',
    low: 'bg-negative-bg text-negative',
  };

  const typeStyles = {
    positive: { label: 'Positive', className: 'bg-positive-bg text-positive' },
    negative: { label: 'Negative', className: 'bg-negative-bg text-negative' },
    neutral: { label: 'Neutral', className: 'bg-bg-secondary text-text-tertiary' },
  };

  const typeIcon = {
    positive: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    ),
    negative: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
      </svg>
    ),
    neutral: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-lg py-xl shadow-sm">
      <div className="flex items-start justify-between gap-md mb-sm">
        <h3 className="font-heading text-h3 font-semibold text-text-primary">
          {pattern.name}
        </h3>
        <div className="flex items-center gap-sm shrink-0">
          <span className={`inline-flex items-center gap-xs rounded-sm px-sm py-xs text-caption font-medium ${typeStyles[pattern.type].className}`}>
            {typeIcon[pattern.type]}
            {typeStyles[pattern.type].label}
          </span>
          <span
            className={`inline-block rounded-sm px-sm py-xs text-caption font-medium ${confidenceStyles[pattern.confidence]}`}
          >
            {pattern.confidence}
          </span>
        </div>
      </div>

      <p className="text-body leading-[1.6] text-text-secondary mb-md">
        {pattern.description}
      </p>

      {pattern.evidence.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-xs text-small font-medium text-primary-500 hover:text-primary-600 transition-colors duration-[150ms]"
          >
            <svg
              className={`h-3 w-3 transition-transform duration-[150ms] ${expanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            {pattern.evidence.length} evidence {pattern.evidence.length === 1 ? 'item' : 'items'}
          </button>

          {expanded && (
            <div className="mt-sm space-y-xs">
              {pattern.evidence.map((ev, i) => (
                <button
                  key={i}
                  onClick={() => onEvidenceClick(ev)}
                  className="group flex w-full items-center text-left rounded-md border border-border px-md py-sm text-small text-text-secondary hover:bg-bg-secondary hover:border-primary-200 transition-colors duration-[150ms]"
                >
                  <span className={`inline-block shrink-0 rounded-sm px-xs py-[1px] text-caption font-medium mr-sm ${
                    ev.type === 'capture'
                      ? 'bg-info-bg text-info'
                      : 'bg-caution-bg text-caution'
                  }`}>
                    {ev.type}
                  </span>
                  <span className="flex-1 truncate">{ev.description}</span>
                  <svg className="ml-sm h-3.5 w-3.5 shrink-0 text-text-tertiary group-hover:text-primary-500 transition-colors duration-[150ms]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProofModal({
  evidence,
  sessionId,
  onClose,
}: {
  evidence: ReportEvidence;
  sessionId: string;
  onClose: () => void;
}) {
  const [captures, setCaptures] = useState<
    { capture_id: string; window_title: string; app_name: string; captured_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (evidence.type === 'feeling') {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const result = await window.api.captureGetInRange({
          session_id: sessionId,
          start_time: evidence.start_time,
          end_time: evidence.end_time || evidence.start_time,
        });
        setCaptures(result.captures);
      } catch {
        setCaptures([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evidence, sessionId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[560px] max-h-[80vh] rounded-xl bg-bg-elevated shadow-xl mx-md flex flex-col">
        <div className="flex items-center justify-between px-lg py-md border-b border-border">
          <h3 className="font-heading text-h3 font-semibold text-text-primary truncate pr-md">
            {evidence.description}
          </h3>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-xs text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors duration-[150ms]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-lg py-md">
          {loading ? (
            <div className="flex items-center justify-center py-xl">
              <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
            </div>
          ) : evidence.type === 'feeling' ? (
            <div className="rounded-lg border border-border bg-bg-secondary px-md py-md">
              <p className="text-caption font-mono text-text-tertiary mb-xs">
                {new Date(evidence.start_time).toLocaleTimeString()}
              </p>
              <p className="text-body leading-[1.6] text-text-primary">{evidence.description}</p>
            </div>
          ) : captures.length === 0 ? (
            <p className="text-body text-text-tertiary text-center py-lg">
              No matching data found for this time range.
            </p>
          ) : (
            <div className="space-y-[2px]">
              {captures.map((capture) => (
                <div
                  key={capture.capture_id}
                  className="flex items-baseline gap-md px-sm py-xs rounded-md hover:bg-bg-secondary transition-colors duration-[150ms]"
                >
                  <span className="font-mono text-caption text-text-tertiary shrink-0">
                    {new Date(capture.captured_at).toLocaleTimeString()}
                  </span>
                  <span className="text-small font-medium text-text-secondary shrink-0">
                    {capture.app_name}
                  </span>
                  <span className="text-small text-text-primary truncate">
                    {capture.window_title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
