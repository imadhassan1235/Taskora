import { NextResponse } from 'next/server';
import { getChat } from '@/lib/storage/chats';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const chat = getChat(id);
    if (!chat) return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: chat });
  } catch { return NextResponse.json({ success: false, error: 'Failed to load chat' }, { status: 500 }); }
}
