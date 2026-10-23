/**
 * Server-only AI service for Taskora.
 * Uses the Google Gen AI SDK with the configured Google AI model.
 *
 * IMPORTANT: This file must only be imported by server-side code (API routes, server actions).
 * Never import this in client components.
 *
 * NOTE: Local JSON persistence is suitable for a local hackathon demo only.
 * It is NOT safe for concurrent serverless production deployments.
 */

import { GoogleGenAI } from '@google/genai';
import { ExtractedDraftSchema } from '@/lib/validation/schemas';
import type { ExtractedDraft, Language } from '@/types';

// ---------------------------------------------------------------------------
// Configuration – read only from environment, never from client
// ---------------------------------------------------------------------------
function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMMA_MODEL || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. ' +
      'Please add it to your .env.local file.'
    );
  }
  return { apiKey, model };
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Do not retry auth, permission, or client errors
    if (
      msg.includes('api_key') ||
      msg.includes('authentication') ||
      msg.includes('permission') ||
      msg.includes('unauthorized') ||
      msg.includes('invalid_argument') ||
      msg.includes('quota') ||
      msg.includes('billing')
    ) {
      return false;
    }
    // Retry on transient network or server errors
    if (
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('500') ||
      msg.includes('econnreset') ||
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('fetch failed') ||
      msg.includes('overloaded')
    ) {
      return true;
    }
  }
  return false;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const modelId = process.env.GEMMA_MODEL || 'unknown';
      console.error(
        `[Taskora AI] ${label} failed on attempt ${attempt + 1}/${MAX_RETRIES + 1}. ` +
        `Model: ${modelId}. Error category: ${categorizeError(err)}.`
      );

      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.log(`[Taskora AI] Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  throw lastError;
}

function categorizeError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('api_key') || msg.includes('authentication') || msg.includes('unauthorized')) return 'AUTH_ERROR';
    if (msg.includes('quota') || msg.includes('billing')) return 'QUOTA_ERROR';
    if (msg.includes('permission')) return 'PERMISSION_ERROR';
    if (msg.includes('model') || msg.includes('not found')) return 'MODEL_ERROR';
    if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch')) return 'NETWORK_ERROR';
    if (msg.includes('500') || msg.includes('503') || msg.includes('502')) return 'SERVER_ERROR';
    if (msg.includes('invalid')) return 'INVALID_REQUEST';
  }
  return 'UNKNOWN_ERROR';
}

// ---------------------------------------------------------------------------
// JSON parsing helpers
// ---------------------------------------------------------------------------
function extractJson(text: string): string {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find a JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------
function buildExtractionPrompt(message: string, language: Language): string {
  const langHint =
    language === 'auto'
      ? 'The message may be in English, Urdu, or Roman Urdu (Urdu written in Latin script).'
      : language === 'urdu'
      ? 'The message is in Urdu (Arabic script).'
      : language === 'roman-urdu'
      ? 'The message is in Roman Urdu (Urdu written in Latin script).'
      : 'The message is in English.';

  return `You are a business information extractor for a Pakistani business organizer app called Taskora.

${langHint}

Extract structured business information from the following message. Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Message:
"""
${message}
"""

Return this exact JSON structure:
{
  "customer": <string or null — the customer/contact name if clearly mentioned>,
  "task": <string or null — the work/service to be done>,
  "amount": <number or null — numeric amount only, no currency symbol>,
  "currency": <string or null — currency code like "PKR" or "USD", only if clearly stated or strongly implied by context like "rupees"/"rupay">,
  "dueDate": <string or null — ISO 8601 date if you can determine it, otherwise null>,
  "dueDateRaw": <string or null — original due date text from the message>,
  "notes": <string or null — any other relevant business info>,
  "language": <detected language: "English", "Urdu", or "Roman Urdu">,
  "confidence": <"high" | "medium" | "low" — overall extraction confidence>,
  "uncertain": <array of field names you are uncertain about, e.g. ["dueDate", "amount"]>
}

Rules:
- Do NOT invent data. If a field is not supported by the message, set it to null.
- "amount" must be a plain number, not a string.
- For "dueDate": if a relative day like "Friday" or "Monday" is given, set "dueDate" to null and put the raw text in "dueDateRaw".
- Only set "currency" to "PKR" if the message says "rupees", "rupay", "روپے", or similar.
- Include "dueDate" and "amount" in "uncertain" if you are guessing.
- Return ONLY the JSON object.`;
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------
export async function extractBusinessInfo(
  message: string,
  language: Language
): Promise<ExtractedDraft> {
  const { apiKey, model } = getConfig();

  const client = new GoogleGenAI({ apiKey });
  const prompt = buildExtractionPrompt(message, language);

  const rawText = await withRetry(async (attempt) => {
    console.log(`[Taskora AI] Extraction attempt ${attempt + 1}, model: ${model}`);

    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 1024 },
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from AI model');
    return text;
  }, 'extractBusinessInfo');

  // Parse the JSON
  const jsonStr = extractJson(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid JSON. Raw response: ${rawText.slice(0, 200)}`);
  }

  // Add required fields before validation
  const withMeta = {
    ...(parsed as object),
    originalMessage: message,
    extractedAt: new Date().toISOString(),
    uncertain: (parsed as Record<string, unknown>).uncertain ?? [],
  };

  // Validate with Zod
  const validated = ExtractedDraftSchema.parse(withMeta);
  return validated as ExtractedDraft;
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------
export async function testConnection(): Promise<{ ok: boolean; model: string; message: string }> {
  const { apiKey, model } = getConfig();

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Reply with only the word: OK' }] }],
      config: { maxOutputTokens: 10, temperature: 0 },
    });
    const text = response.text?.trim() ?? '';
    return {
      ok: true,
      model,
      message: `Connected successfully. Model responded: "${text.slice(0, 50)}"`,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      model,
      message: `Connection failed: ${errMsg.slice(0, 200)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Chat function (for the Taskora AI Assistant chatbot)
// ---------------------------------------------------------------------------
export async function chatWithAssistant(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const { apiKey, model } = getConfig();
  const client = new GoogleGenAI({ apiKey });

  const systemContext = `You are Taskora AI, a smart business assistant for a Pakistani business organizer app.
You help users manage their business records, extract information from messages, and answer business-related questions.
You support English, Urdu, and Roman Urdu. Be concise, professional, and helpful.
If the user shares an image, analyze it and extract any business-relevant information (amounts, names, tasks, dates).
Always respond in the same language the user writes in.`;

  const contents = [
    {
      role: 'user' as const,
      parts: [{ text: systemContext + '\n\nConversation starts now.' }],
    },
    {
      role: 'model' as const,
      parts: [{ text: 'Hello! I am Taskora AI, your business assistant. How can I help you today?' }],
    },
    ...history.map((item) => ({
      role: item.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: item.content }],
    })),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentParts: any[] = [];
  if (imageBase64 && imageMimeType) {
    currentParts.push({
      inlineData: { mimeType: imageMimeType, data: imageBase64 },
    });
  }
  currentParts.push({ text: message || '(image sent)' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (contents as any[]).push({ role: 'user' as const, parts: currentParts });

  const responseText = await withRetry(async (attempt) => {
    console.log(`[Taskora AI] Chat attempt ${attempt + 1}, model: ${model}`);
    const response = await client.models.generateContent({
      model,
      contents,
      config: { temperature: 0.7, maxOutputTokens: 2048 },
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from AI model');
    return text;
  }, 'chatWithAssistant');

  return responseText;
}
