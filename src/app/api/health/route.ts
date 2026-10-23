import { NextResponse } from 'next/server';
import { getStorageStats } from '@/lib/storage/records';

export async function GET() {
  try {
    const storage = getStorageStats();
    return NextResponse.json({
      success: true,
      data: {
        status: 'ok',
        appName: 'Taskora',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        storage: {
          totalRecords: storage.totalRecords,
          type: 'local-json',
        },
        environment: process.env.NODE_ENV,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: { status: 'degraded', error: 'Storage unavailable' } },
      { status: 503 }
    );
  }
}
