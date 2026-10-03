'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Try Supabase Auth if credentials provided
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!error && data.session) {
        localStorage.setItem('codercorps_admin_auth', 'true');
        router.push('/admin/quizzes');
        return;
      }

      // 2. Admin Passcode bypass for CoderCorps operators / organizers
      // Allows instant testing & local event operation without Supabase Email SMTP constraints
      if (
        password === 'codercorps2026' ||
        password === 'admin123' ||
        password === process.env.NEXT_PUBLIC_ADMIN_SECRET
      ) {
        localStorage.setItem('codercorps_admin_auth', 'true');
        router.push('/admin/quizzes');
        return;
      }

      throw new Error(error?.message || 'Invalid credentials or admin passcode');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">CoderCorps Admin</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to manage quizzes and host live sessions
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Email / Admin Username
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@codercorps.com"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Password or Master Passcode
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-medium"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Tip: Supabase Auth or default operator passcode (<code className="text-indigo-400">codercorps2026</code>)
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-bold text-base text-white shadow-lg shadow-indigo-500/25 transition active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In to Admin</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
