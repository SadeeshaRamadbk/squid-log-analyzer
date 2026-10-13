import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessControlRules,
  getAccessControlAuditLog,
  blockDomain,
  unblockDomain,
  grantFullAccessIp,
  revokeFullAccessIp,
} from '@/lib/access-control';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'rules' | 'audit'

    if (mode === 'audit') {
      const audit = getAccessControlAuditLog(100);
      return NextResponse.json({ success: true, audit });
    }

    const rules = getAccessControlRules();
    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error('API /api/access-control GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to modify access control and blocklists' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, target, reason, operator = user?.username || 'admin' } = body;

    if (!action || !target) {
      return NextResponse.json(
        { success: false, error: 'action and target are required' },
        { status: 400 }
      );
    }

    if (action === 'block_domain') {
      blockDomain(target, operator, reason);
    } else if (action === 'unblock_domain') {
      unblockDomain(target, operator, reason);
    } else if (action === 'grant_full_access') {
      grantFullAccessIp(target, operator, reason);
    } else if (action === 'revoke_full_access') {
      revokeFullAccessIp(target, operator, reason);
    } else {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Action ${action} completed for ${target}` });
  } catch (error: any) {
    console.error('API /api/access-control POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
