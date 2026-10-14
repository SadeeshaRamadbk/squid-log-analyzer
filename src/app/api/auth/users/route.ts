import { NextRequest, NextResponse } from 'next/server';
import {
  getUserFromRequest,
  getAllUsers,
  createUser,
  deleteUser,
  updateUserRole,
  changeUserPassword,
} from '@/lib/auth';

/**
 * GET /api/auth/users
 * Returns list of user accounts (admin or viewer). Requires authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const users = getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/auth/users
 * Create a new user account (admin or viewer). Requires Admin role.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to create users' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Username, password, and role are required' },
        { status: 400 }
      );
    }

    const newUser = createUser(username, password, role);
    return NextResponse.json({
      success: true,
      message: `User ${newUser.username} created successfully`,
      user: newUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/auth/users
 * Delete a user account. Requires Admin role.
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to delete users' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = Number(body.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Valid userId is required' },
        { status: 400 }
      );
    }

    deleteUser(userId, currentUser.userId);
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * PATCH /api/auth/users
 * Update user role or reset password by Admin. Requires Admin role.
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to modify users' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = Number(body.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Valid userId is required' },
        { status: 400 }
      );
    }

    // Role update
    if (body.role) {
      updateUserRole(userId, body.role, currentUser.userId);
    }

    // Admin password reset
    if (body.newPassword) {
      changeUserPassword(userId, null, body.newPassword, true);
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
