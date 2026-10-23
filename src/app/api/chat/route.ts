import { NextResponse } from 'next/server';
import { chatWithAssistant } from '@/lib/ai/gemma';
import { ChatRequestSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid chat request',
          details: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { message, history, imageBase64, imageMimeType } = parsed.data;

    const reply = await chatWithAssistant(message, history, imageBase64, imageMimeType);

    return NextResponse.json({ success: true, data: { reply } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';

    if (msg.includes('GEMINI_API_KEY') || msg.includes('not set')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key not configured',
          details: 'Please add GEMINI_API_KEY to your .env.local file.',
        },
        { status: 503 }
      );
    }

    if (msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed', details: 'Invalid API key.' },
        { status: 401 }
      );
    }

    console.error('[POST /api/chat] Error:', msg);
    return NextResponse.json(
      { success: false, error: 'Chat failed', details: 'Please try again.' },
      { status: 500 }
    );
  }
}
