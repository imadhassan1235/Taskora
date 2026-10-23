import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/ai/gemma';

export async function GET() {
  try {
    const result = await testConnection();
    return NextResponse.json(
      {
        success: result.ok,
        data: result,
      },
      { status: result.ok ? 200 : 503 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';

    // Check if it's a config error (API key not set)
    if (msg.includes('GEMINI_API_KEY') || msg.includes('not set')) {
      return NextResponse.json(
        {
          success: false,
          data: {
            ok: false,
            model: process.env.GEMMA_MODEL || 'not configured',
            message: 'API key not configured. Please add GEMINI_API_KEY to .env.local.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: {
          ok: false,
          model: process.env.GEMMA_MODEL || 'unknown',
          message: `Connection test failed: ${msg.slice(0, 200)}`,
        },
      },
      { status: 503 }
    );
  }
}
