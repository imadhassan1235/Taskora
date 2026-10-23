import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ExtractedDraftSchema,
  ExtractRequestSchema,
  BusinessRecordSchema,
  SaveRequestSchema,
} from '@/lib/validation/schemas';

// ---------------------------------------------------------------------------
// Schema Validation Tests
// ---------------------------------------------------------------------------

describe('ExtractRequestSchema', () => {
  it('accepts a valid extraction request', () => {
    const result = ExtractRequestSchema.safeParse({
      message: 'Ali ne 3 designs ka order diya',
      language: 'roman-urdu',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = ExtractRequestSchema.safeParse({ message: '', language: 'auto' });
    expect(result.success).toBe(false);
  });

  it('rejects message that is too short', () => {
    const result = ExtractRequestSchema.safeParse({ message: 'Hi', language: 'auto' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 2000 characters', () => {
    const result = ExtractRequestSchema.safeParse({
      message: 'a'.repeat(2001),
      language: 'auto',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid language value', () => {
    const result = ExtractRequestSchema.safeParse({
      message: 'Valid message here',
      language: 'french',
    });
    expect(result.success).toBe(false);
  });
});

describe('ExtractedDraftSchema', () => {
  const validDraft = {
    customer: 'Ali',
    task: '3 website designs',
    amount: 15000,
    currency: 'PKR',
    dueDate: null,
    dueDateRaw: 'Friday',
    notes: null,
    originalMessage: 'Ali ne 3 website designs ka order diya, 15000 rupees, Friday tak.',
    language: 'Roman Urdu',
    confidence: 'high',
    extractedAt: new Date().toISOString(),
    uncertain: [],
  };

  it('accepts a fully valid draft', () => {
    const result = ExtractedDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it('accepts draft with all null optional fields', () => {
    const result = ExtractedDraftSchema.safeParse({
      ...validDraft,
      customer: null,
      task: null,
      amount: null,
      currency: null,
      dueDate: null,
      dueDateRaw: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts uncertain fields array', () => {
    const result = ExtractedDraftSchema.safeParse({
      ...validDraft,
      uncertain: ['dueDate', 'amount'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uncertain).toContain('dueDate');
    }
  });

  it('rejects invalid confidence value', () => {
    const result = ExtractedDraftSchema.safeParse({
      ...validDraft,
      confidence: 'very-high',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing originalMessage', () => {
    const { originalMessage, ...withoutMsg } = validDraft;
    const result = ExtractedDraftSchema.safeParse(withoutMsg);
    expect(result.success).toBe(false);
  });

  it('rejects amount as string instead of number', () => {
    const result = ExtractedDraftSchema.safeParse({
      ...validDraft,
      amount: '15000', // string, should be number
    });
    expect(result.success).toBe(false);
  });
});

describe('BusinessRecordSchema', () => {
  const validRecord = {
    id: 'abc-123',
    customer: 'Ahmed',
    task: '2 landing pages',
    amount: 20000,
    currency: 'PKR',
    dueDate: null,
    dueDateRaw: 'next Monday',
    notes: null,
    originalMessage: 'Ahmed ko 2 landing pages banani hain',
    language: 'Roman Urdu',
    confidence: 'medium' as const,
    uncertain: ['dueDate'],
    status: 'saved' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('validates a complete business record', () => {
    expect(BusinessRecordSchema.safeParse(validRecord).success).toBe(true);
  });

  it('rejects record with empty id', () => {
    expect(BusinessRecordSchema.safeParse({ ...validRecord, id: '' }).success).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(BusinessRecordSchema.safeParse({ ...validRecord, status: 'pending' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// JSON Parsing Tests (testing the extractJson helper logic)
// ---------------------------------------------------------------------------

describe('JSON extraction from AI response', () => {
  // Reimplement the extractJson logic for testing without importing server module
  function extractJson(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) return fenceMatch[1].trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return text.trim();
  }

  it('extracts JSON from markdown code fence', () => {
    const input = '```json\n{"customer": "Ali", "amount": 15000}\n```';
    const result = extractJson(input);
    expect(JSON.parse(result)).toMatchObject({ customer: 'Ali', amount: 15000 });
  });

  it('extracts JSON from plain code fence', () => {
    const input = '```\n{"customer": "Bob"}\n```';
    expect(JSON.parse(extractJson(input))).toMatchObject({ customer: 'Bob' });
  });

  it('extracts JSON from plain text with surrounding prose', () => {
    const input = 'Here is the result: {"customer": "Sara", "task": "design work"}. That is all.';
    expect(JSON.parse(extractJson(input))).toMatchObject({ customer: 'Sara' });
  });

  it('handles pure JSON with no wrapper', () => {
    const input = '{"customer": "Khalid", "amount": 5000}';
    expect(JSON.parse(extractJson(input))).toMatchObject({ customer: 'Khalid', amount: 5000 });
  });

  it('throws on completely invalid JSON after extraction', () => {
    const input = 'This is not JSON at all, no object here.';
    expect(() => JSON.parse(extractJson(input))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Retry logic tests (unit-testing the retry category logic)
// ---------------------------------------------------------------------------

describe('Error categorization for retry decisions', () => {
  function isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('api_key') || msg.includes('authentication') || msg.includes('permission') ||
          msg.includes('unauthorized') || msg.includes('invalid_argument') || msg.includes('quota') ||
          msg.includes('billing')) return false;
      if (msg.includes('503') || msg.includes('502') || msg.includes('500') ||
          msg.includes('econnreset') || msg.includes('timeout') || msg.includes('network') ||
          msg.includes('fetch failed') || msg.includes('overloaded')) return true;
    }
    return false;
  }

  it('marks 503 errors as retryable', () => {
    expect(isRetryable(new Error('503 service unavailable'))).toBe(true);
  });

  it('marks timeout errors as retryable', () => {
    expect(isRetryable(new Error('timeout exceeded'))).toBe(true);
  });

  it('marks network fetch errors as retryable', () => {
    expect(isRetryable(new Error('fetch failed: network error'))).toBe(true);
  });

  it('marks overloaded errors as retryable', () => {
    expect(isRetryable(new Error('model overloaded'))).toBe(true);
  });

  it('does NOT retry authentication errors', () => {
    expect(isRetryable(new Error('authentication failed'))).toBe(false);
  });

  it('does NOT retry API key errors', () => {
    expect(isRetryable(new Error('invalid api_key provided'))).toBe(false);
  });

  it('does NOT retry quota errors', () => {
    expect(isRetryable(new Error('quota exceeded for this model'))).toBe(false);
  });

  it('does NOT retry permission errors', () => {
    expect(isRetryable(new Error('permission denied'))).toBe(false);
  });

  it('does NOT retry billing errors', () => {
    expect(isRetryable(new Error('billing account not found'))).toBe(false);
  });

  it('does NOT retry unknown errors by default', () => {
    expect(isRetryable(new Error('something unexpected happened'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SaveRequestSchema tests
// ---------------------------------------------------------------------------

describe('SaveRequestSchema', () => {
  const validDraft = {
    customer: 'Ali',
    task: '3 website designs',
    amount: 15000,
    currency: 'PKR',
    dueDate: null,
    dueDateRaw: 'Friday',
    notes: null,
    originalMessage: 'Some message',
    language: 'Roman Urdu',
    confidence: 'high' as const,
    uncertain: [],
  };

  it('accepts valid save request', () => {
    expect(SaveRequestSchema.safeParse({ draft: validDraft }).success).toBe(true);
  });

  it('rejects save request with empty originalMessage', () => {
    const result = SaveRequestSchema.safeParse({
      draft: { ...validDraft, originalMessage: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects save request with invalid confidence', () => {
    const result = SaveRequestSchema.safeParse({
      draft: { ...validDraft, confidence: 'perfect' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts save request with all null fields (partial extraction)', () => {
    const result = SaveRequestSchema.safeParse({
      draft: {
        ...validDraft,
        customer: null,
        task: null,
        amount: null,
        currency: null,
        dueDate: null,
        dueDateRaw: null,
        notes: null,
      },
    });
    expect(result.success).toBe(true);
  });
});
