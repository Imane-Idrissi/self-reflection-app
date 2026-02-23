import { SessionRepository } from '../database/session-repository';
import { Session } from '../../shared/types';

export class SessionService {
  private repo: SessionRepository;

  constructor(repo: SessionRepository) {
    this.repo = repo;
  }

  createSession(intent: string): Session {
    return this.repo.create(intent);
  }

  confirmIntent(sessionId: string, finalIntent: string): void {
    const session = this.repo.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    this.repo.updateFinalIntent(sessionId, finalIntent);
  }

  startSession(sessionId: string): void {
    const session = this.repo.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (session.status !== 'created') {
      throw new Error(`Cannot start session in status: ${session.status}`);
    }
    this.repo.updateStatus(sessionId, 'active', new Date().toISOString());
  }

  cleanupAbandoned(): number {
    return this.repo.deleteByStatus('created');
  }

  getSession(sessionId: string): Session | undefined {
    return this.repo.getById(sessionId);
  }
}
