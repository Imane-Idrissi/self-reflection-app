import { useState } from 'react';
import IntentScreen from './screens/IntentScreen';
import ClarificationScreen from './screens/ClarificationScreen';
import RefinedIntentScreen from './screens/RefinedIntentScreen';
import StartRecordingScreen from './screens/StartRecordingScreen';

type FlowStep =
  | { type: 'intent' }
  | { type: 'clarification'; sessionId: string; questions: string[] }
  | { type: 'refined'; sessionId: string; refinedIntent: string }
  | { type: 'start-recording'; sessionId: string; finalIntent: string; apiError?: string };

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
    }
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
  }
}
