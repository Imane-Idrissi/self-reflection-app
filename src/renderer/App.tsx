import { useState, useEffect } from 'react';
import IntentScreen from './screens/IntentScreen';
import ClarificationScreen from './screens/ClarificationScreen';
import RefinedIntentScreen from './screens/RefinedIntentScreen';
import StartRecordingScreen from './screens/StartRecordingScreen';
import PermissionScreen from './screens/PermissionScreen';
import ActiveSessionScreen from './screens/ActiveSessionScreen';
import ReportGeneratingScreen from './screens/ReportGeneratingScreen';
// SessionEndScreen removed — replaced by report flow
import type { SessionSummary } from '../shared/types';

type FlowStep =
  | { type: 'loading' }
  | { type: 'intent' }
  | { type: 'clarification'; sessionId: string; questions: string[] }
  | { type: 'refined'; sessionId: string; refinedIntent: string }
  | { type: 'start-recording'; sessionId: string; finalIntent: string; apiError?: string }
  | { type: 'permission-denied'; sessionId: string; finalIntent: string }
  | { type: 'active-session'; sessionId: string; finalIntent: string }
  | { type: 'report-generating'; sessionId: string; summary: SessionSummary }
  | { type: 'report-ready'; sessionId: string }
  | { type: 'report-failed'; sessionId: string; summary: SessionSummary }
  | { type: 'report-skipped'; sessionId: string; summary: SessionSummary };

export default function App() {
  const [step, setStep] = useState<FlowStep>({ type: 'loading' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkStale = async () => {
      try {
        const result = await window.api.sessionCheckStale();
        if (result.ended_session) {
          setStep({
            type: 'report-generating',
            sessionId: result.ended_session.session_id,
            summary: result.ended_session.summary,
          });
          return;
        }
      } catch {
        // If check fails, just proceed to intent
      }
      setStep({ type: 'intent' });
    };
    checkStale();
  }, []);

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
    if (!step.sessionId) return;

    const response = await window.api.sessionStart({ session_id: step.sessionId });

    if (response.error === 'permission_denied') {
      setStep({
        type: 'permission-denied',
        sessionId: step.sessionId,
        finalIntent: step.finalIntent,
      });
      return;
    }

    if (response.success) {
      setStep({
        type: 'active-session',
        sessionId: step.sessionId,
        finalIntent: step.finalIntent,
      });
    }
  };

  const handlePermissionGranted = () => {
    if (step.type !== 'permission-denied') return;
    setStep({
      type: 'active-session',
      sessionId: step.sessionId,
      finalIntent: step.finalIntent,
    });
  };

  const handlePermissionBack = () => {
    if (step.type !== 'permission-denied') return;
    setStep({
      type: 'start-recording',
      sessionId: step.sessionId,
      finalIntent: step.finalIntent,
    });
  };

  const handleSessionEnd = (summary: SessionSummary, sessionId: string) => {
    setStep({ type: 'report-generating', sessionId, summary });
  };

  const handleAutoEnd = (summary: SessionSummary, sessionId: string) => {
    setStep({ type: 'report-generating', sessionId, summary });
  };

  const handleStartNewSession = () => {
    setStep({ type: 'intent' });
  };

  switch (step.type) {
    case 'loading':
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-primary">
          <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
        </div>
      );

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

    case 'permission-denied':
      return (
        <PermissionScreen
          sessionId={step.sessionId}
          onPermissionGranted={handlePermissionGranted}
          onBack={handlePermissionBack}
        />
      );

    case 'active-session':
      return (
        <ActiveSessionScreen
          sessionId={step.sessionId}
          finalIntent={step.finalIntent}
          onEnd={handleSessionEnd}
          onAutoEndTriggered={handleAutoEnd}
        />
      );

    case 'report-generating':
      return (
        <ReportGeneratingScreen
          sessionId={step.sessionId}
          summary={step.summary}
          onReady={() => setStep({ type: 'report-ready', sessionId: step.sessionId })}
          onFailed={() => setStep({ type: 'report-failed', sessionId: step.sessionId, summary: step.summary })}
        />
      );

    case 'report-ready':
      return null; // Placeholder — implemented in Task 6

    case 'report-failed':
      return null; // Placeholder — implemented in Task 7

    case 'report-skipped':
      return null; // Placeholder — implemented in Task 7
  }
}
