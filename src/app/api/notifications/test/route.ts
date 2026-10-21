import { NextRequest, NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/notifications';
import { getUserFromRequest } from '@/lib/auth';
import { getSystemSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to test notification channels' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const channel = body.channel as 'smtp' | 'webhook';
    if (channel !== 'smtp' && channel !== 'webhook') {
      return NextResponse.json(
        { success: false, error: "Invalid channel. Must be 'smtp' or 'webhook'." },
        { status: 400 }
      );
    }

    // Merge passed settings with stored system settings for live preview testing
    const currentSettings = getSystemSettings();
    const testSettings = { ...currentSettings, ...(body.settings || {}) };

    const result = await sendTestNotification(channel, testSettings);
    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    console.error('API /api/notifications/test POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
