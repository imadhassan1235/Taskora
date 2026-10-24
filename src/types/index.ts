// Core business record types for Taskora

export type Language = 'auto' | 'english' | 'urdu' | 'roman-urdu';

export type RecordStatus = 'draft' | 'saved' | 'archived';
export type BusinessTransactionType = 'sale' | 'purchase' | 'other';

export interface ExtractedDraft {
  customer: string | null;
  task: string | null;
  amount: number | null;
  currency: string | null;
  dueDate: string | null; // ISO string or human-readable from model
  dueDateRaw: string | null; // original text from message
  notes: string | null;
  originalMessage: string;
  language: string;
  confidence: 'high' | 'medium' | 'low';
  extractedAt: string; // ISO timestamp
  uncertain: string[]; // fields the model flagged as uncertain
}

export interface BusinessRecord {
  id: string;
  transactionType?: BusinessTransactionType;
  amountPaid?: number | null;
  quantity?: number | null;
  customer: string | null;
  task: string | null;
  amount: number | null;
  currency: string | null;
  dueDate: string | null;
  dueDateRaw: string | null;
  notes: string | null;
  originalMessage: string;
  language: string;
  confidence: 'high' | 'medium' | 'low';
  uncertain: string[];
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface ExtractRequest {
  message: string;
  language: Language;
}

export interface SaveRequest {
  draft: Omit<ExtractedDraft, 'extractedAt'> & { extractedAt?: string };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string; // base64 data URL for uploaded images
}

export interface SavedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  imageBase64?: string;
  imageMimeType?: string;
}
