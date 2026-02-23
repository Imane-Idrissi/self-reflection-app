import { useState, useRef, useEffect } from 'react';

interface IntentScreenProps {
  onSubmit: (intent: string) => Promise<void>;
  loading: boolean;
}

export default function IntentScreen({ onSubmit, loading }: IntentScreenProps) {
  const [intent, setIntent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = intent.trim().length > 0 && !loading;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(intent.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
      handleSubmit();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-xl">
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
            What's your focus for this session?
          </h1>
          <p className="text-body leading-[1.6] text-text-secondary">
            Be as specific as possible — the more detail you give, the better
            the AI can evaluate how your session went.
          </p>
        </div>

        <div className="mb-lg">
          <textarea
            ref={textareaRef}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Finish the database schema migration for the users table"
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-bg-elevated px-md py-[12px] text-body leading-[1.6] text-text-primary placeholder:text-text-tertiary transition-colors duration-[150ms] ease-out focus:border-primary-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
        >
          {loading ? (
            <Spinner />
          ) : (
            'Set Intent'
          )}
        </button>

        <p className="mt-md text-center text-small leading-[1.5] text-text-tertiary">
          Press <kbd className="font-mono text-caption">⌘ Enter</kbd> to submit
        </p>
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
