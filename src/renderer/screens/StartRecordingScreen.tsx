import { useState } from 'react';

interface StartRecordingScreenProps {
  finalIntent: string;
  onStartRecording: () => Promise<void>;
  apiError?: string;
}

export default function StartRecordingScreen({
  finalIntent,
  onStartRecording,
  apiError,
}: StartRecordingScreenProps) {
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStartRecording();
      setStarted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        {!started ? (
          <>
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
              <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
                Intent set
              </h1>
            </div>

            <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-xl">
              <p className="text-small font-medium text-text-tertiary mb-xs">Your intent</p>
              <p className="text-body leading-[1.6] text-text-primary">{finalIntent}</p>
            </div>

            {apiError && (
              <div className="rounded-lg border border-caution/30 bg-caution-bg px-lg py-md mb-lg">
                <p className="text-small leading-[1.5] text-text-secondary">
                  {apiError} — your intent was accepted as written.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-bg-secondary px-lg py-lg mb-xl">
              <p className="text-small font-medium text-text-primary mb-sm">What gets captured</p>
              <ul className="space-y-xs text-small leading-[1.5] text-text-secondary">
                <li className="flex items-start gap-sm">
                  <span className="mt-[2px] text-positive">●</span>
                  Active window title and app name
                </li>
                <li className="flex items-start gap-sm">
                  <span className="mt-[2px] text-positive">●</span>
                  Timestamp of each window switch
                </li>
              </ul>
              <p className="text-small font-medium text-text-primary mt-md mb-sm">What's never captured</p>
              <ul className="space-y-xs text-small leading-[1.5] text-text-secondary">
                <li className="flex items-start gap-sm">
                  <span className="mt-[2px] text-text-tertiary">○</span>
                  Screenshots, keyboard input, or mouse movement
                </li>
                <li className="flex items-start gap-sm">
                  <span className="mt-[2px] text-text-tertiary">○</span>
                  File contents or notifications
                </li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Spinner />
              ) : (
                'Start Recording'
              )}
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-lg flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
              <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
            </div>
            <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
              Recording
            </h1>
            <p className="text-body leading-[1.6] text-text-secondary">
              Session is active. Go do your work — capture is running in the background.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-text-inverse"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
