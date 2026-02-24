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
    <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-md overflow-hidden">
      <WaveTopLeft />
      <WaveBottomRight />

      {onSettings && (
        <button
          onClick={onSettings}
          className="absolute top-lg right-lg z-10 p-sm rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors duration-[150ms]"
          title="Settings"
        >
          <GearIcon />
        </button>
      )}

      <div className="relative z-10 w-full max-w-[520px]">
        <StepIndicator step={2} />
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
            placeholder="e.g., Finish my essay on climate change, outline the 3 main arguments, write the intro, and have a full draft ready to review"
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

        <p className="mt-md text-center text-small leading-[1.5] text-text-secondary">
          Press <kbd className="font-mono text-caption text-text-primary">⌘ Enter</kbd> to submit
        </p>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-sm mb-xl">
      <div className="flex items-center gap-xs">
        <div className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-primary-500' : 'bg-primary-200'}`} />
        <span className={`text-small font-medium ${step === 1 ? 'text-primary-500' : 'text-text-tertiary'}`}>
          Connect API
        </span>
      </div>
      <div className="w-8 h-[1px] bg-border" />
      <div className="flex items-center gap-xs">
        <div className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-primary-500' : 'bg-border'}`} />
        <span className={`text-small font-medium ${step === 2 ? 'text-primary-500' : 'text-text-tertiary'}`}>
          Set Intent
        </span>
      </div>
    </div>
  );
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
