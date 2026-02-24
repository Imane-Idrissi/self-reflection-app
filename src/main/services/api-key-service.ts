import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { AiService } from './ai-service';

export interface KeyValidationResult {
  valid: boolean;
  error?: string;
}

export class ApiKeyService {
  private aiService: AiService | null = null;
  private encryptedFilePath: string;

  constructor() {
    this.encryptedFilePath = path.join(app.getPath('userData'), 'api-key.enc');
    this.loadStoredKey();
  }

  hasKey(): boolean {
    return this.aiService !== null;
  }

  getAiService(): AiService | null {
    return this.aiService;
  }

  async validateKey(key: string): Promise<KeyValidationResult> {
    try {
      const client = new Anthropic({ apiKey: key });
      await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return { valid: true };
    } catch (error: unknown) {
      if (error instanceof Anthropic.AuthenticationError) {
        return { valid: false, error: 'Invalid API key. Please check your key and try again.' };
      }
      if (error instanceof Anthropic.PermissionDeniedError) {
        return { valid: false, error: 'This API key does not have permission. Check your Anthropic dashboard.' };
      }
      // Network errors or other transient issues — accept optimistically
      return { valid: true };
    }
  }

  saveKey(key: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }
    const encrypted = safeStorage.encryptString(key);
    fs.writeFileSync(this.encryptedFilePath, encrypted);
    this.aiService = new AiService(key);
  }

  deleteKey(): void {
    if (fs.existsSync(this.encryptedFilePath)) {
      fs.unlinkSync(this.encryptedFilePath);
    }
    this.aiService = null;
  }

  private loadStoredKey(): void {
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
      this.aiService = new AiService(envKey);
      return;
    }

    try {
      if (!fs.existsSync(this.encryptedFilePath)) return;
      if (!safeStorage.isEncryptionAvailable()) return;

      const encrypted = fs.readFileSync(this.encryptedFilePath);
      const key = safeStorage.decryptString(encrypted);
      if (key) {
        this.aiService = new AiService(key);
      }
    } catch {
      // Corrupted file — treat as no key
    }
  }
}
