import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings, SystemSettings } from '@/lib/settings';
import { getUserFromRequest } from '@/lib/auth';

export async function GET() {
  try {
    const settings = getSystemSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to modify system settings' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<SystemSettings>;
    const updated = updateSystemSettings(body);

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
