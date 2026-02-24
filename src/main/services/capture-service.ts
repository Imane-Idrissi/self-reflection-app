import { CaptureRepository } from '../database/capture-repository';

export interface ActiveWindowResult {
  title: string;
  owner: { name: string };
}

export type GetActiveWindowFn = () => Promise<ActiveWindowResult | undefined>;
export type CheckPermissionFn = () => boolean;

export interface CaptureWarningCallbacks {
  onWarning: () => void;
  onWarningCleared: () => void;
}

const POLL_INTERVAL_MS = 3000;
const FAILURE_THRESHOLD = 10;

export class CaptureService {
  private repo: CaptureRepository;
  private getActiveWindow: GetActiveWindowFn;
  private checkPermissionFn: CheckPermissionFn;
  private interval: ReturnType<typeof setInterval> | null = null;
  private currentSessionId: string | null = null;
  private consecutiveFailures = 0;
  private warningActive = false;
  private callbacks: CaptureWarningCallbacks | null = null;

  constructor(
    repo: CaptureRepository,
    getActiveWindow: GetActiveWindowFn,
    checkPermission: CheckPermissionFn,
  ) {
    this.repo = repo;
    this.getActiveWindow = getActiveWindow;
    this.checkPermissionFn = checkPermission;
  }

  setWarningCallbacks(callbacks: CaptureWarningCallbacks): void {
    this.callbacks = callbacks;
  }

  checkPermission(): boolean {
    return this.checkPermissionFn();
  }

  start(sessionId: string): void {
    if (this.interval) return;
    this.currentSessionId = sessionId;
    this.consecutiveFailures = 0;
    this.warningActive = false;

    this.interval = setInterval(() => {
      this.poll();
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.currentSessionId = null;
    this.consecutiveFailures = 0;
    if (this.warningActive) {
      this.warningActive = false;
      this.callbacks?.onWarningCleared();
    }
  }

  isRunning(): boolean {
    return this.interval !== null;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  private async poll(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const result = await this.getActiveWindow();

      if (!result || !result.title || !result.owner?.name) {
        return;
      }

      this.repo.create(this.currentSessionId, result.title, result.owner.name);

      if (this.consecutiveFailures > 0) {
        this.consecutiveFailures = 0;
        if (this.warningActive) {
          this.warningActive = false;
          this.callbacks?.onWarningCleared();
        }
      }
    } catch {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= FAILURE_THRESHOLD && !this.warningActive) {
        this.warningActive = true;
        this.callbacks?.onWarning();
      }
    }
  }
}
