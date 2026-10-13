import { NextRequest, NextResponse } from 'next/server';
import { evaluateSecurityRules, updateAlertStatus } from '@/lib/alerts';

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
