import { useState, useRef, useEffect } from 'react';

interface ClarificationScreenProps {
  questions: string[];
  onSubmit: (answers: string[]) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export default function ClarificationScreen({
  questions,
  onSubmit,
  onBack,
  loading,
}: ClarificationScreenProps) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const canSubmit = answers.every((a) => a.trim().length > 0) && !loading;

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(answers.map((a) => a.trim()));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px]">
        <button
          onClick={onBack}
          className="mb-lg flex items-center gap-xs text-small text-text-secondary transition-colors duration-[150ms] ease-out hover:text-text-primary"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Rewrite intent
        </button>

        <div className="text-center mb-xl">
          <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
            Let's make that more specific
          </h1>
          <p className="text-body leading-[1.6] text-text-secondary">
            Answer these questions to help sharpen your intent.
          </p>
        </div>

        <div className="space-y-lg mb-xl">
          {questions.map((question, index) => (
            <div key={index}>
              <label className="block text-body font-medium leading-[1.6] text-text-primary mb-sm">
                {question}
              </label>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                type="text"
                value={answers[index]}
                onChange={(e) => updateAnswer(index, e.target.value)}
                className="w-full rounded-md border border-border bg-bg-elevated px-md py-[12px] text-body leading-[1.6] text-text-primary placeholder:text-text-tertiary transition-colors duration-[150ms] ease-out focus:border-primary-500 focus:outline-none"
                placeholder="Your answer..."
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
        >
          {loading ? (
            <Spinner />
          ) : (
            'Submit Answers'
          )}
        </button>
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
