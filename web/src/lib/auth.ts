import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'tia_session';

type UserEntry = {
  email: string;
  password: string;
};

function parseUsers(): UserEntry[] {
  const raw = process.env.DASHBOARD_USERS || '';
  if (!raw) return [];
  return raw
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [email, ...rest] = entry.split(':');
      return { email: email.trim().toLowerCase(), password: rest.join(':') };
    })
    .filter(entry => entry.email && entry.password);
}

function getSecret() {
  const secret = process.env.DASHBOARD_AUTH_SECRET;
  if (!secret) {
    throw new Error('Missing DASHBOARD_AUTH_SECRET');
  }
  return secret;
}

function signToken(payload: string) {
  const secret = getSecret();
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function validateCredentials(email: string, password: string) {
  const users = parseUsers();
  const normalized = email.trim().toLowerCase();
  const match = users.find(user => user.email === normalized);
  if (!match) return false;
  return safeEqual(match.password, password);
}

export function issueSession(email: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12;
  const payload = `${email}:${expiresAt}`;
  const sig = signToken(payload);
  return `${payload}:${sig}`;
}

export function verifySession(value: string | undefined) {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length < 3) return null;
  const email = parts[0];
  const expiresAt = Number(parts[1]);
  const sig = parts.slice(2).join(':');
  if (!email || !expiresAt || !sig) return null;
  if (Date.now() > expiresAt) return null;
  const expected = signToken(`${email}:${expiresAt}`);
  if (!safeEqual(expected, sig)) return null;
  return { email };
}

export async function requireAuth() {
  const store = await cookies();
  const session = store.get(COOKIE_NAME)?.value;
  const verified = verifySession(session);
  if (!verified) {
    redirect('/login');
  }
  return verified;
}

export async function setSessionCookie(value: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
