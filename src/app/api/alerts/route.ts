import { NextRequest, NextResponse } from 'next/server';
import { evaluateSecurityRules, updateAlertStatus, dismissOldAlerts } from '@/lib/alerts';
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
    const { id, status, action, olderThanMinutes, snoozeDuration } = body;

    // Batch dismiss active alerts older than cutoff
    if (action === 'dismiss_old' || status === 'dismiss_old') {
      const minutes = typeof olderThanMinutes === 'number' && olderThanMinutes > 0 ? olderThanMinutes : 60;
      const dismissedCount = dismissOldAlerts(minutes * 60 * 1000);
      return NextResponse.json({
        success: true,
        message: `Dismissed ${dismissedCount} old alerts`,
        dismissedCount,
      });
    }

    // Snooze alert
    if (action === 'snooze' || status === 'snoozed') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'Alert ID is required for snooze' }, { status: 400 });
      }
      let durationMs = 60 * 60 * 1000; // default 1h
      if (snoozeDuration === '1d') durationMs = 24 * 60 * 60 * 1000;
      else if (snoozeDuration === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;

      updateAlertStatus(Number(id), 'snoozed', durationMs);
      return NextResponse.json({ success: true, message: `Alert snoozed for ${snoozeDuration || '1h'}` });
    }

    if (!id || !['acknowledged', 'dismissed', 'snoozed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid alert ID and status (acknowledged/dismissed/snoozed) required' },
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
