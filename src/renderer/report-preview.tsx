import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import ReportScreen from './screens/ReportScreen';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).api = {
  reportGet: () =>
    Promise.resolve({
      status: 'ready',
      report: {
        verdict:
          'You had a solid focused session with a clear intent. You spent most of your time on research and writing, which aligns well with your goal. There were a few context-switching moments where you drifted to social media, but you corrected course quickly each time. Overall, a productive session with good self-awareness.',
        patterns: [
          {
            name: 'Deep Focus Blocks',
            confidence: 'high',
            type: 'positive',
            description:
              'You maintained 25+ minute uninterrupted focus periods on your research documents. This happened 3 times during the session, suggesting strong sustained attention when engaged.',
            evidence: [
              { type: 'capture', description: '25-min block on Google Docs - Research Paper Draft', start_time: '2026-02-25T10:05:00Z', end_time: '2026-02-25T10:30:00Z' },
              { type: 'capture', description: '30-min block on VS Code - data analysis script', start_time: '2026-02-25T10:45:00Z', end_time: '2026-02-25T11:15:00Z' },
              { type: 'feeling', description: 'Feeling really in the zone right now', start_time: '2026-02-25T10:20:00Z', end_time: null },
            ],
          },
          {
            name: 'Social Media Drift',
            confidence: 'medium',
            type: 'negative',
            description:
              'You switched to Twitter/X twice during transitions between tasks. Each visit lasted 3-5 minutes before returning to work. This pattern often occurs during task-switching moments.',
            evidence: [
              { type: 'capture', description: 'Twitter/X browsing after completing document review', start_time: '2026-02-25T10:32:00Z', end_time: '2026-02-25T10:36:00Z' },
              { type: 'feeling', description: 'Got distracted, need to refocus', start_time: '2026-02-25T10:35:00Z', end_time: null },
            ],
          },
          {
            name: 'Quick Self-Correction',
            confidence: 'high',
            type: 'positive',
            description:
              'After each distraction, you returned to focused work within 5 minutes. Your feeling logs show awareness of the drift, suggesting strong metacognition about your attention.',
            evidence: [
              { type: 'feeling', description: 'Back on track now, closing distracting tabs', start_time: '2026-02-25T10:37:00Z', end_time: null },
            ],
          },
          {
            name: 'End-of-Session Fatigue',
            confidence: 'low',
            type: 'neutral',
            description:
              'In the last 15 minutes, your window switches increased and focus periods shortened. This could indicate natural cognitive fatigue after sustained concentration.',
            evidence: [
              { type: 'capture', description: 'Rapid switching between 4 apps in final 15 minutes', start_time: '2026-02-25T11:30:00Z', end_time: '2026-02-25T11:45:00Z' },
            ],
          },
        ],
        suggestions: [
          { text: 'Consider using a \u201ctransition ritual\u201d between tasks \u2014 a 2-minute break with a stretch or water \u2014 to avoid reflexively opening social media during task switches.', addresses_pattern: 'Social Media Drift' },
          { text: 'Your natural focus blocks are around 25-30 minutes. Try structuring your work in deliberate 30-min sprints with planned breaks to harness this strength.', addresses_pattern: 'Deep Focus Blocks' },
          { text: 'When you notice fatigue setting in, it may be more effective to take a proper 10-minute break rather than pushing through with fragmented attention.', addresses_pattern: 'End-of-Session Fatigue' },
        ],
      },
      session: {
        name: 'Thesis Research Session',
        intent: 'Research and write the introduction section of my thesis on machine learning interpretability',
        total_minutes: 105,
        active_minutes: 92,
        paused_minutes: 13,
      },
    }),
  reportDownload: () => {
    alert('PDF download only works in the Electron app (uses native printToPDF)');
    return Promise.resolve({ success: false, error: 'Not available in preview' });
  },
  captureGetInRange: () =>
    Promise.resolve({
      captures: [
        { capture_id: '1', window_title: 'Research Paper Draft - Google Docs', app_name: 'Google Chrome', captured_at: '2026-02-25T10:05:30Z' },
        { capture_id: '2', window_title: 'Research Paper Draft - Google Docs', app_name: 'Google Chrome', captured_at: '2026-02-25T10:10:00Z' },
        { capture_id: '3', window_title: 'ML Interpretability - Google Scholar', app_name: 'Google Chrome', captured_at: '2026-02-25T10:15:00Z' },
        { capture_id: '4', window_title: 'Research Paper Draft - Google Docs', app_name: 'Google Chrome', captured_at: '2026-02-25T10:20:00Z' },
        { capture_id: '5', window_title: 'Research Paper Draft - Google Docs', app_name: 'Google Chrome', captured_at: '2026-02-25T10:25:00Z' },
      ],
    }),
};

createRoot(document.getElementById('root')!).render(
  createElement(ReportScreen, {
    sessionId: 'preview-session',
    onStartNew: () => alert('Start New Session clicked'),
  })
);
