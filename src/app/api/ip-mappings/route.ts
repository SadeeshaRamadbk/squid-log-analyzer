import { NextRequest, NextResponse } from 'next/server';
import { getIpMappings, upsertIpMapping, deleteIpMapping, getUnassignedIps } from '@/lib/db/queries';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const mappings = getIpMappings();
    const unassignedIps = getUnassignedIps();
    return NextResponse.json({ success: true, data: mappings, unassignedIps });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch IP mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to edit IP mappings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clientIp, userName, department, notes } = body;

    if (!clientIp || !userName) {
      return NextResponse.json(
        { success: false, error: 'Both clientIp and userName are required' },
        { status: 400 }
      );
    }

    upsertIpMapping(clientIp, userName, department, notes);

    recordAuditLog({
      actor: user?.username || 'admin',
      action: 'alias_edit',
      target: `${clientIp} (${userName})`,
      details: { userName, department, notes },
      status: 'success',
      ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, message: 'IP mapping saved successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save IP mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to delete IP mappings' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientIp = searchParams.get('clientIp');

    if (!clientIp) {
      return NextResponse.json(
        { success: false, error: 'clientIp parameter is required' },
        { status: 400 }
      );
    }

    const deleted = deleteIpMapping(clientIp);

    recordAuditLog({
      actor: user?.username || 'admin',
      action: 'alias_delete',
      target: clientIp,
      status: 'success',
      ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete IP mapping' },
      { status: 500 }
    );
  }
}
