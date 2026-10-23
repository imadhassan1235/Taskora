import { z } from 'zod';

// Zod schema for extracted draft from AI
export const ExtractedDraftSchema = z.object({
  customer: z.string().nullable().describe('Customer or contact name'),
  task: z.string().nullable().describe('Work or task description'),
  amount: z.number().nullable().describe('Numeric amount'),
  currency: z.string().nullable().describe('Currency code e.g. PKR, USD'),
  dueDate: z.string().nullable().describe('Due date in ISO format if deterministic'),
  dueDateRaw: z.string().nullable().describe('Original due date text from message'),
  notes: z.string().nullable().describe('Additional relevant notes'),
  originalMessage: z.string().describe('Original input message'),
  language: z.string().describe('Detected language'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Overall extraction confidence'),
  extractedAt: z.string().describe('ISO timestamp of extraction'),
  uncertain: z.array(z.string()).describe('List of field names that are uncertain'),
});

export type ExtractedDraftZod = z.infer<typeof ExtractedDraftSchema>;

// Schema for saving a record
export const BusinessRecordSchema = z.object({
  id: z.string().min(1),
  customer: z.string().nullable(),
  task: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  dueDate: z.string().nullable(),
  dueDateRaw: z.string().nullable(),
  notes: z.string().nullable(),
  originalMessage: z.string().min(1),
  language: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  uncertain: z.array(z.string()),
  status: z.enum(['draft', 'saved', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Schema for extract request
export const ExtractRequestSchema = z.object({
  message: z
    .string()
    .min(3, 'Message must be at least 3 characters')
    .max(2000, 'Message must be under 2000 characters'),
  language: z.enum(['auto', 'english', 'urdu', 'roman-urdu']),
});

// Schema for save request from client
export const SaveRequestSchema = z.object({
  draft: z.object({
    customer: z.string().nullable(),
    task: z.string().nullable(),
    amount: z.number().nullable(),
    currency: z.string().nullable(),
    dueDate: z.string().nullable(),
    dueDateRaw: z.string().nullable(),
    notes: z.string().nullable(),
    originalMessage: z.string().min(1),
    language: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    uncertain: z.array(z.string()),
    extractedAt: z.string().optional(),
  }),
});

// Schema for patch request
export const PatchRecordSchema = z.object({
  customer: z.string().nullable().optional(),
  task: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  dueDateRaw: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['draft', 'saved', 'archived']).optional(),
});

// Schema for chat request
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(50),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
});
