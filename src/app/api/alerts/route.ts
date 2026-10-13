import { NextRequest, NextResponse } from 'next/server';
import { evaluateSecurityRules, updateAlertStatus } from '@/lib/alerts';
import { getUserFromRequest } from '@/lib/auth';

export async function GET() {
  try {
    const alerts = evaluateSecurityRules();
    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    console.error('API /api/alerts GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to acknowledge or dismiss alerts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['acknowledged', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid alert ID and status (acknowledged/dismissed) required' },
        { status: 400 }
      );
    }

    updateAlertStatus(Number(id), status);
    return NextResponse.json({ success: true, message: `Alert updated to ${status}` });
  } catch (error: any) {
    console.error('API /api/alerts POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
