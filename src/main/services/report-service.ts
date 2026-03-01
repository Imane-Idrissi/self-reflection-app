import { ReportRepository } from '../database/report-repository';
import { SessionRepository } from '../database/session-repository';
import { CaptureRepository } from '../database/capture-repository';
import { FeelingRepository } from '../database/feeling-repository';
import { SessionEventsRepository } from '../database/session-events-repository';
import { AiService, collapseCaptures, buildReportPrompt, parseReportResponse } from './ai-service';
import type { ReportGetResponse, SessionEvent } from '../../shared/types';

export class ReportService {
  constructor(
    private reportRepo: ReportRepository,
    private sessionRepo: SessionRepository,
    private captureRepo: CaptureRepository,
    private feelingRepo: FeelingRepository,
    private eventsRepo: SessionEventsRepository,
    private getAiService: () => AiService | null,
  ) {}

  startGeneration(sessionId: string): void {
    const existing = this.reportRepo.getBySessionId(sessionId);
    if (existing && existing.status === 'ready') return;

    let report = existing;
    if (!report || report.status === 'failed') {
      report = this.reportRepo.create(sessionId);
    }

    this.generateInBackground(sessionId, report.report_id);
  }

  getReport(sessionId: string): ReportGetResponse {
    const report = this.reportRepo.getBySessionId(sessionId);
    if (!report) {
      return { status: 'generating' };
    }

    if (report.status === 'generating' || report.status === 'failed') {
      return { status: report.status };
    }

    const session = this.sessionRepo.getById(sessionId);
    if (!session) {
      return { status: 'failed' };
    }

    const events = this.eventsRepo.getBySessionId(sessionId);
    const totalMinutes = session.started_at
      ? (new Date(session.ended_at || new Date().toISOString()).getTime() - new Date(session.started_at).getTime()) / 60000
      : 0;
    const activeMinutes = this.calculateActiveMinutes(session.started_at, events, session.ended_at || undefined);
    const pausedMinutes = Math.max(0, totalMinutes - activeMinutes);

    const parsed = parseReportResponse(
      JSON.stringify({
        verdict: report.summary,
        patterns: JSON.parse(report.patterns || '[]'),
        suggestions: JSON.parse(report.suggestions || '[]'),
      })
    );

    return {
      status: 'ready',
      report: parsed,
      session: {
        name: session.name,
        intent: session.final_intent || session.original_intent,
        total_minutes: Math.round(totalMinutes * 10) / 10,
        active_minutes: Math.round(activeMinutes * 10) / 10,
        paused_minutes: Math.round(pausedMinutes * 10) / 10,
      },
    };
  }

  retryGeneration(sessionId: string): void {
    const report = this.reportRepo.getBySessionId(sessionId);
    if (!report) {
      throw new Error('No report found for session');
    }
    if (report.status !== 'failed') {
      throw new Error(`Cannot retry report in status: ${report.status}`);
    }

    this.reportRepo.resetToGenerating(report.report_id);
    this.generateInBackground(sessionId, report.report_id);
  }

  hasReport(sessionId: string): boolean {
    return this.reportRepo.hasReportForSession(sessionId);
  }

  markStaleAsFailedOnLaunch(): number {
    return this.reportRepo.markStaleAsFailedOnLaunch();
  }

  deleteBySessionId(sessionId: string): void {
    this.reportRepo.deleteBySessionId(sessionId);
  }

  private generateInBackground(sessionId: string, reportId: string): void {
    (async () => {
      try {
        const aiService = this.getAiService();
        if (!aiService) {
          console.error('Report generation failed: no API key configured');
          this.reportRepo.updateToFailed(reportId);
          return;
        }

        const session = this.sessionRepo.getById(sessionId);
        if (!session) {
          this.reportRepo.updateToFailed(reportId);
          return;
        }

        const captures = this.captureRepo.getBySessionId(sessionId);
        const feelings = this.feelingRepo.getBySessionId(sessionId);
        const events = this.eventsRepo.getBySessionId(sessionId);

        const totalMinutes = session.started_at
          ? (new Date(session.ended_at || new Date().toISOString()).getTime() - new Date(session.started_at).getTime()) / 60000
          : 0;
        const activeMinutes = this.calculateActiveMinutes(session.started_at, events, session.ended_at || undefined);
        const pausedMinutes = Math.max(0, totalMinutes - activeMinutes);

        const collapsed = collapseCaptures(captures);

        const prompt = buildReportPrompt({
          intent: session.final_intent || session.original_intent,
          total_minutes: Math.round(totalMinutes * 10) / 10,
          active_minutes: Math.round(activeMinutes * 10) / 10,
          paused_minutes: Math.round(pausedMinutes * 10) / 10,
          feeling_count: feelings.length,
          collapsed_captures: collapsed,
          feelings,
          events,
        });

        const responseText = await aiService.generateReport(prompt);
        const parsed = parseReportResponse(responseText);

        this.reportRepo.updateToReady(
          reportId,
          parsed.verdict,
          JSON.stringify(parsed.patterns),
          JSON.stringify(parsed.suggestions),
        );
      } catch (error) {
        console.error('Report generation failed:', error);
        this.reportRepo.updateToFailed(reportId);
      }
    })();
  }

  private calculateActiveMinutes(startedAt: string | null, events: SessionEvent[], endTime?: string): number {
    if (!startedAt) return 0;

    let activeMs = 0;
    let activeSpanStart = new Date(startedAt).getTime();
    let isActive = true;

    for (const event of events) {
      const eventTime = new Date(event.created_at).getTime();
      if (event.event_type === 'paused' && isActive) {
        activeMs += eventTime - activeSpanStart;
        isActive = false;
      } else if (event.event_type === 'resumed' && !isActive) {
        activeSpanStart = eventTime;
        isActive = true;
      }
    }

    if (isActive) {
      const end = endTime ? new Date(endTime).getTime() : Date.now();
      activeMs += end - activeSpanStart;
    }

    return activeMs / 60000;
  }
}
