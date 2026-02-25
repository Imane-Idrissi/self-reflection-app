import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
      const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent('hi');
      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('API_KEY_INVALID') || message.includes('401')) {
        return { valid: false, error: 'Invalid API key. Please check your key and try again.' };
      }
      if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
        return { valid: false, error: 'This API key does not have permission. Check your Google AI Studio dashboard.' };
      }
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
    const envKey = process.env.GEMINI_API_KEY;
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
