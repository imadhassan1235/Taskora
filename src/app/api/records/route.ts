import { NextResponse } from 'next/server';
import { getAllRecords, createRecord } from '@/lib/storage/records';
import { SaveRequestSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const records = getAllRecords();
    return NextResponse.json({ success: true, data: records });
  } catch (err) {
    console.error('[GET /api/records] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load records' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = SaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid record data',
          details: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { draft } = parsed.data;

    const record = createRecord({
      customer: draft.customer,
      task: draft.task,
      amount: draft.amount,
      currency: draft.currency,
      dueDate: draft.dueDate,
      dueDateRaw: draft.dueDateRaw,
      notes: draft.notes,
      originalMessage: draft.originalMessage,
      language: draft.language,
      confidence: draft.confidence,
      uncertain: draft.uncertain,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/records] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save record' },
      { status: 500 }
    );
  }
}
