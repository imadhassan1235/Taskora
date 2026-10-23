import { NextResponse } from 'next/server';
import { extractBusinessInfo } from '@/lib/ai/gemma';
import { ExtractRequestSchema } from '@/lib/validation/schemas';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = ExtractRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { message, language } = parsed.data;

    // Call AI service
    const draft = await extractBusinessInfo(message, language);

    return NextResponse.json({ success: true, data: draft });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI response validation failed',
          details: 'The AI returned an unexpected response format. Please try again.',
        },
        { status: 422 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';

    // Categorize errors for appropriate HTTP status codes
    if (message.includes('GEMINI_API_KEY') || message.includes('not set')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key not configured',
          details: 'Please add GEMINI_API_KEY to your .env.local file and restart the server.',
        },
        { status: 503 }
      );
    }

    if (
      message.toLowerCase().includes('authentication') ||
      message.toLowerCase().includes('api_key') ||
      message.toLowerCase().includes('unauthorized')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          details: 'Your API key may be invalid or expired. Check Settings for instructions.',
        },
        { status: 401 }
      );
    }

    if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('billing')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API quota exceeded',
          details: 'Your Google AI quota has been reached. Please check your billing settings.',
        },
        { status: 429 }
      );
    }

    console.error('[POST /api/extract] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Extraction failed',
        details: 'The AI service encountered an error. Please try again in a moment.',
      },
      { status: 500 }
    );
  }
}
