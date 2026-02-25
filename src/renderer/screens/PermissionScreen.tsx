import { useState } from 'react';

interface PermissionScreenProps {
  sessionId: string;
  onPermissionGranted: () => void;
  onBack: () => void;
}

export default function PermissionScreen({
  sessionId,
  onPermissionGranted,
  onBack,
}: PermissionScreenProps) {
  const [loading, setLoading] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  const handleCheckAgain = async () => {
    setLoading(true);
    setRetryFailed(false);
    try {
      const response = await window.api.sessionStart({ session_id: sessionId });
      if (response.success) {
        onPermissionGranted();
      } else if (response.error === 'permission_denied') {
        setRetryFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-lg">
          <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-caution-bg">
            <svg
              className="h-8 w-8 text-caution"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
            Accessibility permission needed
          </h1>
          <p className="text-body leading-[1.6] text-text-secondary">
            To read your active window title and app name, this app needs Accessibility access on macOS.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-lg">
          <p className="text-small font-medium text-text-primary mb-md">How to enable it</p>
          <ol className="space-y-sm text-small leading-[1.5] text-text-secondary list-none">
            <li className="flex items-start gap-sm">
              <span className="flex-shrink-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary-50 text-caption font-medium text-primary-500">1</span>
              <span>Open <strong className="text-text-primary font-medium">System Settings</strong></span>
            </li>
            <li className="flex items-start gap-sm">
              <span className="flex-shrink-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary-50 text-caption font-medium text-primary-500">2</span>
              <span>Go to <strong className="text-text-primary font-medium">Privacy & Security</strong> → <strong className="text-text-primary font-medium">Accessibility</strong></span>
            </li>
            <li className="flex items-start gap-sm">
              <span className="flex-shrink-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary-50 text-caption font-medium text-primary-500">3</span>
              <span>Toggle on <strong className="text-text-primary font-medium">Self Reflection</strong> in the list</span>
            </li>
          </ol>
        </div>

        {retryFailed && (
          <div className="rounded-lg border border-caution/30 bg-caution-bg px-lg py-md mb-lg">
            <p className="text-small leading-[1.5] text-text-secondary">
              Permission still not detected. You may need to quit and reopen the app after enabling Accessibility access.
            </p>
          </div>
        )}

        <div className="flex gap-sm">
          <button
            onClick={onBack}
            className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-primary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary"
          >
            Back
          </button>
          <button
            onClick={handleCheckAgain}
            disabled={loading}
            className="flex-1 flex items-center justify-center rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg
                className="h-5 w-5 animate-spin text-text-inverse"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Check Again'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
