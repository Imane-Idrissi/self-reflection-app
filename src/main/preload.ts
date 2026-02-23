import { contextBridge, ipcRenderer } from 'electron';
import type {
  SessionCreateRequest,
  SessionCreateResponse,
  SessionClarifyRequest,
  SessionClarifyResponse,
  SessionConfirmIntentRequest,
  SessionConfirmIntentResponse,
  SessionStartRequest,
  SessionStartResponse,
} from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  sessionCreate: (req: SessionCreateRequest): Promise<SessionCreateResponse> =>
    ipcRenderer.invoke('session:create', req),

  sessionClarify: (req: SessionClarifyRequest): Promise<SessionClarifyResponse> =>
    ipcRenderer.invoke('session:clarify', req),

  sessionConfirmIntent: (req: SessionConfirmIntentRequest): Promise<SessionConfirmIntentResponse> =>
    ipcRenderer.invoke('session:confirm-intent', req),

  sessionStart: (req: SessionStartRequest): Promise<SessionStartResponse> =>
    ipcRenderer.invoke('session:start', req),
});
