'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  HelpCircle,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight,
  Clock,
  Award,
  CheckCircle,
  Copy,
  LogOut,
  Loader2,
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  question_count: number;
  created_at: string;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  time_limit_seconds: number;
  points_base: number;
  order_index: number;
}

export default function AdminQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Quiz for Questions Management
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // New Quiz Modal
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // New Question Modal
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState<'a' | 'b' | 'c' | 'd'>('a');
  const [timeLimit, setTimeLimit] = useState(20);
  const [pointsBase, setPointsBase] = useState(1000);

  // Launch Session Success Modal
  const [launchedSession, setLaunchedSession] = useState<{
    id: string;
    pin: string;
    quiz_title: string;
  } | null>(null);

  // Fetch quizzes
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (res.ok) {
        setQuizzes(data.quizzes || []);
        if (data.quizzes && data.quizzes.length > 0 && !selectedQuiz) {
          selectQuiz(data.quizzes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Fetch questions for a quiz
  const selectQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to load questions:', errData.error || res.statusText);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Create Quiz
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowNewQuizModal(false);
        setNewTitle('');
        setNewDesc('');
        await fetchQuizzes();
        if (data.quiz) {
          selectQuiz({ ...data.quiz, question_count: 0 });
        }
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
    }
  };

  // Create Question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz || !qText.trim() || !optA || !optB || !optC || !optD) return;

    try {
      const res = await fetch(`/api/quizzes/${selectedQuiz.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: qText.trim(),
          option_a: optA.trim(),
          option_b: optB.trim(),
          option_c: optC.trim(),
          option_d: optD.trim(),
          correct_option: correctOpt,
          time_limit_seconds: timeLimit,
          points_base: pointsBase,
        }),
      });

      if (res.ok) {
        setShowNewQuestionModal(false);
        setQText('');
        setOptA('');
        setOptB('');
        setOptC('');
        setOptD('');
        setCorrectOpt('a');
        setTimeLimit(20);
        // refresh questions
        selectQuiz(selectedQuiz);
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Error creating question:', err);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedQuiz || !confirm('Are you sure you want to delete this question?')) return;

    try {
      const res = await fetch(`/api/quizzes/${selectedQuiz.id}/questions?question_id=${questionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        selectQuiz(selectedQuiz);
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  // Launch Live Session
  const handleLaunchSession = async (quiz: Quiz) => {
    if (quiz.question_count === 0 && questions.length === 0) {
      alert('Please add at least 1 question to this quiz before launching a live session!');
      return;
    }

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quiz.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start session');
        return;
      }

      setLaunchedSession({
        id: data.session.id,
        pin: data.session.pin,
        quiz_title: quiz.title,
      });
    } catch (err) {
      console.error('Error launching session:', err);
    }
  };

  // Seed Sample Tech Trivia Questions
  const handleSeedSampleQuiz = async () => {
    try {
      // 1. Create Sample Quiz
      const qRes = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'CoderCorps Tech Trivia 2026',
          description: 'Fun web dev & cloud engineering trivia for live audience',
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) return;

      const sampleQuizId = qData.quiz.id;

      const sampleQuestions = [
        {
          question_text: 'What does "Next.js App Router" use by default for React components?',
          option_a: 'Client Components',
          option_b: 'React Server Components',
          option_c: 'WebAssembly Modules',
          option_d: 'Static HTML only',
          correct_option: 'b',
          time_limit_seconds: 20,
          points_base: 1000,
        },
        {
          question_text: 'Which transport protocol powers Supabase Realtime Broadcast channels?',
          option_a: 'HTTP Long Polling',
          option_b: 'gRPC Web',
          option_c: 'WebSockets (Phoenix Channels)',
          option_d: 'Server-Sent Events (SSE)',
          correct_option: 'c',
          time_limit_seconds: 20,
          points_base: 1000,
        },
        {
          question_text: 'In JavaScript, what is the type of NaN?',
          option_a: 'undefined',
          option_b: 'number',
          option_c: 'object',
          option_d: 'NaN',
          correct_option: 'b',
          time_limit_seconds: 15,
          points_base: 1000,
        },
        {
          question_text: 'What database engine powers Supabase under the hood?',
          option_a: 'PostgreSQL',
          option_b: 'MongoDB',
          option_c: 'MySQL',
          option_d: 'SQLite',
          correct_option: 'a',
          time_limit_seconds: 15,
          points_base: 1000,
        },
      ];

      for (const sq of sampleQuestions) {
        await fetch(`/api/quizzes/${sampleQuizId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sq),
        });
      }

      await fetchQuizzes();
      selectQuiz({ ...qData.quiz, question_count: sampleQuestions.length });
    } catch (err) {
      console.error('Failed to seed sample quiz:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/25">
            CC
          </div>
          <div>
            <h1 className="text-xl font-black">CoderCorps Live Quizzes</h1>
            <p className="text-xs text-slate-400">Admin Studio &amp; Question Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedSampleQuiz}
            className="px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-bold flex items-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Load Sample Quiz</span>
          </button>

          <button
            onClick={() => setShowNewQuizModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Quiz</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('codercorps_admin_auth');
              router.push('/admin/login');
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Layout: Quizzes List Sidebar + Selected Quiz Questions */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Quizzes List */}
        <aside className="w-full md:w-80 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto space-y-2">
          <div className="flex justify-between items-center px-2 py-1 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Quizzes ({quizzes.length})
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading quizzes...</span>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No quizzes created yet.</p>
              <button
                onClick={handleSeedSampleQuiz}
                className="mt-3 text-xs text-indigo-400 hover:underline font-bold"
              >
                + Create or Load Sample Quiz
              </button>
            </div>
          ) : (
            quizzes.map((quiz) => {
              const isSelected = selectedQuiz?.id === quiz.id;
              return (
                <div
                  key={quiz.id}
                  onClick={() => selectQuiz(quiz)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-base leading-snug">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1">{quiz.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {quiz.question_count} Questions
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchSession(quiz);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30 transition active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Host</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        {/* Right Main Panel: Questions for Selected Quiz */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950">
          {selectedQuiz ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Quiz Banner & Launch Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                      Selected Quiz
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{selectedQuiz.title}</h2>
                  <p className="text-sm text-slate-400 mt-1">{selectedQuiz.description || 'No description provided'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNewQuestionModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>

                  <button
                    onClick={() => handleLaunchSession(selectedQuiz)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch Live Session</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-400" />
                    Questions ({questions.length})
                  </h3>
                </div>

                {loadingQuestions ? (
                  <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading questions...</span>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <p className="text-sm text-slate-400 font-medium">This quiz has no questions yet.</p>
                    <button
                      onClick={() => setShowNewQuestionModal(true)}
                      className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      + Add First Question
                    </button>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 transition hover:border-slate-700"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-base text-white leading-snug">
                            {q.question_text}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {q.time_limit_seconds}s
                          </span>
                          <span className="text-xs text-amber-400 flex items-center gap-1 font-semibold">
                            <Award className="w-3.5 h-3.5" />
                            {q.points_base} pts
                          </span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-slate-800"
                            title="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          q.correct_option === 'a'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                        }`}>
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-rose-600 text-white text-[11px] font-black flex items-center justify-center">▲</span>
                            <span>{q.option_a}</span>
                          </span>
                          {q.correct_option === 'a' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          q.correct_option === 'b'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                        }`}>
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">◆</span>
                            <span>{q.option_b}</span>
                          </span>
                          {q.correct_option === 'b' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          q.correct_option === 'c'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                        }`}>
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">●</span>
                            <span>{q.option_c}</span>
                          </span>
                          {q.correct_option === 'c' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          q.correct_option === 'd'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                        }`}>
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">■</span>
                            <span>{q.option_d}</span>
                          </span>
                          {q.correct_option === 'd' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-24">
              <Layers className="w-12 h-12 mb-3 text-slate-700" />
              <p className="text-base font-bold text-slate-400">Select or create a quiz from the left sidebar</p>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Create Quiz */}
      {showNewQuizModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-white mb-4">Create New Quiz</h3>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quiz Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Next.js & React Mastery"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description (Optional)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description for attendees..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewQuizModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black shadow-lg shadow-indigo-600/30"
                >
                  Create Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Question */}
      {showNewQuestionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl my-8">
            <h3 className="text-xl font-black text-white mb-4">Add Question</h3>
            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question Text</label>
                <input
                  type="text"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="e.g. Which hook is used to manage local state in React?"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                  autoFocus
                  required
                />
              </div>

              {/* 4 Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                    ▲ Option A
                  </label>
                  <input
                    type="text"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Option A text"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                    ◆ Option B
                  </label>
                  <input
                    type="text"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Option B text"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    ● Option C
                  </label>
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    placeholder="Option C text"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    ■ Option D
                  </label>
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    placeholder="Option D text"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Correct Option Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Correct Answer
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCorrectOpt(opt)}
                      className={`py-2 rounded-xl text-sm font-black uppercase transition border ${
                        correctOpt === opt
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 20)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Base Points
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={5000}
                    step={100}
                    value={pointsBase}
                    onChange={(e) => setPointsBase(parseInt(e.target.value) || 1000)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewQuestionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black shadow-lg shadow-indigo-600/30"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Session Launched Success */}
      {launchedSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Session Live</span>
              <h3 className="text-2xl font-black text-white mt-1">{launchedSession.quiz_title}</h3>
              <p className="text-sm text-slate-400 mt-1">Live PIN generated and waiting for players</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">
                Game PIN for Players
              </span>
              <span className="text-5xl font-black text-amber-400 font-mono tracking-widest">
                {launchedSession.pin}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`/host/${launchedSession.id}`}
                target="_blank"
                rel="noreferrer"
                className="py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Big Screen Display</span>
              </a>

              <a
                href={`/admin/sessions/${launchedSession.id}/control`}
                className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Open Controller</span>
              </a>
            </div>

            <button
              onClick={() => setLaunchedSession(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close dialog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
