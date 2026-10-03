'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  Play,
  Eye,
  Flag,
  Users,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface ControlPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionControlPage({ params }: ControlPageProps) {
  const { id: sessionId } = use(params);

  const [session, setSession] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch session details
  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setQuiz(data.quiz);
        setTotalQuestions(data.total_questions);
        setCurrentQuestion(data.current_question);
        setParticipantCount(data.participant_count);
        setAnsweredCount(data.answered_count);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Realtime subscription to keep counts up-to-date
  useEffect(() => {
    if (!sessionId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`session:${sessionId}`);

    channel
      .on('broadcast', { event: 'player_joined' }, (payload: any) => {
        setParticipantCount(payload.payload.participant_count);
      })
      .on('broadcast', { event: 'answer_locked' }, (payload: any) => {
        setAnsweredCount(payload.payload.participant_count_answered);
      })
      .on('broadcast', { event: 'question_started' }, () => {
        fetchSession();
      })
      .on('broadcast', { event: 'question_reveal' }, () => {
        fetchSession();
      })
      .on('broadcast', { event: 'session_ended' }, () => {
        fetchSession();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // 1. Next Question Action
  const handleNextQuestion = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/next`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance question');
      await fetchSession();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reveal Answer Action
  const handleReveal = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/reveal`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reveal answer');
      await fetchSession();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. End Quiz Action
  const handleEndQuiz = async () => {
    if (!confirm('Are you sure you want to end this quiz session? Final scores will be locked.')) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to end session');
      await fetchSession();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="font-bold">Loading session control...</span>
        </div>
      </main>
    );
  }

  const status = session?.status || 'lobby';
  const currentIndex = session?.current_question_index || 0;
  const isLastQuestion = currentIndex >= totalQuestions;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col p-6 sm:p-10">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/quizzes"
                className="text-xs font-bold text-slate-400 hover:text-white transition"
              >
                ← Back to Quizzes
              </Link>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Live Admin Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{quiz?.title || 'Live Quiz'}</h1>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/host/${sessionId}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Host Big Screen</span>
            </a>
          </div>
        </header>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status & Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* PIN */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Game PIN
            </span>
            <span className="text-3xl font-black text-amber-400 font-mono tracking-widest">
              {session?.pin}
            </span>
          </div>

          {/* Current Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Game State
            </span>
            <span className="text-xl font-black uppercase text-indigo-400">
              {status}
            </span>
          </div>

          {/* Connected Players */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Players
            </span>
            <span className="text-3xl font-black text-white">
              {participantCount}
            </span>
          </div>

          {/* Question Index */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Question
            </span>
            <span className="text-3xl font-black text-white">
              {currentIndex} <span className="text-sm text-slate-500">/ {totalQuestions}</span>
            </span>
          </div>
        </div>

        {/* Live Question Card (if active) */}
        {currentQuestion && status === 'question' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Question #{currentIndex}
              </span>
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Users className="w-4 h-4" />
                <span>{answeredCount} / {participantCount} Players Answered</span>
              </div>
            </div>

            <h3 className="text-xl font-black text-white leading-snug">
              {currentQuestion.question_text}
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                ▲ A: {currentQuestion.option_a}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                ◆ B: {currentQuestion.option_b}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                ● C: {currentQuestion.option_c}
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                ■ D: {currentQuestion.option_d}
              </div>
            </div>
          </div>
        )}

        {/* Main Action Controllers */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <h2 className="text-lg font-black text-slate-300 uppercase tracking-wider">
            Game Control Actions
          </h2>

          {/* State 1: In Lobby */}
          {status === 'lobby' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Players are currently in the lobby entering their nicknames. When ready, click to launch Question 1!
              </p>
              <button
                onClick={handleNextQuestion}
                disabled={actionLoading}
                className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-xl text-white shadow-xl shadow-emerald-600/30 transition active:scale-98 flex items-center justify-center gap-3"
              >
                {actionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    <span>Start Quiz (Question 1)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* State 2: In Question */}
          {status === 'question' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Question is active on player phones and host display. Click below to lock answers and reveal results.
              </p>
              <button
                onClick={handleReveal}
                disabled={actionLoading}
                className="w-full py-5 rounded-2xl bg-amber-500 hover:bg-amber-400 font-black text-xl text-slate-950 shadow-xl shadow-amber-500/30 transition active:scale-98 flex items-center justify-center gap-3"
              >
                {actionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-6 h-6" />
                    <span>Reveal Answer &amp; Leaderboard</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* State 3: In Reveal */}
          {status === 'reveal' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Answer and leaderboard are currently shown on the big screen and players phones.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isLastQuestion ? (
                  <button
                    onClick={handleNextQuestion}
                    disabled={actionLoading}
                    className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black text-lg text-white shadow-xl shadow-indigo-600/30 transition active:scale-98 flex items-center justify-center gap-3"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="w-6 h-6" />
                        <span>Next Question ({currentIndex + 1} of {totalQuestions})</span>
                      </>
                    )}
                  </button>
                ) : null}

                <button
                  onClick={handleEndQuiz}
                  disabled={actionLoading}
                  className={`w-full py-5 rounded-2xl font-black text-lg text-white shadow-xl transition active:scale-98 flex items-center justify-center gap-3 ${
                    isLastQuestion
                      ? 'sm:col-span-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 shadow-amber-500/30'
                      : 'bg-rose-700/80 hover:bg-rose-600 shadow-rose-700/20'
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Trophy className="w-6 h-6" />
                      <span>{isLastQuestion ? 'End Quiz & Crown Champion 🏆' : 'End Quiz Early'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* State 4: Ended */}
          {status === 'ended' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white">Quiz Session Ended</h3>
              <p className="text-sm text-slate-400">
                The final podium and winner ceremony are live on the host display!
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/quizzes"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition"
                >
                  Create or Launch Another Quiz
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
