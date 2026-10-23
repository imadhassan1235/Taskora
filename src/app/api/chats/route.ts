import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteChat, listChats, saveChat } from '@/lib/storage/chats';

const MessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(['user', 'assistant']),
  content: z.string().max(10000),
  timestamp: z.string(),
  imageUrl: z.string().max(7_000_000).optional(),
});
const SaveSchema = z.object({ id: z.string().min(1).max(128).optional(), messages: z.array(MessageSchema).min(1).max(200) });

export async function GET() {
  try { return NextResponse.json({ success: true, data: listChats() }); }
  catch { return NextResponse.json({ success: false, error: 'Failed to load chats' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const parsed = SaveSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid chat data' }, { status: 400 });
    return NextResponse.json({ success: true, data: saveChat(parsed.data.id, parsed.data.messages) });
  } catch (error) {
    console.error('[POST /api/chats]', error);
    return NextResponse.json({ success: false, error: 'Failed to save chat' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Chat ID is required' }, { status: 400 });
    return NextResponse.json({ success: true, data: { deleted: deleteChat(id) } });
  } catch { return NextResponse.json({ success: false, error: 'Failed to delete chat' }, { status: 500 }); }
}
