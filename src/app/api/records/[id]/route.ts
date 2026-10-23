import { NextResponse } from 'next/server';
import { getRecordById, updateRecord, deleteRecord } from '@/lib/storage/records';
import { PatchRecordSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const record = getRecordById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Invalid record ID')) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to load record' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = PatchRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid update data',
          details: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const updated = updateRecord(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Invalid record ID')) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }
    console.error('[PATCH /api/records/[id]] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = deleteRecord(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { deleted: true, id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Invalid record ID')) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }
    console.error('[DELETE /api/records/[id]] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 });
  }
}
