import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSessionTokenFromRequest, getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const token = getSessionTokenFromRequest(request);
    if (token) {
      deleteSession(token);
    }

    if (user) {
      recordAuditLog({
        actor: user.username,
        action: 'logout',
        status: 'success',
        ip_address: request.headers.get('x-forwarded-for') || undefined,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set({
      name: 'auth_session',
      value: '',
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
