import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const mockEncryptString = vi.fn((str: string) => Buffer.from(`encrypted:${str}`));
const mockDecryptString = vi.fn((buf: Buffer) => {
  const str = buf.toString();
  if (str.startsWith('encrypted:')) return str.slice('encrypted:'.length);
  throw new Error('Decryption failed');
});
const mockIsEncryptionAvailable = vi.fn(() => true);
const mockGetPath = vi.fn((_name: string) => '/tmp/test-userdata');

vi.mock('electron', () => ({
  app: { getPath: (name: string) => mockGetPath(name) },
  safeStorage: {
    encryptString: (str: string) => mockEncryptString(str),
    decryptString: (buf: Buffer) => mockDecryptString(buf),
    isEncryptionAvailable: () => mockIsEncryptionAvailable(),
  },
}));

import { ApiKeyService } from '../api-key-service';

const encPath = path.join('/tmp/test-userdata', 'api-key.enc');

describe('ApiKeyService', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
    mockIsEncryptionAvailable.mockReturnValue(true);
    fs.mkdirSync('/tmp/test-userdata', { recursive: true });
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
  });

  it('has no key initially when no env var and no file', () => {
    const service = new ApiKeyService();
    expect(service.hasKey()).toBe(false);
    expect(service.getAiService()).toBeNull();
  });

  it('saveKey stores encrypted file and creates AiService', () => {
    const service = new ApiKeyService();
    service.saveKey('sk-test-123');

    expect(service.hasKey()).toBe(true);
    expect(service.getAiService()).not.toBeNull();
    expect(fs.existsSync(encPath)).toBe(true);
    expect(mockEncryptString).toHaveBeenCalledWith('sk-test-123');
  });

  it('deleteKey removes file and clears AiService', () => {
    const service = new ApiKeyService();
    service.saveKey('sk-test-123');
    expect(service.hasKey()).toBe(true);

    service.deleteKey();
    expect(service.hasKey()).toBe(false);
    expect(service.getAiService()).toBeNull();
    expect(fs.existsSync(encPath)).toBe(false);
  });

  it('loads key from encrypted file on construction', () => {
    // Save a key first
    const encrypted = Buffer.from('encrypted:sk-persisted');
    fs.mkdirSync('/tmp/test-userdata', { recursive: true });
    fs.writeFileSync(encPath, encrypted);

    const service = new ApiKeyService();
    expect(service.hasKey()).toBe(true);
    expect(service.getAiService()).not.toBeNull();
  });

  it('env var takes priority over stored key', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-env-key';

    // Also have a file
    const encrypted = Buffer.from('encrypted:sk-file-key');
    fs.mkdirSync('/tmp/test-userdata', { recursive: true });
    fs.writeFileSync(encPath, encrypted);

    const service = new ApiKeyService();
    expect(service.hasKey()).toBe(true);
    // decryptString should NOT have been called since env var was used
    expect(mockDecryptString).not.toHaveBeenCalled();
  });

  it('treats corrupted file as no key', () => {
    fs.mkdirSync('/tmp/test-userdata', { recursive: true });
    fs.writeFileSync(encPath, Buffer.from('garbage-data'));
    mockDecryptString.mockImplementation(() => { throw new Error('Decryption failed'); });

    const service = new ApiKeyService();
    expect(service.hasKey()).toBe(false);
  });

  it('deleteKey is safe when no file exists', () => {
    const service = new ApiKeyService();
    expect(() => service.deleteKey()).not.toThrow();
  });
});
