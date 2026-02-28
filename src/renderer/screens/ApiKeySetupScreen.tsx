import { useState } from 'react';

interface ApiKeySetupScreenProps {
  isChange?: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

export default function ApiKeySetupScreen({ isChange, onComplete, onCancel }: ApiKeySetupScreenProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSubmit = key.trim().length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError('');

    const trimmed = key.trim();
    if (!trimmed.startsWith('AIza')) {
      setError('API keys start with "AIza". Please check your key and try again.');
      setSaving(false);
      return;
    }

    try {
      const result = await window.api.apikeySave({ key: trimmed });
      if (result.success) {
        setSaved(true);
        setTimeout(() => onComplete(), 1200);
        return;
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch (err) {
      console.error('API key save failed:', err);
      setError('Something went wrong. Please try again later.');
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
    <div className="relative flex min-h-screen items-center justify-center bg-bg-primary px-md overflow-hidden">
      <WaveTopLeft />
      <WaveBottomRight />

      {isChange && onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-[46px] left-lg z-50 no-drag flex items-center gap-sm rounded-md border border-border bg-bg-elevated px-md py-sm text-small font-medium text-text-secondary shadow-sm transition-colors duration-[150ms] hover:border-primary-400 hover:text-primary-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      <div className="relative z-10 w-full max-w-[520px]">
        {!isChange && <StepIndicator step={1} />}
        <div className="text-center mb-xl">
          <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <KeyIcon />
          </div>
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
            {isChange ? 'Update API Key' : 'Connect to Gemini'}
          </h1>
          <p className="text-body leading-[1.6] text-text-secondary">
            Your key is encrypted and stored locally — it never leaves your device.
          </p>
        </div>

        <div className="mb-lg">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="AIza..."
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

          <p className="mt-sm text-small leading-[1.5] text-text-tertiary">
            Get your API key from{' '}
            <button
              onClick={() => window.open('https://aistudio.google.com/apikey')}
              className="text-primary-500 hover:text-primary-600 underline underline-offset-2 transition-colors duration-[150ms]"
            >
              aistudio.google.com
            </button>
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saved}
          className={`w-full flex items-center justify-center rounded-md px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out ${saved ? 'bg-positive' : 'bg-primary-500 hover:bg-primary-600 hover:shadow-lg active:bg-primary-700'} disabled:shadow-none disabled:cursor-not-allowed ${!saved && 'disabled:bg-primary-200 disabled:text-primary-600'}`}
        >
          {saved ? <CheckIcon /> : saving ? <Spinner /> : (isChange ? 'Update Key' : 'Connect')}
        </button>

      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
