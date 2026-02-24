import { useState, useRef, useEffect } from 'react';

interface IntentScreenProps {
  onSubmit: (intent: string) => Promise<void>;
  loading: boolean;
  onSettings?: () => void;
}

export default function IntentScreen({ onSubmit, loading, onSettings }: IntentScreenProps) {
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
    <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-md">
      {onSettings && (
        <button
          onClick={onSettings}
          className="absolute top-lg right-lg p-sm rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors duration-[150ms]"
          title="Settings"
        >
          <GearIcon />
        </button>
      )}
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

function GearIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
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
