'use server';

import { redirect } from 'next/navigation';
import { issueSession, setSessionCookie, validateCredentials, clearSessionCookie } from '@/lib/auth';

export type LoginState = {
  error?: string;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const ok = validateCredentials(email, password);
  if (!ok) {
    return { error: 'Invalid credentials.' };
  }

  const token = issueSession(email);
  await setSessionCookie(token);
  redirect('/');
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect('/login');
}
