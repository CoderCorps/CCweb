'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  QuestionStartedPayload,
  QuestionRevealPayload,
  SessionEndedPayload,
  LeaderboardEntry,
} from '@/types/quiz';
import {
  Users,
  Clock,
  Award,
  Crown,
  CheckCircle2,
  Trophy,
  Flame,
  Play,
  SlidersHorizontal,
  Loader2,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface HostPageProps {
  params: Promise<{ id: string }>;
}

export default function HostDisplayPage({ params }: HostPageProps) {
  const { id: sessionId } = use(params);

  // Session Data
  const [session, setSession] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [pin, setPin] = useState<string>('');
  const [status, setStatus] = useState<string>('lobby');

  // Participants & Answers
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);

  // Question & Timer
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStartedPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(20);

  // Reveal & Leaderboard
  const [revealData, setRevealData] = useState<QuestionRevealPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Direct Host Actions
  const handleStartOrNextQuestion = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}/next`, { method: 'POST' });
      const data = await res.json();
      if (data.ended) {
        if (data.final_leaderboard && data.final_leaderboard.length > 0) {
          setFinalLeaderboard(data.final_leaderboard);
        } else {
          const lbRes = await fetch(`/api/sessions/${sessionId}/leaderboard?limit=50`);
          const lbData = await lbRes.json();
          if (lbData.leaderboard) setFinalLeaderboard(lbData.leaderboard);
        }
        setStatus('ended');
      }
    } catch (err) {
      console.error('Failed to advance question:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevealAnswer = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}/reveal`, { method: 'POST' });
      const data = await res.json();
      if (data && !data.error) {
        setRevealData(data);
        if (data.leaderboard_top10) {
          setLeaderboard(data.leaderboard_top10);
        }
        setStatus('reveal');
      }
    } catch (err) {
      console.error('Failed to reveal answer:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndQuiz = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
      const data = await res.json();
      if (data.final_leaderboard && data.final_leaderboard.length > 0) {
        setFinalLeaderboard(data.final_leaderboard);
      } else {
        const lbRes = await fetch(`/api/sessions/${sessionId}/leaderboard?limit=50`);
        const lbData = await lbRes.json();
        if (lbData.leaderboard) setFinalLeaderboard(lbData.leaderboard);
      }
      setStatus('ended');
    } catch (err) {
      console.error('Failed to end quiz:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch initial session state
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        setSession(data.session);
        setQuiz(data.quiz);
        setPin(data.session.pin);
        setStatus(data.session.status);
        setTotalQuestions(data.total_questions || 0);
        setParticipantCount(data.participant_count || 0);
        setAnsweredCount(data.answered_count || 0);

        if (data.leaderboard && data.leaderboard.length > 0) {
          setLeaderboard(data.leaderboard);
          setFinalLeaderboard(data.leaderboard);
        }

        if (data.reveal_data) {
          setRevealData(data.reveal_data);
          if (data.reveal_data.leaderboard_top10?.length) {
            setLeaderboard(data.reveal_data.leaderboard_top10);
          }
        }

        if (data.session.status === 'ended') {
          const lbRes = await fetch(`/api/sessions/${sessionId}/leaderboard?limit=50`);
          if (lbRes.ok) {
            const lbData = await lbRes.json();
            if (lbData.leaderboard && lbData.leaderboard.length > 0) {
              setFinalLeaderboard(lbData.leaderboard);
              setLeaderboard(lbData.leaderboard);
            }
          }
        }

        if (data.current_question && data.session.status === 'question') {
          const q = data.current_question;
          const qPayload: QuestionStartedPayload = {
            question_index: data.session.current_question_index,
            total_questions: data.total_questions,
            question_id: q.id,
            question_text: q.question_text,
            options: {
              a: q.option_a,
              b: q.option_b,
              c: q.option_c,
              d: q.option_d,
            },
            image_url: q.image_url,
            time_limit_seconds: q.time_limit_seconds,
            started_at: data.session.question_started_at || new Date().toISOString(),
          };
          setCurrentQuestion(qPayload);
          setTimeLimit(q.time_limit_seconds);

          const startMs = new Date(data.session.question_started_at).getTime();
          const rem = Math.max(0, Math.ceil((q.time_limit_seconds * 1000 - (Date.now() - startMs)) / 1000));
          setTimeLeft(rem);
        }
      } catch (err) {
        console.error('Failed to load initial session:', err);
      }
    }

    fetchSession();
  }, [sessionId]);

  // Ensure leaderboard is always populated when in reveal or ended state
  useEffect(() => {
    if ((status === 'reveal' && leaderboard.length === 0) || (status === 'ended' && finalLeaderboard.length === 0)) {
      fetch(`/api/sessions/${sessionId}/leaderboard?limit=50`)
        .then((res) => res.json())
        .then((lbData) => {
          if (lbData.leaderboard && lbData.leaderboard.length > 0) {
            setLeaderboard(lbData.leaderboard);
            setFinalLeaderboard(lbData.leaderboard);
          }
        })
        .catch((err) => console.error('Failed to fetch leaderboard fallback:', err));
    }
  }, [status, sessionId, leaderboard.length, finalLeaderboard.length]);

  // Set join URL for QR code
  useEffect(() => {
    if (typeof window !== 'undefined' && pin) {
      setJoinUrl(`${window.location.origin}/play/${pin}`);
    }
  }, [pin]);

  // Realtime Broadcast Channel Listener
  useEffect(() => {
    if (!sessionId) return;

    const supabase = getSupabaseClient();
    const channelName = `session:${sessionId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'player_joined' }, (payload: { payload: { nickname: string; participant_count: number } }) => {
        const { nickname, participant_count } = payload.payload;
        setParticipantCount(participant_count);
        setParticipants((prev) => {
          if (!prev.includes(nickname)) {
            return [nickname, ...prev];
          }
          return prev;
        });
      })
      .on('broadcast', { event: 'question_started' }, (payload: { payload: QuestionStartedPayload }) => {
        const qData = payload.payload;
        setCurrentQuestion(qData);
        setTotalQuestions(qData.total_questions || 0);
        setTimeLimit(qData.time_limit_seconds);
        setAnsweredCount(0);
        setRevealData(null);
        setStatus('question');

        const startMs = new Date(qData.started_at).getTime();
        const durationMs = qData.time_limit_seconds * 1000;
        const remainingSeconds = Math.max(0, Math.ceil((durationMs - (Date.now() - startMs)) / 1000));
        setTimeLeft(remainingSeconds);
      })
      .on('broadcast', { event: 'answer_locked' }, (payload: { payload: { participant_count_answered: number; total_participants: number } }) => {
        setAnsweredCount(payload.payload.participant_count_answered);
        if (payload.payload.total_participants) {
          setParticipantCount(payload.payload.total_participants);
        }
      })
      .on('broadcast', { event: 'question_reveal' }, (payload: { payload: QuestionRevealPayload }) => {
        setStatus('reveal');
        setRevealData(payload.payload);
        if (payload.payload.leaderboard_top10) {
          setLeaderboard(payload.payload.leaderboard_top10);
        }
      })
      .on('broadcast', { event: 'session_ended' }, (payload: { payload: SessionEndedPayload }) => {
        setStatus('ended');
        if (payload.payload.final_leaderboard && payload.payload.final_leaderboard.length > 0) {
          setFinalLeaderboard(payload.payload.final_leaderboard);
        } else {
          fetch(`/api/sessions/${sessionId}/leaderboard?limit=50`)
            .then((res) => res.json())
            .then((lbData) => {
              if (lbData.leaderboard) setFinalLeaderboard(lbData.leaderboard);
            })
            .catch(console.error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (status !== 'question') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // 1. Lobby View (Big PIN & QR Code)
  if (status === 'lobby') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col justify-between p-8 sm:p-12">
        {/* Top Header */}
        <header className="flex justify-between items-center border-b border-indigo-900/40 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/40">
              CC
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">{quiz?.title || 'Live Quiz Challenge'}</h1>
              <p className="text-sm text-indigo-300">CoderCorps Live Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-900/80 border border-indigo-500/30 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-xl">
              <Users className="w-5 h-5 text-indigo-400" />
              <span className="text-xl font-black text-white">{participantCount}</span>
              <span className="text-xs font-semibold text-indigo-300">Players Joined</span>
            </div>

            <button
              onClick={handleStartOrNextQuestion}
              disabled={actionLoading}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base shadow-xl shadow-emerald-500/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
              <span>Start Quiz</span>
            </button>

            <a
              href={`/admin/sessions/${sessionId}/control`}
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-lg"
              title="Open Admin Remote Controller"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </a>
          </div>
        </header>

        {/* Center: PIN & QR Code */}
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 my-8">
          {/* Join Instructions */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold text-sm uppercase tracking-wider">
              Join from your phone
            </div>

            <div className="space-y-1">
              <p className="text-slate-400 text-lg">Scan QR Code or open:</p>
              <p className="text-2xl font-bold text-indigo-400 tracking-wide font-mono">
                {joinUrl ? joinUrl.replace(/^https?:\/\//, '') : `/play/${pin}`}
              </p>
            </div>

            <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
              <span className="text-sm text-indigo-300 font-bold uppercase tracking-widest block mb-1">
                Game PIN
              </span>
              <div className="text-6xl sm:text-7xl font-black tracking-widest text-amber-400 font-mono select-all">
                {pin || '------'}
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 border-4 border-indigo-400/40 flex flex-col items-center">
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={260}
                level="M"
                includeMargin={false}
              />
            ) : (
              <div className="w-[260px] h-[260px] bg-slate-200 animate-pulse rounded-2xl" />
            )}
            <span className="text-slate-800 font-bold text-xs mt-3 uppercase tracking-wider">
              Scan to Enter
            </span>
          </div>
        </div>

        {/* Bottom Joined Players Roster */}
        <footer className="bg-slate-900/60 border border-indigo-900/40 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-300 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Waiting Room ({participants.length} names loaded)
            </h3>
            <span className="text-xs text-indigo-400 animate-pulse font-medium">
              Waiting for Host to Start...
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto pr-2">
            {participants.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No players connected yet. Scan QR or enter PIN above!</p>
            ) : (
              participants.map((nick, idx) => (
                <span
                  key={idx}
                  className="px-4 py-1.5 rounded-full text-sm font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 animate-fade-in shadow-sm"
                >
                  {nick}
                </span>
              ))
            )}
          </div>
        </footer>
      </main>
    );
  }

  // 2. Question View (Big Screen)
  if (status === 'question') {
    const progressPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;

    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
        {/* Header: Question index, Timer, Answer Counter */}
        <header className="flex justify-between items-center bg-slate-900/90 border border-slate-800 rounded-3xl px-8 py-4 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-lg">
              {currentQuestion?.question_index}
            </span>
            <span className="text-slate-400 font-semibold text-lg">
              of {currentQuestion?.total_questions}
            </span>
          </div>

          {/* Large Countdown Circular / Digital Timer */}
          <div className="flex items-center gap-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl border-4 transition-all duration-300 ${
                timeLeft <= 5
                  ? 'border-rose-500 text-rose-400 bg-rose-500/10 animate-bounce'
                  : 'border-amber-400 text-amber-400 bg-amber-400/10'
              }`}
            >
              {timeLeft}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-800/90 px-5 py-2.5 rounded-2xl border border-slate-700">
              <Users className="w-5 h-5 text-indigo-400" />
              <span className="font-extrabold text-xl text-white">
                {answeredCount} <span className="text-slate-500 text-sm">/ {participantCount}</span>
              </span>
              <span className="text-xs text-slate-400 font-semibold">Answered</span>
            </div>

            <button
              onClick={handleRevealAnswer}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>Reveal Answer</span>
            </button>

            <a
              href={`/admin/sessions/${sessionId}/control`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-lg"
              title="Open Admin Remote Controller"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Center: Question Text & Image */}
        <div className="flex-1 flex flex-col items-center justify-center my-4 text-center px-4">
          {currentQuestion?.image_url && (
            <div className="mb-6 max-h-60 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQuestion.image_url}
                alt="Question visual"
                className="max-h-60 object-contain"
              />
            </div>
          )}

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight max-w-5xl tracking-tight">
            {currentQuestion?.question_text}
          </h2>
        </div>

        {/* Bottom: 4 Kahoot-Style Colored Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Option A - Red Triangle */}
          <div className="bg-rose-600 rounded-3xl p-6 sm:p-8 flex items-center gap-5 shadow-2xl transition hover:brightness-105">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              ▲
            </div>
            <span className="text-xl sm:text-2xl font-black text-white leading-snug">
              {currentQuestion?.options.a}
            </span>
          </div>

          {/* Option B - Blue Diamond */}
          <div className="bg-blue-600 rounded-3xl p-6 sm:p-8 flex items-center gap-5 shadow-2xl transition hover:brightness-105">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              ◆
            </div>
            <span className="text-xl sm:text-2xl font-black text-white leading-snug">
              {currentQuestion?.options.b}
            </span>
          </div>

          {/* Option C - Yellow Circle */}
          <div className="bg-amber-500 rounded-3xl p-6 sm:p-8 flex items-center gap-5 shadow-2xl transition hover:brightness-105">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              ●
            </div>
            <span className="text-xl sm:text-2xl font-black text-white leading-snug">
              {currentQuestion?.options.c}
            </span>
          </div>

          {/* Option D - Green Square */}
          <div className="bg-emerald-600 rounded-3xl p-6 sm:p-8 flex items-center gap-5 shadow-2xl transition hover:brightness-105">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              ■
            </div>
            <span className="text-xl sm:text-2xl font-black text-white leading-snug">
              {currentQuestion?.options.d}
            </span>
          </div>
        </div>
      </main>
    );
  }

  // 3. Reveal & Leaderboard View (Big Screen)
  if (status === 'reveal') {
    if (!revealData) {
      return (
        <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <h2 className="text-2xl font-black">Calculating Results...</h2>
          <p className="text-slate-400 text-sm mt-1">Tallies and rankings incoming</p>
        </main>
      );
    }

    const correctOpt = revealData.correct_option;
    const stats = revealData.stats || { a: 0, b: 0, c: 0, d: 0 };
    const maxStat = Math.max(1, stats.a, stats.b, stats.c, stats.d);
    const activeLeaderboard = leaderboard.length > 0 ? leaderboard : (revealData.leaderboard_top10 || []);

    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10">
        {/* Header */}
        <header className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-3xl px-8 py-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Answer Revealed
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-400 mr-2">
              Leaderboard Updated
            </span>

            {totalQuestions > 0 &&
            (revealData.question_index || currentQuestion?.question_index || session?.current_question_index || 0) >=
              totalQuestions ? (
              <button
                onClick={handleEndQuiz}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black text-sm shadow-xl shadow-amber-500/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trophy className="w-4 h-4 text-amber-200" />
                )}
                <span>Final Results &amp; Winner Podium 🏆</span>
              </button>
            ) : (
              <button
                onClick={handleStartOrNextQuestion}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Next Question</span>
              </button>
            )}

            <a
              href={`/admin/sessions/${sessionId}/control`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-lg"
              title="Open Admin Remote Controller"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Center Grid: Answer Stats Chart & Top Leaderboard */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto items-stretch">
          {/* Left Column: Option Breakdown Chart */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center shadow-xl">
            <h3 className="text-lg font-black text-slate-300 mb-6 uppercase tracking-wider text-center">
              Player Answers Distribution
            </h3>

            <div className="space-y-4">
              {/* Option A */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-rose-500 font-black">▲ A:</span>
                    <span className="truncate max-w-[200px]">{currentQuestion?.options.a}</span>
                    {correctOpt === 'a' && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                  </span>
                  <span className="font-mono">{stats.a}</span>
                </div>
                <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      correctOpt === 'a' ? 'bg-emerald-500' : 'bg-rose-600'
                    }`}
                    style={{ width: `${(stats.a / maxStat) * 100}%` }}
                  />
                </div>
              </div>

              {/* Option B */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-blue-500 font-black">◆ B:</span>
                    <span className="truncate max-w-[200px]">{currentQuestion?.options.b}</span>
                    {correctOpt === 'b' && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                  </span>
                  <span className="font-mono">{stats.b}</span>
                </div>
                <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      correctOpt === 'b' ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${(stats.b / maxStat) * 100}%` }}
                  />
                </div>
              </div>

              {/* Option C */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-amber-500 font-black">● C:</span>
                    <span className="truncate max-w-[200px]">{currentQuestion?.options.c}</span>
                    {correctOpt === 'c' && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                  </span>
                  <span className="font-mono">{stats.c}</span>
                </div>
                <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      correctOpt === 'c' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${(stats.c / maxStat) * 100}%` }}
                  />
                </div>
              </div>

              {/* Option D */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">■ D:</span>
                    <span className="truncate max-w-[200px]">{currentQuestion?.options.d}</span>
                    {correctOpt === 'd' && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                  </span>
                  <span className="font-mono">{stats.d}</span>
                </div>
                <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      correctOpt === 'd' ? 'bg-emerald-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${(stats.d / maxStat) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Top Leaderboard */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-amber-400" />
                Live Leaderboard (Top 10)
              </h3>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Total Score
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-2">
              {activeLeaderboard.length === 0 ? (
                <p className="text-slate-500 text-sm italic text-center py-8">Waiting for scores...</p>
              ) : (
                activeLeaderboard.map((entry) => (
                  <div
                    key={entry.participant_id}
                    className={`flex items-center justify-between px-5 py-3 rounded-2xl border transition ${
                      entry.rank === 1
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : entry.rank === 2
                        ? 'bg-slate-300/15 border-slate-400/40 text-slate-200'
                        : entry.rank === 3
                        ? 'bg-amber-700/15 border-amber-700/40 text-amber-400'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 font-black text-lg text-center">
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                      </span>
                      <span className="font-extrabold text-lg text-white">
                        {entry.nickname}
                      </span>
                    </div>
                    <span className="font-black text-xl font-mono text-amber-400">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <footer className="text-center py-2 text-slate-500 text-sm">
          Next question starting soon... Admin controller is advancing rounds.
        </footer>
      </main>
    );
  }

  // 4. Session Ended / Winner Ceremony Screen (Big Screen)
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-8 sm:p-12">
      <header className="text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-black uppercase tracking-wider mb-3">
          Grand Championship Ceremony
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          Quiz Completed!
        </h1>
        <p className="text-slate-400 text-lg mt-2">{quiz?.title || 'Live Quiz'}</p>
      </header>

      {/* Podium Display */}
      {finalLeaderboard.length === 0 ? (
        <div className="my-12 text-center p-8 bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300 font-bold">Compiling final rankings...</p>
        </div>
      ) : finalLeaderboard.length === 1 ? (
        /* Single Player Podium */
        <div className="flex flex-col items-center my-8 w-full max-w-sm mx-auto">
          <div className="text-6xl mb-2 animate-bounce">👑</div>
          <div className="text-3xl font-black text-amber-400 text-center truncate max-w-[280px]">
            {finalLeaderboard[0].nickname}
          </div>
          <div className="text-lg font-extrabold text-amber-300 mb-3">
            {finalLeaderboard[0].score.toLocaleString()} pts
          </div>
          <div className="w-full bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 rounded-3xl h-64 flex flex-col items-center justify-center font-black text-white border-t-4 border-yellow-200 shadow-2xl shadow-amber-500/40">
            <span className="text-6xl font-black">1st</span>
            <span className="text-xs uppercase tracking-widest font-black mt-2 text-amber-950 bg-yellow-300 px-3 py-1 rounded-full">
              Grand Champion
            </span>
          </div>
        </div>
      ) : (
        /* Multi-Player Podium Top 3 */
        <div className="flex items-end justify-center gap-4 sm:gap-8 my-8 w-full max-w-4xl">
          {/* 2nd Place */}
          {finalLeaderboard[1] && (
            <div className="flex flex-col items-center flex-1 max-w-[220px]">
              <div className="text-3xl mb-2">🥈</div>
              <div className="text-lg font-black text-slate-200 text-center truncate w-full">
                {finalLeaderboard[1].nickname}
              </div>
              <div className="text-sm font-bold text-slate-400 mb-2">
                {finalLeaderboard[1].score.toLocaleString()} pts
              </div>
              <div className="w-full bg-slate-700/80 rounded-t-3xl h-44 flex flex-col items-center justify-center font-black text-slate-300 border-t-4 border-slate-400 shadow-2xl">
                <span className="text-4xl">2nd</span>
                <span className="text-xs uppercase tracking-wider font-bold mt-1 text-slate-400">Runner Up</span>
              </div>
            </div>
          )}

          {/* 1st Place (Champion) */}
          {finalLeaderboard[0] && (
            <div className="flex flex-col items-center flex-1 max-w-[240px]">
              <div className="text-5xl mb-2 animate-bounce">👑</div>
              <div className="text-2xl font-black text-amber-400 text-center truncate w-full">
                {finalLeaderboard[0].nickname}
              </div>
              <div className="text-base font-extrabold text-amber-300 mb-2">
                {finalLeaderboard[0].score.toLocaleString()} pts
              </div>
              <div className="w-full bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-3xl h-60 flex flex-col items-center justify-center font-black text-white border-t-4 border-amber-300 shadow-2xl shadow-amber-500/30">
                <span className="text-5xl font-black">1st</span>
                <span className="text-xs uppercase tracking-wider font-bold mt-1 text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-full">
                  Champion
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {finalLeaderboard[2] && (
            <div className="flex flex-col items-center flex-1 max-w-[220px]">
              <div className="text-3xl mb-2">🥉</div>
              <div className="text-lg font-black text-amber-600 text-center truncate w-full">
                {finalLeaderboard[2].nickname}
              </div>
              <div className="text-sm font-bold text-slate-400 mb-2">
                {finalLeaderboard[2].score.toLocaleString()} pts
              </div>
              <div className="w-full bg-amber-900/60 rounded-t-3xl h-36 flex flex-col items-center justify-center font-black text-amber-500 border-t-4 border-amber-700 shadow-2xl">
                <span className="text-3xl">3rd</span>
                <span className="text-xs uppercase tracking-wider font-bold mt-1 text-amber-400">Podium</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hall of Fame List of Competitors According to Rank */}
      <footer className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
        <h3 className="text-base font-black text-amber-400 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5" />
          CoderCorps Hall of Fame Standings
        </h3>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {finalLeaderboard.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4">No final scores recorded.</p>
          ) : (
            finalLeaderboard.map((player) => (
              <div
                key={player.participant_id}
                className={`flex items-center justify-between px-5 py-3 rounded-2xl border transition ${
                  player.rank === 1
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                    : player.rank === 2
                    ? 'bg-slate-300/15 border-slate-400/50 text-slate-200'
                    : player.rank === 3
                    ? 'bg-amber-700/15 border-amber-700/50 text-amber-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-black text-lg w-8 text-center">
                    {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                  </span>
                  <span className="font-extrabold text-lg text-white">{player.nickname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xl text-amber-400">
                    {player.score.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase">pts</span>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-slate-400 mt-5">
          Congratulations to all {finalLeaderboard.length || participantCount} live competitors!
        </p>
      </footer>
    </main>
  );
}
