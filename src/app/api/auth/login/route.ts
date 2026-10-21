import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || '').trim();
    const password = body.password || '';
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = authenticateUser(username, password);
    if (!user) {
      recordAuditLog({
        actor: username || 'unknown',
        action: 'login',
        status: 'failure',
        details: 'Invalid credentials provided',
        ip_address: clientIp,
      });

      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    recordAuditLog({
      actor: user.username,
      action: 'login',
      status: 'success',
      details: `Role: ${user.role}`,
      ip_address: clientIp,
    });

    const sessionToken = createSession(user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
      },
    });

    // Set secure HTTP-only session cookie (7 days duration)
    response.cookies.set({
      name: 'auth_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
