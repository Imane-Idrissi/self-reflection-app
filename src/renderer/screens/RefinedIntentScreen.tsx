import { useState, useRef, useEffect } from 'react';

interface RefinedIntentScreenProps {
  refinedIntent: string;
  onConfirm: (finalIntent: string) => Promise<void>;
  loading: boolean;
}

export default function RefinedIntentScreen({
  refinedIntent,
  onConfirm,
  loading,
}: RefinedIntentScreenProps) {
  const [editing, setEditing] = useState(false);
  const [editedIntent, setEditedIntent] = useState(refinedIntent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editing]);

  const handleConfirm = () => {
    if (!loading) {
      onConfirm(editing ? editedIntent.trim() : refinedIntent);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const canSubmit = (editing ? editedIntent.trim().length > 0 : true) && !loading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-xl">
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
            Here's your refined intent
          </h1>
          <p className="text-body leading-[1.6] text-text-secondary">
            {editing
              ? 'Make any changes you'd like, then submit.'
              : 'Does this capture what you want to focus on?'}
          </p>
        </div>

        <div className="mb-xl">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={editedIntent}
              onChange={(e) => setEditedIntent(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-border bg-bg-elevated px-md py-[12px] text-body leading-[1.6] text-text-primary transition-colors duration-[150ms] ease-out focus:border-primary-500 focus:outline-none"
            />
          ) : (
            <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm">
              <p className="text-body leading-[1.6] text-text-primary">{refinedIntent}</p>
            </div>
          )}
        </div>

        <div className="flex gap-md">
          {!editing && (
            <button
              onClick={handleEdit}
              disabled={loading}
              className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-primary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={`${editing ? 'w-full' : 'flex-1'} flex items-center justify-center rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500`}
          >
            {loading ? (
              <Spinner />
            ) : editing ? (
              'Save Intent'
            ) : (
              'Confirm'
            )}
          </button>
        </div>
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
