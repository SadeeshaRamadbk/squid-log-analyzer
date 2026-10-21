import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, recordAuditLog } from '@/lib/audit';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const actor = searchParams.get('actor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { logs, total } = getAuditLogs({ action, actor, limit, offset });

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { action, target, details } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
    }

    recordAuditLog({
      actor: user?.username || 'system',
      action,
      target,
      details,
      status: 'success',
      ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
