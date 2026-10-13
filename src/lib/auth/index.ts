import crypto from 'crypto';
import { getDatabase } from '@/lib/db';
import type Database from 'better-sqlite3';

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
}

export interface SessionData {
  userId: number;
  username: string;
  role: 'admin' | 'viewer';
  expiresAt: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hash password with salt using scrypt (Node.js crypto)
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Verify password against salt and hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Seed default admin and viewer accounts if table is empty
 */
export function seedDefaultUsers(db: Database.Database): void {
  try {
    const countRow = db.prepare('SELECT count(*) as count FROM users').get() as any;
    if (!countRow || countRow.count === 0) {
      console.log('[Auth] Initializing default user accounts (admin & viewer)...');
      const now = Date.now();

      const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';
      const viewerPass = process.env.VIEWER_PASSWORD || 'Viewer@123';

      const adminHash = hashPassword(adminPass);
      const viewerHash = hashPassword(viewerPass);

      const insertStmt = db.prepare(`
        INSERT INTO users (username, password_hash, salt, role, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertStmt.run('admin', adminHash.hash, adminHash.salt, 'admin', now);
      insertStmt.run('viewer', viewerHash.hash, viewerHash.salt, 'viewer', now);
      console.log('[Auth] Default accounts created: admin/Admin@123, viewer/Viewer@123');
    }
  } catch (err) {
    console.warn('[Auth] User seed check warning:', err);
  }
}

/**
 * Authenticate credentials and return user object if valid
 */
export function authenticateUser(username: string, password: string): AuthUser | null {
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, password_hash, salt, role FROM users WHERE username = ?').get(username) as any;
  if (!user) return null;

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role as 'admin' | 'viewer',
  };
}

/**
 * Create a new user session token stored in SQLite
 */
export function createSession(user: AuthUser): string {
  const db = getDatabase();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  // Prune any expired sessions periodically
  try {
    db.prepare('DELETE FROM user_sessions WHERE expires_at < ?').run(now);
  } catch {}

  db.prepare(`
    INSERT INTO user_sessions (token, user_id, username, role, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, user.id, user.username, user.role, expiresAt, now);

  return token;
}

/**
 * Validate an incoming session token
 */
export function validateSession(token: string): SessionData | null {
  if (!token) return null;
  const db = getDatabase();
  const now = Date.now();

  const session = db.prepare(`
    SELECT user_id, username, role, expires_at
    FROM user_sessions
    WHERE token = ? AND expires_at > ?
  `).get(token, now) as any;

  if (!session) return null;

  return {
    userId: session.user_id,
    username: session.username,
    role: session.role as 'admin' | 'viewer',
    expiresAt: session.expires_at,
  };
}

/**
 * Delete session upon logout
 */
export function deleteSession(token: string): void {
  if (!token) return;
  const db = getDatabase();
  try {
    db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  } catch {}
}

/**
 * Helper to extract session token from cookie string or Request
 */
export function getSessionTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith('auth_session='));
  if (!authCookie) return null;

  return authCookie.substring('auth_session='.length);
}

/**
 * Helper to get current authenticated user from incoming Request
 */
export function getUserFromRequest(req: Request): SessionData | null {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  return validateSession(token);
}
