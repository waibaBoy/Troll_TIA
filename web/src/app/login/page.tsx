'use client';

import React, { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-md">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">TIA Access</p>
          <h1 className="text-3xl font-semibold text-slate-900 mt-3">Sign in</h1>
          <p className="text-sm text-slate-500 mt-2">Private dashboard for authorized users.</p>
        </div>

        <form action={formAction} className="mt-8 space-y-4">
          <label className="block text-sm text-slate-600">
            Email
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="block text-sm text-slate-600">
            Password
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>

          {state.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 text-white py-2.5 text-sm font-semibold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition"
          >
            Access dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
