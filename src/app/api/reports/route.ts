import { NextRequest, NextResponse } from 'next/server';
import { generateScheduledReport } from '@/lib/reports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') as 'daily' | 'weekly') || 'daily';
    const report = await generateScheduledReport(type);

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('API /api/reports GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
