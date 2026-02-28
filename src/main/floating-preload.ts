import { contextBridge, ipcRenderer } from 'electron';
import type {
  FeelingCreateRequest,
  FeelingCreateResponse,
  FloatingWindowState,
} from '../shared/types';

contextBridge.exposeInMainWorld('floatingApi', {
  feelingCreate: (req: FeelingCreateRequest): Promise<FeelingCreateResponse> =>
    ipcRenderer.invoke('feeling:create', req),

  getSessionState: (): Promise<FloatingWindowState> =>
    ipcRenderer.invoke('floating:get-state'),

  onSessionStateChange: (callback: (state: { status: 'active' | 'paused' | 'ended' }) => void) => {
    ipcRenderer.on('floating:session-state-changed', (_event, state) => callback(state));
  },

  resize: (width: number, height: number, growDirection: 'up' | 'down' = 'up') => {
    ipcRenderer.send('floating:resize', { width, height, growDirection });
  },

  move: (deltaX: number, deltaY: number) => {
    ipcRenderer.send('floating:move', { deltaX, deltaY });
  },

  dismissed: () => {
    ipcRenderer.send('floating:dismissed');
  },

  setIgnoreMouse: (ignore: boolean) => {
    ipcRenderer.send('floating:set-ignore-mouse', ignore);
  },
});
