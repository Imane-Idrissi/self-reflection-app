import { SessionRepository } from '../database/session-repository';
import { SessionEventsRepository } from '../database/session-events-repository';
import { CaptureRepository } from '../database/capture-repository';
import { FeelingRepository } from '../database/feeling-repository';
import { CaptureService } from './capture-service';
import { Session, SessionEvent, Feeling } from '../../shared/types';

export interface SessionSummary {
  total_minutes: number;
  active_minutes: number;
  paused_minutes: number;
  capture_count: number;
  feeling_count: number;
}

export class SessionService {
  private repo: SessionRepository;
  private eventsRepo: SessionEventsRepository;
  private captureRepo: CaptureRepository;
  private feelingRepo: FeelingRepository;
  private captureService: CaptureService;

  constructor(
    repo: SessionRepository,
    eventsRepo: SessionEventsRepository,
    captureRepo: CaptureRepository,
    feelingRepo: FeelingRepository,
    captureService: CaptureService,
  ) {
    this.repo = repo;
    this.eventsRepo = eventsRepo;
    this.captureRepo = captureRepo;
    this.feelingRepo = feelingRepo;
    this.captureService = captureService;
  }

  createSession(name: string, intent: string): Session {
    return this.repo.create(name, intent);
  }

  confirmIntent(sessionId: string, finalIntent: string): void {
    const session = this.getSessionOrThrow(sessionId);
    this.repo.updateFinalIntent(sessionId, finalIntent);
  }

  startSession(sessionId: string): { started: boolean; permissionDenied: boolean } {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== 'created') {
      throw new Error(`Cannot start session in status: ${session.status}`);
    }

    if (!this.captureService.checkPermission()) {
      return { started: false, permissionDenied: true };
    }

    this.repo.updateStatus(sessionId, 'active', new Date().toISOString());
    this.captureService.start(sessionId);
    return { started: true, permissionDenied: false };
  }

  pauseSession(sessionId: string): void {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== 'active') {
      throw new Error(`Cannot pause session in status: ${session.status}`);
    }
    this.captureService.stop();
    this.repo.updateStatus(sessionId, 'paused');
    this.eventsRepo.create(sessionId, 'paused');
  }

  resumeSession(sessionId: string): void {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== 'paused') {
      throw new Error(`Cannot resume session in status: ${session.status}`);
    }
    this.repo.updateStatus(sessionId, 'active');
    this.eventsRepo.create(sessionId, 'resumed');
    this.captureService.start(sessionId);
  }

  endSession(sessionId: string, endedBy: 'user' | 'auto' = 'user'): SessionSummary {
    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== 'active' && session.status !== 'paused') {
      throw new Error(`Cannot end session in status: ${session.status}`);
    }
    this.captureService.stop();
    this.repo.endSession(sessionId, endedBy);
    return this.computeSummary(sessionId);
  }

  getActiveTimeMinutes(sessionId: string): number {
    const session = this.getSessionOrThrow(sessionId);
    if (!session.started_at) return 0;
    const events = this.eventsRepo.getBySessionId(sessionId);
    return this.calculateActiveMinutes(session, events);
  }

  hasActiveSession(): boolean {
    const sessions = this.repo.findByStatuses(['active', 'paused']);
    return sessions.length > 0;
  }

  checkStaleOnLaunch(): { session_id: string; summary: SessionSummary } | null {
    this.captureService.stop();
    const staleSessions = this.repo.findByStatuses(['active', 'paused']);
    if (staleSessions.length === 0) return null;

    let mostRecent: { session_id: string; summary: SessionSummary } | null = null;
    for (const session of staleSessions) {
      this.repo.endSession(session.session_id, 'auto');
      const summary = this.computeSummary(session.session_id);
      if (!mostRecent) {
        mostRecent = { session_id: session.session_id, summary };
      }
    }
    return mostRecent;
  }

  cleanupAbandoned(): number {
    return this.repo.deleteByStatus('created');
  }

  createFeeling(sessionId: string, text: string): Feeling {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Feeling text cannot be empty');
    }

    const session = this.getSessionOrThrow(sessionId);
    if (session.status !== 'active' && session.status !== 'paused') {
      throw new Error(`Cannot log feeling for session in status: ${session.status}`);
    }

    return this.feelingRepo.create(sessionId, trimmed);
  }

  getSession(sessionId: string): Session | undefined {
    return this.repo.getById(sessionId);
  }

  getCompletedSessions(limit: number): Session[] {
    return this.repo.findCompleted(limit);
  }

  private getSessionOrThrow(sessionId: string): Session {
    const session = this.repo.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  private computeSummary(sessionId: string): SessionSummary {
    const session = this.getSessionOrThrow(sessionId);
    const events = this.eventsRepo.getBySessionId(sessionId);

    const totalMinutes = session.started_at
      ? (new Date(session.ended_at || new Date().toISOString()).getTime() - new Date(session.started_at).getTime()) / 60000
      : 0;

    const activeMinutes = this.calculateActiveMinutes(session, events, session.ended_at || undefined);
    const pausedMinutes = Math.max(0, totalMinutes - activeMinutes);

    return {
      total_minutes: Math.round(totalMinutes * 10) / 10,
      active_minutes: Math.round(activeMinutes * 10) / 10,
      paused_minutes: Math.round(pausedMinutes * 10) / 10,
      capture_count: this.captureRepo.countBySessionId(sessionId),
      feeling_count: this.feelingRepo.countBySessionId(sessionId),
    };
  }

  private calculateActiveMinutes(session: Session, events: SessionEvent[], endTime?: string): number {
    if (!session.started_at) return 0;

    let activeMs = 0;
    let activeSpanStart = new Date(session.started_at).getTime();
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
