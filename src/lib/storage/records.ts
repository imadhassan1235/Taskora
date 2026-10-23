/**
 * Local JSON storage service for Taskora business records.
 *
 * IMPORTANT: This is a local file-based storage solution suitable ONLY for
 * hackathon/demo purposes on a single machine. It is NOT safe for:
 * - Concurrent serverless deployments (e.g. Vercel, AWS Lambda)
 * - Multi-user production environments
 * - Shared hosting
 *
 * For production, replace with a proper database (PostgreSQL, MongoDB, etc.)
 *
 * This file must only be imported server-side. Never import in client components.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { BusinessRecord } from '@/types';
import { BusinessRecordSchema } from '@/lib/validation/schemas';

// ---------------------------------------------------------------------------
// Storage path configuration
// ---------------------------------------------------------------------------

// Store data in a local directory outside the src tree, excluded from Git
const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAllRecords(): BusinessRecord[] {
  ensureDataDir();
  if (!fs.existsSync(RECORDS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as BusinessRecord[];
  } catch {
    console.error('[Taskora Storage] Failed to read records file, returning empty array.');
    return [];
  }
}

/**
 * Atomic write: write to a temp file first, then rename.
 * This prevents data corruption if the process crashes mid-write.
 */
function writeAllRecords(records: BusinessRecord[]): void {
  ensureDataDir();
  const tmpFile = RECORDS_FILE + '.tmp.' + Date.now();
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tmpFile, RECORDS_FILE);
  } catch (err) {
    // Clean up temp file if rename failed
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Security: prevent path traversal
// ---------------------------------------------------------------------------

function validateId(id: string): void {
  if (!/^[a-zA-Z0-9\-_]{1,128}$/.test(id)) {
    throw new Error(`Invalid record ID: ${id}`);
  }
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function getAllRecords(): BusinessRecord[] {
  return readAllRecords().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getRecordById(id: string): BusinessRecord | null {
  validateId(id);
  const records = readAllRecords();
  return records.find((r) => r.id === id) ?? null;
}

export function createRecord(
  draft: Omit<BusinessRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): BusinessRecord {
  const now = new Date().toISOString();
  const newRecord: BusinessRecord = {
    ...draft,
    id: uuidv4(),
    status: 'saved',
    createdAt: now,
    updatedAt: now,
  };

  // Validate before saving
  BusinessRecordSchema.parse(newRecord);

  const records = readAllRecords();
  records.push(newRecord);
  writeAllRecords(records);
  return newRecord;
}

export function updateRecord(
  id: string,
  updates: Partial<Omit<BusinessRecord, 'id' | 'createdAt'>>
): BusinessRecord | null {
  validateId(id);
  const records = readAllRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const updated: BusinessRecord = {
    ...records[idx],
    ...updates,
    id: records[idx].id,
    createdAt: records[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };

  // Validate before saving
  BusinessRecordSchema.parse(updated);

  records[idx] = updated;
  writeAllRecords(records);
  return updated;
}

export function deleteRecord(id: string): boolean {
  validateId(id);
  const records = readAllRecords();
  const newRecords = records.filter((r) => r.id !== id);
  if (newRecords.length === records.length) return false;
  writeAllRecords(newRecords);
  return true;
}

export function getStorageStats(): { totalRecords: number; filePath: string } {
  const records = readAllRecords();
  return {
    totalRecords: records.length,
    filePath: RECORDS_FILE,
  };
}
