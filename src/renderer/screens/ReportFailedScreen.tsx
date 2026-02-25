interface ReportFailedScreenProps {
  sessionId: string;
  onRetry: () => void;
  onSkip: () => void;
}

export default function ReportFailedScreen({
  sessionId,
  onRetry,
  onSkip,
}: ReportFailedScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px] text-center">
        <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-negative-bg">
          <svg
            className="h-8 w-8 text-negative"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
          Report generation failed
        </h1>
        <p className="text-body leading-[1.6] text-text-secondary mb-xl">
          Something went wrong while generating your report. You can try again or skip and start a new session.
        </p>

        <div className="flex gap-sm">
          <button
            onClick={onSkip}
            className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-primary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary"
          >
            Skip Report
          </button>
          <button
            onClick={onRetry}
            className="flex-1 rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
