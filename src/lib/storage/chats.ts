/** Local JSON storage for saved assistant conversations (single-machine MVP). */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, SavedChat } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

function readChats(): SavedChat[] {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CHATS_FILE)) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed as SavedChat[] : [];
  } catch (error) {
    console.error('[Taskora Storage] Could not read chats.json', error);
    throw new Error('Saved chats could not be read.');
  }
}

function writeChats(chats: SavedChat[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${CHATS_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(chats, null, 2), 'utf8');
    fs.renameSync(tmp, CHATS_FILE);
  } catch (error) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    throw error;
  }
}

function validId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid chat ID.');
}

export function listChats(): SavedChat[] {
  return readChats().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(({ messages, ...chat }) => chat as SavedChat);
}

export function getChat(id: string): SavedChat | null {
  validId(id);
  return readChats().find(chat => chat.id === id) ?? null;
}

export function saveChat(id: string | undefined, messages: ChatMessage[]): SavedChat {
  if (id) validId(id);
  const chats = readChats();
  const index = id ? chats.findIndex(chat => chat.id === id) : -1;
  const now = new Date().toISOString();
  const firstUser = messages.find(message => message.role === 'user')?.content.trim();
  const title = firstUser ? firstUser.slice(0, 64) : 'New chat';
  const chat: SavedChat = {
    id: index >= 0 ? chats[index].id : uuidv4(),
    title,
    messages,
    createdAt: index >= 0 ? chats[index].createdAt : now,
    updatedAt: now,
  };
  if (index >= 0) chats[index] = chat;
  else chats.push(chat);
  writeChats(chats);
  return chat;
}

export function deleteChat(id: string): boolean {
  validId(id);
  const chats = readChats();
  const remaining = chats.filter(chat => chat.id !== id);
  if (remaining.length === chats.length) return false;
  writeChats(remaining);
  return true;
}
