'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  QuestionStartedPayload,
  QuestionRevealPayload,
  SessionEndedPayload,
} from '@/types/quiz';
import { CheckCircle2, XCircle, Trophy, Sparkles, Loader2, Clock } from 'lucide-react';

export default function PlayPinPage() {
  const routeParams = useParams();
  const pin = (routeParams?.pin as string) || '';

  // Participant State
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('Live Quiz');

  // Game UI State
  const [status, setStatus] = useState<'joining' | 'lobby' | 'question' | 'answered' | 'reveal' | 'ended'>('joining');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current Question State
  const [currentQuestion, setCurrentQuestion] = useState<QuestionStartedPayload | null>(null);
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Reveal / Score State
  const [revealData, setRevealData] = useState<QuestionRevealPayload | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<{
    is_correct: boolean;
    points_awarded: number;
    new_total_score?: number;
  } | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<any[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize client token from localStorage
  useEffect(() => {
    let token = localStorage.getItem(`codercorps_quiz_token_${pin}`);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(`codercorps_quiz_token_${pin}`, token);
    }
    setClientToken(token);

    const savedNickname = localStorage.getItem(`codercorps_quiz_nick_${pin}`);
    if (savedNickname) {
      setNickname(savedNickname);
    }
  }, [pin]);

  // Join Session API call
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${pin}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          client_token: clientToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      setParticipantId(data.participant_id);
      setSessionId(data.session_id);
      setQuizTitle(data.quiz_title);
      setJoined(true);
      if (data.total_score !== undefined) {
        setTotalScore(data.total_score);
      }
      if (data.status === 'question') setStatus('question');
      else if (data.status === 'reveal') setStatus('reveal');
      else if (data.status === 'ended') setStatus('ended');
      else setStatus('lobby');
      localStorage.setItem(`codercorps_quiz_nick_${pin}`, nickname.trim());

      // If joining mid-game during question or reveal, fetch current state
      if (data.session_id && (data.status === 'question' || data.status === 'reveal')) {
        fetch(`/api/sessions/${data.session_id}`)
          .then((r) => r.json())
          .then((sData) => {
            if (sData.current_question && data.status === 'question') {
              const q = sData.current_question;
              setCurrentQuestion({
                question_index: sData.session.current_question_index,
                total_questions: sData.total_questions,
                question_id: q.id,
                question_text: q.question_text,
                options: {
                  a: q.option_a,
                  b: q.option_b,
                  c: q.option_c,
                  d: q.option_d,
                },
                time_limit_seconds: q.time_limit_seconds,
                started_at: sData.session.question_started_at || new Date().toISOString(),
              });
              const startMs = new Date(sData.session.question_started_at).getTime();
              const rem = Math.max(0, Math.ceil((q.time_limit_seconds * 1000 - (Date.now() - startMs)) / 1000));
              setTimeLeft(rem);
            }
            if (sData.reveal_data) {
              setRevealData(sData.reveal_data);
            }
          })
          .catch(console.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error joining quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subscribe to Realtime Broadcast channel when sessionId is set
  useEffect(() => {
    if (!sessionId) return;

    const supabase = getSupabaseClient();
    const channelName = `session:${sessionId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'question_started' }, (payload: { payload: QuestionStartedPayload }) => {
        const qData = payload.payload;
        setCurrentQuestion(qData);
        setSelectedOption(null);
        setLastAnswerResult(null);
        setRevealData(null);
        setStatus('question');

        // Local timer sync with server start time
        const startMs = new Date(qData.started_at).getTime();
        const durationMs = qData.time_limit_seconds * 1000;
        const nowMs = Date.now();
        const remainingSeconds = Math.max(0, Math.ceil((durationMs - (nowMs - startMs)) / 1000));
        setTimeLeft(remainingSeconds);
      })
      .on('broadcast', { event: 'question_reveal' }, (payload: { payload: QuestionRevealPayload }) => {
        const rData = payload.payload;
        setRevealData(rData);
        setStatus('reveal');

        // Find own rank if in top 10
        if (participantId && rData.leaderboard_top10) {
          const entry = rData.leaderboard_top10.find((e) => e.participant_id === participantId);
          if (entry) {
            setCurrentRank(entry.rank);
            setTotalScore(entry.score);
          }
        }
      })
      .on('broadcast', { event: 'session_ended' }, (payload: { payload: SessionEndedPayload }) => {
        setStatus('ended');
        const endData = payload.payload;
        setFinalLeaderboard(endData.final_leaderboard || []);
        if (participantId && endData.final_leaderboard) {
          const entry = endData.final_leaderboard.find((e) => e.participant_id === participantId);
          if (entry) {
            setCurrentRank(entry.rank);
            setTotalScore(entry.score);
          }
        }
      })
      .subscribe((subStatus) => {
        if (subStatus === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for session:', sessionId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, participantId]);

  // Countdown timer effect
  useEffect(() => {
    if (status !== 'question') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('answered');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Submit Answer via normal POST API route (Section 2 & 5: No realtime flood)
  const handleSelectOption = async (option: 'a' | 'b' | 'c' | 'd') => {
    if (!currentQuestion || !sessionId || !participantId || selectedOption || isSubmitting) return;

    setSelectedOption(option);
    setStatus('answered');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.question_id,
          participant_id: participantId,
          client_token: clientToken,
          selected_option: option,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLastAnswerResult({
          is_correct: data.is_correct,
          points_awarded: data.points_awarded,
          new_total_score: data.new_total_score,
        });
        if (data.new_total_score !== undefined) {
          setTotalScore(data.new_total_score);
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Join / Nickname Screen
  if (!joined) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              Game PIN: {pin}
            </span>
            <h1 className="text-2xl font-black text-white">Join Live Game</h1>
            <p className="text-sm text-slate-400 mt-1">Pick a nickname to display on screen</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your Nickname"
              className="w-full text-center text-xl font-bold px-4 py-4 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:border-transparent transition"
              autoFocus
              required
            />

            <button
              type="submit"
              disabled={!nickname.trim() || isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 font-bold text-lg text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <span>Ready to Play!</span>
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 2. Lobby Screen (Waiting for Host to start)
  if (status === 'lobby') {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-1">{nickname}</h2>
          <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-semibold rounded-full mb-6">
            Connected to {quizTitle}
          </span>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 w-full mb-4">
            <p className="text-base font-semibold text-slate-200">You&apos;re in!</p>
            <p className="text-xs text-slate-400 mt-1">See your nickname on the big host display screen.</p>
          </div>

          <p className="text-xs text-slate-500 animate-pulse flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Waiting for host to start the first question...
          </p>
        </div>
      </main>
    );
  }

  // 3a. Question Answering Screen (Shapes Only - Kahoot style)
  if (status === 'question') {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col justify-between p-3 sm:p-4 text-white select-none">
        {/* Top Header: Timer and Question Index */}
        <header className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 mb-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              Q{currentQuestion?.question_index} of {currentQuestion?.total_questions}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full font-black text-sm transition-all ${
              timeLeft <= 5 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-amber-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-indigo-400">{totalScore} pts</span>
          </div>
        </header>

        {/* Guidance Prompt for Mobile Player */}
        <div className="text-center py-1 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Look up at the screen to read question &amp; options
          </span>
        </div>

        {/* 4 Large Kahoot-Style Shape Buttons (No option text) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 pb-2">
          {/* Option A - Red Triangle */}
          <button
            onClick={() => handleSelectOption('a')}
            disabled={isSubmitting || timeLeft === 0}
            aria-label="Option A (Triangle)"
            className="rounded-3xl flex flex-col items-center justify-center transition-all duration-150 shadow-2xl active:scale-95 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 cursor-pointer disabled:opacity-50"
          >
            <span className="text-6xl sm:text-7xl font-black drop-shadow-md leading-none">▲</span>
          </button>

          {/* Option B - Blue Diamond */}
          <button
            onClick={() => handleSelectOption('b')}
            disabled={isSubmitting || timeLeft === 0}
            aria-label="Option B (Diamond)"
            className="rounded-3xl flex flex-col items-center justify-center transition-all duration-150 shadow-2xl active:scale-95 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 cursor-pointer disabled:opacity-50"
          >
            <span className="text-6xl sm:text-7xl font-black drop-shadow-md leading-none">◆</span>
          </button>

          {/* Option C - Yellow Circle */}
          <button
            onClick={() => handleSelectOption('c')}
            disabled={isSubmitting || timeLeft === 0}
            aria-label="Option C (Circle)"
            className="rounded-3xl flex flex-col items-center justify-center transition-all duration-150 shadow-2xl active:scale-95 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 cursor-pointer disabled:opacity-50"
          >
            <span className="text-6xl sm:text-7xl font-black drop-shadow-md leading-none">●</span>
          </button>

          {/* Option D - Green Square */}
          <button
            onClick={() => handleSelectOption('d')}
            disabled={isSubmitting || timeLeft === 0}
            aria-label="Option D (Square)"
            className="rounded-3xl flex flex-col items-center justify-center transition-all duration-150 shadow-2xl active:scale-95 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 cursor-pointer disabled:opacity-50"
          >
            <span className="text-6xl sm:text-7xl font-black drop-shadow-md leading-none">■</span>
          </button>
        </div>
      </main>
    );
  }

  // 3b. Answer Selected / Waiting Loader Screen
  if (status === 'answered') {
    const optionMeta: Record<string, { label: string; shape: string; color: string; border: string; bg: string }> = {
      a: { label: 'Option A', shape: '▲', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10' },
      b: { label: 'Option B', shape: '◆', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10' },
      c: { label: 'Option C', shape: '●', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
      d: { label: 'Option D', shape: '■', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
    };

    const chosen = selectedOption ? optionMeta[selectedOption] : null;

    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          {/* Animated Loader */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-1.5">Choice Locked In!</h2>
          <p className="text-sm text-slate-400 mb-6">
            Waiting for host to reveal the answer...
          </p>

          {/* Player Choice Summary Badge */}
          {chosen ? (
            <div className={`w-full p-4 rounded-2xl border ${chosen.border} ${chosen.bg} mb-6 flex items-center justify-center gap-3 shadow-lg`}>
              <span className={`text-4xl font-black ${chosen.color}`}>{chosen.shape}</span>
              <div className="text-left">
                <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">Your Selection</span>
                <span className="text-lg font-black text-white">{chosen.label}</span>
              </div>
            </div>
          ) : (
            <div className="w-full p-4 rounded-2xl border border-slate-700 bg-slate-800/60 mb-6 text-slate-400 text-sm">
              Time elapsed — waiting for reveal
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/70 border border-indigo-800/50 px-4 py-2.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>Answers will show when admin clicks Reveal</span>
          </div>
        </div>
      </main>
    );
  }

  // 4. Reveal Screen (Feedback & Displays Answers to All Competitors)
  if (status === 'reveal') {
    const isCorrect = lastAnswerResult?.is_correct ?? false;
    const points = lastAnswerResult?.points_awarded ?? 0;
    const correctOpt = revealData?.correct_option || 'a';
    const activeQuestion = currentQuestion || (revealData ? {
      question_text: revealData.question_text,
      options: revealData.options,
    } : null);

    const optionMeta: Record<string, { label: string; shape: string; color: string; border: string; bg: string }> = {
      a: { label: 'Option A', shape: '▲', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10' },
      b: { label: 'Option B', shape: '◆', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10' },
      c: { label: 'Option C', shape: '●', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
      d: { label: 'Option D', shape: '■', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
    };

    const correctDetails = optionMeta[correctOpt];
    const correctText = activeQuestion?.options?.[correctOpt];
    const userSelectedDetails = selectedOption ? optionMeta[selectedOption] : null;
    const didAnswer = selectedOption !== null;

    return (
      <main
        className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center transition-colors duration-500 ${
          isCorrect ? 'bg-emerald-950/80' : didAnswer ? 'bg-rose-950/80' : 'bg-slate-950'
        }`}
      >
        <div className="w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-8 backdrop-blur-md bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center">
          {/* Result Icon Banner */}
          {isCorrect ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-3 text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          ) : didAnswer ? (
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center mb-3 text-rose-400">
              <XCircle className="w-12 h-12" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mb-3 text-amber-400">
              <Clock className="w-12 h-12" />
            </div>
          )}

          <h2 className="text-3xl font-black mb-1">
            {isCorrect ? 'Awesome! Correct!' : didAnswer ? 'Incorrect' : 'Time Ran Out!'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mb-5">
            {isCorrect ? 'Speed bonus applied!' : didAnswer ? 'Better luck next question!' : 'No answer submitted in time.'}
          </p>

          {/* Prominent Correct Answer Display (Shown to ALL competitors) */}
          <div className="w-full bg-emerald-500/15 border-2 border-emerald-500/50 rounded-2xl p-4 mb-4 text-left shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Correct Answer
              </span>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                {correctDetails?.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-emerald-400 flex-shrink-0">
                {correctDetails?.shape}
              </span>
              <span className="text-base sm:text-lg font-black text-white leading-snug">
                {correctText || `Option ${correctOpt.toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* If user answered wrong, show what they selected vs correct */}
          {!isCorrect && didAnswer && userSelectedDetails && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 mb-4 text-left flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-bold text-rose-400">{userSelectedDetails.shape}</span>
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">Your Selection</span>
                  <span className="text-sm font-bold text-rose-200">
                    {userSelectedDetails.label}
                    {activeQuestion?.options?.[selectedOption] ? `: ${activeQuestion.options[selectedOption]}` : ''}
                  </span>
                </div>
              </div>
              <span className="text-rose-400 text-xs font-bold px-2 py-1 bg-rose-500/20 rounded-lg">Wrong</span>
            </div>
          )}

          {/* Round Points & Total Score */}
          <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 mb-4">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400">Round Points</span>
              <span className={`text-lg font-black ${isCorrect ? 'text-emerald-400' : 'text-slate-400'}`}>
                +{points}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400">Total Score</span>
              <span className="text-xl font-black text-amber-400">{totalScore.toLocaleString()} pts</span>
            </div>
          </div>

          {currentRank && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 font-bold text-sm mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Current Rank: #{currentRank}</span>
            </div>
          )}

          <p className="text-xs text-slate-400 animate-pulse">
            Waiting for host to continue...
          </p>
        </div>
      </main>
    );
  }

  // 5. Final Screen (Session Ended)
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <Trophy className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-black text-white mb-1">Quiz Completed!</h1>
        <p className="text-sm text-slate-400 mb-6">{quizTitle}</p>

        <div className="w-full bg-slate-800/80 rounded-2xl p-5 border border-slate-700 mb-6 space-y-3">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Your Final Score</span>
            <div className="text-3xl font-black text-amber-400 mt-0.5">{totalScore}</div>
          </div>
          {currentRank && (
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Final Rank</span>
              <div className="text-2xl font-black text-indigo-400 mt-0.5">#{currentRank}</div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Thanks for participating with CoderCorps!
        </p>
      </div>
    </main>
  );
}
