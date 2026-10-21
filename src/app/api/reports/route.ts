import { NextRequest, NextResponse } from 'next/server';
import { generateScheduledReport, sendScheduledReportEmail } from '@/lib/reports';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') as 'daily' | 'weekly') || 'daily';
    const user = getUserFromRequest(request);
    const report = await generateScheduledReport(type);

    recordAuditLog({
      actor: user?.username || 'viewer',
      action: 'report_gen',
      target: report.title,
      details: { type, totalRequests: report.type },
      status: 'success',
      ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('API /api/reports GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to dispatch scheduled reports' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const type = (body.type as 'daily' | 'weekly') || 'weekly';
    const recipient = body.recipient || undefined;

    const result = await sendScheduledReportEmail(type, recipient);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('API /api/reports POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
