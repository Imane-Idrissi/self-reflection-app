import { ipcMain } from 'electron';
import { ApiKeyService } from '../services/api-key-service';
import type { ApiKeyCheckResponse, ApiKeySaveRequest, ApiKeySaveResponse } from '../../shared/types';

export function registerApiKeyHandlers(apiKeyService: ApiKeyService): void {
  ipcMain.handle('apikey:check', async (): Promise<ApiKeyCheckResponse> => {
    return { hasKey: apiKeyService.hasKey() };
  });

  ipcMain.handle('apikey:save', async (_event, req: ApiKeySaveRequest): Promise<ApiKeySaveResponse> => {
    try {
      const result = await apiKeyService.validateKey(req.key);
      if (!result.valid) {
        return { success: false, error: result.error };
      }

      apiKeyService.saveKey(req.key);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save API key',
      };
    }
  });
}
