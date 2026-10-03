'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gamepad2, ArrowRight } from 'lucide-react';

export default function PlayRootPage() {
  const [pin, setPin] = useState('');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin.length >= 4) {
      router.push(`/play/${cleanPin}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
            <Gamepad2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">CoderCorps Quiz</h1>
          <p className="text-sm text-slate-400 mt-1">Enter Game PIN to join live session</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Game PIN"
              className="w-full text-center text-3xl font-extrabold tracking-widest px-4 py-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:border-transparent transition"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-bold text-lg text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition active:scale-95"
          >
            <span>Enter Game</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          Powered by CoderCorps Realtime Engine
        </div>
      </div>
    </div>
  );
}
