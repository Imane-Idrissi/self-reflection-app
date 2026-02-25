import { useState, useEffect, useRef } from 'react';

interface ActiveSessionScreenProps {
  sessionId: string;
  finalIntent: string;
  onEnd: (summary: {
    total_minutes: number;
    active_minutes: number;
    paused_minutes: number;
    capture_count: number;
    feeling_count: number;
  }, sessionId: string) => void;
  onAutoEndTriggered: (summary: {
    total_minutes: number;
    active_minutes: number;
    paused_minutes: number;
    capture_count: number;
    feeling_count: number;
  }, sessionId: string) => void;
}

export default function ActiveSessionScreen({
  sessionId,
  finalIntent,
  onEnd,
  onAutoEndTriggered,
}: ActiveSessionScreenProps) {
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAutoEndWarning, setShowAutoEndWarning] = useState(false);
  const [showCaptureWarning, setShowCaptureWarning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === 'paused') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    } else {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedSeconds(prev => prev + 1);
        }, 1000);
      }
    }
  }, [status]);

  useEffect(() => {
    window.api.onAutoEndWarning(() => {
      setShowAutoEndWarning(true);
    });

    window.api.onAutoEndTriggered((summary) => {
      onAutoEndTriggered(summary, sessionId);
    });

    window.api.onCaptureWarning(() => {
      setShowCaptureWarning(true);
    });

    window.api.onCaptureWarningCleared(() => {
      setShowCaptureWarning(false);
    });
  }, [onAutoEndTriggered]);

  const handlePause = async () => {
    setLoading(true);
    try {
      const response = await window.api.sessionPause({ session_id: sessionId });
      if (response.success) {
        setStatus('paused');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const response = await window.api.sessionResume({ session_id: sessionId });
      if (response.success) {
        setStatus('active');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndClick = () => {
    setShowConfirmDialog(true);
  };

  const handleEndConfirm = async () => {
    setLoading(true);
    try {
      const response = await window.api.sessionEnd({ session_id: sessionId });
      if (response.success && response.summary) {
        onEnd(response.summary, sessionId);
      }
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleEndCancel = () => {
    setShowConfirmDialog(false);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const isActive = status === 'active';

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        {showAutoEndWarning && (
          <div className="rounded-lg border border-caution/30 bg-caution-bg px-lg py-md mb-lg">
            <p className="text-small leading-[1.5] text-text-secondary text-center">
              This session will auto-end in 30 minutes.
            </p>
          </div>
        )}

        {showCaptureWarning && (
          <div className="rounded-lg border border-caution/30 bg-caution-bg px-lg py-md mb-lg">
            <p className="text-small leading-[1.5] text-text-secondary text-center">
              Having trouble reading your active window.
            </p>
          </div>
        )}

        <div className="text-center mb-xl">
          {isActive ? (
            <div className="mx-auto mb-lg flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
              <div className="h-4 w-4 rounded-full bg-primary-500 recording-pulse" />
            </div>
          ) : (
            <div className="mx-auto mb-lg flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary">
              <div className="h-4 w-4 rounded-full bg-text-tertiary" />
            </div>
          )}

          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-xs">
            {isActive ? 'Recording' : 'Paused'}
          </h1>

          <p className="font-mono text-h2 font-semibold text-text-primary tabular-nums">
            {formatTime(elapsedSeconds)}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-xl">
          <p className="text-small font-medium text-text-tertiary mb-xs">Your intent</p>
          <p className="text-body leading-[1.6] text-text-primary">{finalIntent}</p>
        </div>

        {isActive ? (
          <p className="text-small leading-[1.5] text-text-tertiary text-center mb-xl">
            Go do your work — capture is running in the background.
          </p>
        ) : (
          <p className="text-small leading-[1.5] text-text-tertiary text-center mb-xl">
            Session paused. Take your time — resume when you're ready.
          </p>
        )}

        <div className="flex gap-sm">
          {isActive ? (
            <button
              onClick={handlePause}
              disabled={loading}
              className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-primary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              disabled={loading}
              className="flex-1 rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resume
            </button>
          )}

          <button
            onClick={handleEndClick}
            disabled={loading}
            className="flex-1 rounded-md border border-negative/30 bg-bg-elevated px-lg py-[12px] text-body font-medium text-negative shadow-sm transition-colors duration-[150ms] ease-out hover:bg-negative-bg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            End Session
          </button>
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-[360px] rounded-xl bg-bg-elevated p-xl shadow-xl mx-md">
            <h2 className="font-heading text-h3 font-semibold text-text-primary mb-sm">
              End this session?
            </h2>
            <p className="text-body leading-[1.6] text-text-secondary mb-xl">
              Your session data will be saved and you'll see a summary of your activity.
            </p>
            <div className="flex gap-sm">
              <button
                onClick={handleEndCancel}
                className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-primary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEndConfirm}
                disabled={loading}
                className="flex-1 rounded-md bg-negative px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
