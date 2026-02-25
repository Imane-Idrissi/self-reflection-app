import { useState, useRef, useEffect } from 'react';

interface SetupWizardProps {
  needsApiKey: boolean;
  startRecordingData?: { sessionId: string; finalIntent: string; apiError?: string };
  onIntentSubmit: (name: string, intent: string) => Promise<void>;
  onStartRecording: (sessionId: string) => Promise<void>;
  intentLoading: boolean;
  onSettings?: () => void;
  onBack?: () => void;
}

export default function SetupWizard({
  needsApiKey,
  startRecordingData,
  onIntentSubmit,
  onStartRecording,
  intentLoading,
  onSettings,
  onBack,
}: SetupWizardProps) {
  const initialStep = startRecordingData ? 3 : needsApiKey ? 1 : 2;
  const [step, setStep] = useState<1 | 2 | 3>(initialStep as 1 | 2 | 3);

  useEffect(() => {
    if (startRecordingData) setStep(3);
  }, [startRecordingData]);

  return (
    <div className="relative flex min-h-screen flex-col bg-bg-primary overflow-hidden">
      <WaveTopLeft />
      <WaveBottomRight />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-lg left-lg z-10 flex items-center gap-sm rounded-md border border-border bg-bg-elevated px-md py-sm text-small font-medium text-text-secondary shadow-sm transition-colors duration-[150ms] hover:border-primary-400 hover:text-primary-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
      )}

      {onSettings && step === 2 && (
        <button
          onClick={onSettings}
          className="absolute top-lg right-lg z-10 p-sm rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors duration-[150ms]"
          title="Settings"
        >
          <GearIcon />
        </button>
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-md">
        <div className="w-full max-w-[520px]">
          <Stepper currentStep={step} />

          {step === 1 && (
            <ApiKeyStep onDone={() => setStep(2)} />
          )}
          {step === 2 && (
            <IntentStep onSubmit={onIntentSubmit} loading={intentLoading} />
          )}
          {step === 3 && startRecordingData && (
            <StartRecordingStep
              finalIntent={startRecordingData.finalIntent}
              apiError={startRecordingData.apiError}
              onStart={() => onStartRecording(startRecordingData.sessionId)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { number: 1, label: 'API Key' },
    { number: 2, label: 'Set Intent' },
    { number: 3, label: 'Record' },
  ];

  return (
    <div className="flex items-center justify-center mb-2xl">
      {steps.map((s, i) => {
        const isDone = currentStep > s.number;
        const isActive = currentStep === s.number;

        return (
          <div key={s.number} className="flex items-center">
            {i > 0 && (
              <div className={`w-12 h-[2px] mx-sm rounded-full transition-colors duration-200 ${isDone ? 'bg-positive' : isActive ? 'bg-primary-500' : 'bg-border'}`} />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-small font-semibold transition-colors duration-200 ${
                  isDone
                    ? 'bg-positive text-text-inverse'
                    : isActive
                      ? 'bg-primary-500 text-text-inverse'
                      : 'bg-border text-text-secondary'
                }`}
              >
                {isDone ? <CheckIcon /> : s.number}
              </div>
              <span
                className={`mt-sm text-small font-medium transition-colors duration-200 ${
                  isDone ? 'text-positive' : isActive ? 'text-primary-500' : 'text-text-secondary'
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApiKeyStep({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = key.trim().length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError('');

    try {
      const result = await window.api.apikeySave({ key: key.trim() });
      if (result.success) {
        onDone();
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="text-center mb-xl">
        <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <KeyIcon />
        </div>
        <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
          Connect to Claude
        </h1>
        <p className="text-body leading-[1.6] text-text-secondary">
          Your key is encrypted and stored locally. It never leaves your device.
        </p>
      </div>

      <div className="mb-lg">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="sk-ant-..."
            autoFocus
            className="w-full rounded-md border border-border bg-bg-elevated px-md py-[12px] pr-[48px] text-body font-mono leading-[1.6] text-text-primary placeholder:text-text-tertiary transition-colors duration-[150ms] ease-out focus:border-primary-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary transition-colors duration-[150ms]"
          >
            {showKey ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {error && (
          <p className="mt-sm text-small leading-[1.5] text-negative">{error}</p>
        )}

        <p className="mt-sm text-small leading-[1.5] text-text-secondary">
          Get your API key from{' '}
          <button
            onClick={() => window.open('https://console.anthropic.com/settings/keys')}
            className="text-primary-500 hover:text-primary-600 underline underline-offset-2 transition-colors duration-[150ms]"
          >
            console.anthropic.com
          </button>
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
      >
        {saving ? <Spinner /> : 'Continue'}
      </button>
    </>
  );
}

function IntentStep({ onSubmit, loading }: { onSubmit: (name: string, intent: string) => Promise<void>; loading: boolean }) {
  const [name, setName] = useState('');
  const [intent, setIntent] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const canSubmit = name.trim().length > 0 && intent.trim().length > 0 && !loading;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(name.trim(), intent.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="text-center mb-xl">
        <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
          What's your focus for this session?
        </h1>
        <p className="text-body leading-[1.6] text-text-primary">
          Be as specific as possible. The more detail you give, the better
          the AI can evaluate how your session went.
        </p>
      </div>

      <div className="mb-lg space-y-md">
        <div>
          <label className="block text-small font-medium text-text-secondary mb-xs">
            Session name
          </label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim().length > 0) {
                e.preventDefault();
              }
            }}
            placeholder="e.g., Essay Draft"
            className="w-full rounded-md border border-border bg-bg-elevated px-md py-[12px] text-body leading-[1.6] text-text-primary placeholder:text-text-secondary transition-colors duration-[150ms] ease-out focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-small font-medium text-text-secondary mb-xs">
            Intent
          </label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Finish my essay on climate change, outline the 3 main arguments, write the intro, and have a full draft ready to review"
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-bg-elevated px-md py-[12px] text-body leading-[1.6] text-text-primary placeholder:text-text-secondary transition-colors duration-[150ms] ease-out focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
      >
        {loading ? <Spinner /> : 'Continue'}
      </button>

      <p className="mt-md text-center text-small leading-[1.5] text-text-secondary">
        Press <kbd className="font-mono text-caption text-text-primary">⌘ Enter</kbd> to submit
      </p>
    </>
  );
}

function StartRecordingStep({
  finalIntent,
  apiError,
  onStart,
}: {
  finalIntent: string;
  apiError?: string;
  onStart: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-lg">
        <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-positive-bg">
          <svg className="h-8 w-8 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
          Ready to go
        </h1>
      </div>

      {finalIntent && (
        <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-lg">
          <p className="text-small font-medium text-text-tertiary mb-xs">Your intent</p>
          <p className="text-body leading-[1.6] text-text-primary">{finalIntent}</p>
        </div>
      )}

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
        className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Spinner /> : 'Start Recording'}
      </button>
    </>
  );
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

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-7 w-7 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
