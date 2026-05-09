import { describe, expect, it } from 'vitest';
import {
  createApplicationSchema,
  createUserSchema,
  finalDecisionSchema,
  loginSchema,
  reviewerFollowUpSchema,
} from '@/lib/schemas';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  validateDocument,
} from '@/lib/file-validation';


describe('loginSchema', () => {
  it('rejects empty email and password', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
  });
  it('rejects malformed email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });
  it('accepts well-formed credentials', () => {
    const result = loginSchema.safeParse({ email: 'a@b.rw', password: 'x' });
    expect(result.success).toBe(true);
  });
});

describe('createApplicationSchema', () => {
  it('rejects empty institution name', () => {
    const result = createApplicationSchema.safeParse({
      institutionName: '',
      licenseType: 'COMMERCIAL_BANK',
      description: '',
    });
    expect(result.success).toBe(false);
  });
  it('rejects an over-long institution name', () => {
    const result = createApplicationSchema.safeParse({
      institutionName: 'x'.repeat(256),
      licenseType: 'MICROFINANCE',
      description: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('reviewerFollowUpSchema', () => {
  it('rejects very short reviewer notes', () => {
    expect(reviewerFollowUpSchema.safeParse({ reviewerNotes: 'no' }).success).toBe(false);
  });
});

describe('finalDecisionSchema', () => {
  it('requires a written reason', () => {
    expect(
      finalDecisionSchema.safeParse({ decision: 'APPROVED', decisionNotes: '' }).success,
    ).toBe(false);
  });
  it('rejects whitespace-only reasons after trim', () => {
    expect(
      finalDecisionSchema.safeParse({ decision: 'APPROVED', decisionNotes: '    ' }).success,
    ).toBe(false);
  });
  it('rejects an unknown decision', () => {
    const result = finalDecisionSchema.safeParse({
      decision: 'PENDING',
      decisionNotes: 'irrelevant reason here',
    });
    expect(result.success).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'a@b.rw',
      fullName: 'A B',
      password: 'short',
      role: 'APPLICANT',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateDocument', () => {
  it('rejects when no file is supplied', () => {
    expect(validateDocument(null).ok).toBe(false);
  });

  it('rejects an empty file', () => {
    const empty = new File([], 'nothing.pdf', { type: 'application/pdf' });
    expect(validateDocument(empty).ok).toBe(false);
  });

  it(`rejects files larger than ${MAX_DOCUMENT_BYTES} bytes`, () => {
    const big = new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], 'huge.pdf', {
      type: 'application/pdf',
    });
    const r = validateDocument(big);
    expect(r.ok).toBe(false);
  });

  it('rejects unsupported MIME types', () => {
    const exe = new File([new Uint8Array([0x4d, 0x5a])], 'evil.exe', {
      type: 'application/x-msdownload',
    });
    expect(validateDocument(exe).ok).toBe(false);
  });

  it('accepts every allowed MIME type at a small size', () => {
    for (const mime of ALLOWED_DOCUMENT_MIME_TYPES) {
      const f = new File([new Uint8Array(64)], 'ok', { type: mime });
      expect(validateDocument(f).ok, `mime=${mime}`).toBe(true);
    }
  });
});
