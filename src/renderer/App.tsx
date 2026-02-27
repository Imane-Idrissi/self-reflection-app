import { useState, useEffect } from 'react';
import { useTheme } from './useTheme';
import ThemeToggle from './components/ThemeToggle';
import DashboardScreen from './screens/DashboardScreen';
import ApiKeySetupScreen from './screens/ApiKeySetupScreen';
import SetupWizard from './screens/SetupWizard';
import ClarificationScreen from './screens/ClarificationScreen';
import RefinedIntentScreen from './screens/RefinedIntentScreen';
import PermissionScreen from './screens/PermissionScreen';
import ActiveSessionScreen from './screens/ActiveSessionScreen';
import ReportGeneratingScreen from './screens/ReportGeneratingScreen';
import ReportScreen from './screens/ReportScreen';
import ReportFailedScreen from './screens/ReportFailedScreen';
import type { SessionSummary } from '../shared/types';

type FlowStep =
  | { type: 'loading' }
  | { type: 'dashboard' }
  | { type: 'setup'; needsApiKey: boolean; startRecording?: { sessionId: string; finalIntent: string; apiError?: string } }
  | { type: 'api-key-change'; returnTo: 'dashboard' | 'setup' }
  | { type: 'clarification'; sessionId: string; questions: string[] }
  | { type: 'refined'; sessionId: string; refinedIntent: string }
  | { type: 'permission-denied'; sessionId: string; finalIntent: string }
  | { type: 'active-session'; sessionId: string; finalIntent: string }
  | { type: 'report-generating'; sessionId: string; summary: SessionSummary }
  | { type: 'report-ready'; sessionId: string }
  | { type: 'report-failed'; sessionId: string; summary: SessionSummary }
  | { type: 'report-skipped'; sessionId: string; summary: SessionSummary }
  | { type: 'view-report'; sessionId: string };

export default function App() {
  const [step, setStep] = useState<FlowStep>({ type: 'loading' });
  const [loading, setLoading] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const initialize = async () => {
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
        if (result.resumable_session) {
          setStep({
            type: 'setup',
            needsApiKey: false,
            startRecording: {
              sessionId: result.resumable_session.session_id,
              finalIntent: result.resumable_session.final_intent,
            },
          });
          return;
        }
      } catch {
        // If check fails, continue
      }

      setStep({ type: 'dashboard' });
    };
    initialize();
  }, []);

  const handleStartSession = async () => {
    let needsApiKey = true;
    try {
      const { hasKey } = await window.api.apikeyCheck();
      needsApiKey = !hasKey;
    } catch {
      // If check fails, assume key is needed
    }
    setStep({ type: 'setup', needsApiKey });
  };

  const handleIntentSubmit = async (name: string, intent: string) => {
    setLoading(true);
    try {
      const response = await window.api.sessionCreate({ name, intent });

      if (response.error) {
        setStep({
          type: 'setup',
          needsApiKey: false,
          startRecording: {
            sessionId: response.session_id,
            finalIntent: intent,
            apiError: "We couldn't check your intent right now",
          },
        });
        return;
      }

      if (response.status === 'specific') {
        setStep({
          type: 'setup',
          needsApiKey: false,
          startRecording: {
            sessionId: response.session_id,
            finalIntent: response.final_intent!,
          },
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
        type: 'setup',
        needsApiKey: false,
        startRecording: {
          sessionId: '',
          finalIntent: intent,
          apiError: "We couldn't check your intent right now",
        },
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
          type: 'setup',
          needsApiKey: false,
          startRecording: {
            sessionId: step.sessionId,
            finalIntent: '',
            apiError: "We couldn't refine your intent right now",
          },
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
        type: 'setup',
        needsApiKey: false,
        startRecording: {
          sessionId: step.sessionId,
          finalIntent: '',
          apiError: "We couldn't refine your intent right now",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationBack = () => {
    setStep({ type: 'setup', needsApiKey: false });
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
        type: 'setup',
        needsApiKey: false,
        startRecording: {
          sessionId: step.sessionId,
          finalIntent,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async (sessionId: string) => {
    if (!sessionId) return;

    const response = await window.api.sessionStart({ session_id: sessionId });

    if (response.error === 'permission_denied') {
      const sr = step.type === 'setup' ? step.startRecording : undefined;
      setStep({
        type: 'permission-denied',
        sessionId,
        finalIntent: sr?.finalIntent || '',
      });
      return;
    }

    if (response.success) {
      const sr = step.type === 'setup' ? step.startRecording : undefined;
      setStep({
        type: 'active-session',
        sessionId,
        finalIntent: sr?.finalIntent || '',
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
      type: 'setup',
      needsApiKey: false,
      startRecording: {
        sessionId: step.sessionId,
        finalIntent: step.finalIntent,
      },
    });
  };

  const handleSessionEnd = (summary: SessionSummary, sessionId: string) => {
    setStep({ type: 'report-generating', sessionId, summary });
  };

  const handleAutoEnd = (summary: SessionSummary, sessionId: string) => {
    setStep({ type: 'report-generating', sessionId, summary });
  };

  const goToDashboard = () => {
    setStep({ type: 'dashboard' });
  };

  const renderScreen = () => {
    switch (step.type) {
    case 'loading':
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-primary">
          <div className="h-4 w-4 rounded-full bg-primary-500 animate-pulse" />
        </div>
      );

    case 'dashboard':
      return (
        <DashboardScreen
          onStartSession={handleStartSession}
          onSettings={() => setStep({ type: 'api-key-change', returnTo: 'dashboard' })}
          onSessionClick={(sessionId) => setStep({ type: 'view-report', sessionId })}
        />
      );

    case 'setup':
      return (
        <SetupWizard
          needsApiKey={step.needsApiKey}
          startRecordingData={step.startRecording}
          onIntentSubmit={handleIntentSubmit}
          onStartRecording={handleStartRecording}
          intentLoading={loading}
          onBack={goToDashboard}
        />
      );

    case 'api-key-change':
      return (
        <ApiKeySetupScreen
          isChange
          onComplete={() => {
            if (step.returnTo === 'dashboard') setStep({ type: 'dashboard' });
            else setStep({ type: 'setup', needsApiKey: false });
          }}
          onCancel={() => {
            if (step.returnTo === 'dashboard') setStep({ type: 'dashboard' });
            else setStep({ type: 'setup', needsApiKey: false });
          }}
        />
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
      return (
        <ReportScreen
          sessionId={step.sessionId}
          onStartNew={goToDashboard}
        />
      );

    case 'report-failed':
      return (
        <ReportFailedScreen
          sessionId={step.sessionId}
          onRetry={async () => {
            await window.api.reportRetry({ session_id: step.sessionId });
            setStep({ type: 'report-generating', sessionId: step.sessionId, summary: step.summary });
          }}
          onSkip={() => {
            setStep({ type: 'report-skipped', sessionId: step.sessionId, summary: step.summary });
          }}
        />
      );

    case 'report-skipped':
      return (
        <ReportScreen
          sessionId={step.sessionId}
          skipped
          summary={step.summary}
          onStartNew={goToDashboard}
        />
      );

    case 'view-report':
      return (
        <ReportScreen
          sessionId={step.sessionId}
          onStartNew={goToDashboard}
        />
      );
  }
  };

  return (
    <>
      {step.type !== 'loading' && (
        <div className="fixed top-md right-md z-50 no-drag">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      )}
      {renderScreen()}
    </>
  );
}
