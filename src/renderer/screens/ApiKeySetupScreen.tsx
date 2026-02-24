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

  const canSubmit = key.trim().length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError('');

    try {
      const result = await window.api.apikeySave({ key: key.trim() });
      if (result.success) {
        onComplete();
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
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-xl">
          <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <KeyIcon />
          </div>
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
            {isChange ? 'Update API Key' : 'Connect to Claude'}
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

          <p className="mt-sm text-small leading-[1.5] text-text-tertiary">
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
          className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
        >
          {saving ? <Spinner /> : (isChange ? 'Update Key' : 'Connect')}
        </button>

        {isChange && onCancel && (
          <button
            onClick={onCancel}
            className="mt-md w-full flex items-center justify-center rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-secondary transition-colors duration-[150ms] ease-out hover:bg-bg-secondary"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
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
