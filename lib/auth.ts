import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'sales-coach-live-secret-change-me';

export interface AuthUser {
  id: number;
  email: string;
  must_change_password: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const sql = getDb();
    const rows = await sql`SELECT id, email, must_change_password FROM users WHERE id = ${decoded.id}`;

    if (rows.length === 0) return null;
    return rows[0] as AuthUser;
  } catch {
    return null;
  }
}

export async function seedDefaultUser() {
  const sql = getDb();
  const existing = await sql`SELECT id FROM users WHERE email = 'wylie@aipeakbiz.com'`;

  if (existing.length === 0) {
    const hash = await hashPassword('Password');
    await sql`INSERT INTO users (email, password_hash, must_change_password) VALUES ('wylie@aipeakbiz.com', ${hash}, true)`;
  }
}
