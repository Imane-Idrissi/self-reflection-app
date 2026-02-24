import { useState } from 'react';
import IntentScreen from './screens/IntentScreen';
import ClarificationScreen from './screens/ClarificationScreen';
import RefinedIntentScreen from './screens/RefinedIntentScreen';
import StartRecordingScreen from './screens/StartRecordingScreen';
import ActiveSessionScreen from './screens/ActiveSessionScreen';
import type { SessionSummary } from '../shared/types';

type FlowStep =
  | { type: 'intent' }
  | { type: 'clarification'; sessionId: string; questions: string[] }
  | { type: 'refined'; sessionId: string; refinedIntent: string }
  | { type: 'start-recording'; sessionId: string; finalIntent: string; apiError?: string }
  | { type: 'active-session'; sessionId: string; finalIntent: string }
  | { type: 'session-ended'; summary: SessionSummary };

export default function App() {
  const [step, setStep] = useState<FlowStep>({ type: 'intent' });
  const [loading, setLoading] = useState(false);

  const handleIntentSubmit = async (intent: string) => {
    setLoading(true);
    try {
      const response = await window.api.sessionCreate({ intent });

      if (response.error) {
        setStep({
          type: 'start-recording',
          sessionId: response.session_id,
          finalIntent: intent,
          apiError: "We couldn't check your intent right now",
        });
        return;
      }

      if (response.status === 'specific') {
        setStep({
          type: 'start-recording',
          sessionId: response.session_id,
          finalIntent: response.final_intent!,
        });
      } else {
        setStep({
          type: 'clarification',
          sessionId: response.session_id,
          questions: response.clarifying_questions!,
        });
      }
    } catch {
      setStep({
        type: 'start-recording',
        sessionId: '',
        finalIntent: intent,
        apiError: "We couldn't check your intent right now",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationSubmit = async (answers: string[]) => {
    if (step.type !== 'clarification') return;
    setLoading(true);
    try {
      const response = await window.api.sessionClarify({
        session_id: step.sessionId,
        answers,
      });

      if (response.error) {
        setStep({
          type: 'start-recording',
          sessionId: step.sessionId,
          finalIntent: '',
          apiError: "We couldn't refine your intent right now",
        });
        return;
      }

      setStep({
        type: 'refined',
        sessionId: step.sessionId,
        refinedIntent: response.refined_intent,
      });
    } catch {
      setStep({
        type: 'start-recording',
        sessionId: step.sessionId,
        finalIntent: '',
        apiError: "We couldn't refine your intent right now",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationBack = () => {
    setStep({ type: 'intent' });
  };

  const handleConfirmIntent = async (finalIntent: string) => {
    if (step.type !== 'refined') return;
    setLoading(true);
    try {
      await window.api.sessionConfirmIntent({
        session_id: step.sessionId,
        final_intent: finalIntent,
      });
      setStep({
        type: 'start-recording',
        sessionId: step.sessionId,
        finalIntent,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    if (step.type !== 'start-recording') return;
    if (step.sessionId) {
      await window.api.sessionStart({ session_id: step.sessionId });
      setStep({
        type: 'active-session',
        sessionId: step.sessionId,
        finalIntent: step.finalIntent,
      });
    }
  };

  const handleSessionEnd = (summary: SessionSummary) => {
    setStep({ type: 'session-ended', summary });
  };

  const handleStartNewSession = () => {
    setStep({ type: 'intent' });
  };

  switch (step.type) {
    case 'intent':
      return (
        <IntentScreen onSubmit={handleIntentSubmit} loading={loading} />
      );

    case 'clarification':
      return (
        <ClarificationScreen
          questions={step.questions}
          onSubmit={handleClarificationSubmit}
          onBack={handleClarificationBack}
          loading={loading}
        />
      );

    case 'refined':
      return (
        <RefinedIntentScreen
          refinedIntent={step.refinedIntent}
          onConfirm={handleConfirmIntent}
          loading={loading}
        />
      );

    case 'start-recording':
      return (
        <StartRecordingScreen
          finalIntent={step.finalIntent}
          onStartRecording={handleStartRecording}
          apiError={step.apiError}
        />
      );

    case 'active-session':
      return (
        <ActiveSessionScreen
          sessionId={step.sessionId}
          finalIntent={step.finalIntent}
          onEnd={handleSessionEnd}
          onAutoEndTriggered={handleSessionEnd}
        />
      );

    case 'session-ended':
      return (
        <SessionEndedPlaceholder
          summary={step.summary}
          onStartNew={handleStartNewSession}
        />
      );
  }
}

function SessionEndedPlaceholder({
  summary,
  onStartNew,
}: {
  summary: SessionSummary;
  onStartNew: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px] text-center">
        <h1 className="font-heading text-h1 font-bold text-text-primary mb-md">
          Session Complete
        </h1>
        <p className="text-body text-text-secondary mb-xl">
          {Math.round(summary.total_minutes)} min total
        </p>
        <button
          onClick={onStartNew}
          className="rounded-md bg-primary-500 px-lg py-[12px] text-body font-medium text-text-inverse shadow-sm transition-colors duration-[150ms] ease-out hover:bg-primary-600"
        >
          Start New Session
        </button>
      </div>
    </div>
  );
}
