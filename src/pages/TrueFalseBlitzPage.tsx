import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../services/api';

// ─── Questions ───────────────────────────────────────────────────────────────

interface Question {
  q: string;
  answer: boolean; // true = Vrai, false = Faux
  feedback: string;
}

const QUESTIONS: Question[] = [
  {
    q: "Le multitasking augmente la productivité.",
    answer: false,
    feedback: "Il fragmente l'attention et augmente la fatigue cognitive.",
  },
  {
    q: "Fixer une deadline courte améliore la concentration.",
    answer: true,
    feedback: "C'est la Loi de Parkinson en action !",
  },
  {
    q: "Plus on a de temps, plus le travail sera de qualité.",
    answer: false,
    feedback: "Plus de temps = plus d'étalement, pas plus de qualité.",
  },
  {
    q: "Le cerveau peut maintenir une pleine concentration pendant plus de 3h d'affilée.",
    answer: false,
    feedback: "La pleine concentration ne dure qu'environ 90 minutes.",
  },
  {
    q: "Prendre des pauses régulières améliore la productivité globale.",
    answer: true,
    feedback: "Les pauses régénèrent la concentration et réduisent les erreurs.",
  },
  {
    q: "Estimer son temps avant une tâche aide à finir plus vite.",
    answer: true,
    feedback: "Un cadre temporel clair active la Loi de Parkinson positivement.",
  },
  {
    q: "Le perfectionnisme est toujours bénéfique à la performance.",
    answer: false,
    feedback: "Il génère souvent blocage, anxiété et procrastination.",
  },
  {
    q: "Écrire ses tâches dans une liste réduit la charge mentale.",
    answer: true,
    feedback: "Elle libère la mémoire de travail pour se concentrer sur l'action.",
  },
  {
    q: "Commencer par la tâche la plus difficile est toujours une mauvaise stratégie.",
    answer: false,
    feedback: "\"Eat the frog\" : finir le plus dur en premier libère l'esprit.",
  },
  {
    q: "La Loi de Parkinson dit que le travail s'étend pour occuper tout le temps disponible.",
    answer: true,
    feedback: "C'est la définition exacte. Tu connais ta loi !",
  },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const TIMER_DURATION = 5;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface AnswerRecord {
  correct: boolean;
  timeUsed: number;
  answered: boolean; // false = timed out
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrueFalseBlitzPage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'playing' | 'results'>('playing');
  const [currentQ, setCurrentQ] = useState(0);
  const [quizTimer, setQuizTimer] = useState(TIMER_DURATION);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [xpAwarded, setXpAwarded] = useState(0);

  const hasAnsweredRef = useRef(false);
  const questionStartTimeRef = useRef(Date.now());
  const correctCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Start question ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    hasAnsweredRef.current = false;
    questionStartTimeRef.current = Date.now();
    setQuizTimer(TIMER_DURATION);

    intervalRef.current = setInterval(() => {
      setQuizTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      if (hasAnsweredRef.current) return;
      hasAnsweredRef.current = true;
      clearInterval(intervalRef.current);
      setAnswers((prev) => [...prev, { correct: false, timeUsed: TIMER_DURATION, answered: false }]);
      setShowFeedback(true);
    }, TIMER_DURATION * 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, phase]);

  // ── Auto-advance after feedback ───────────────────────────────────────────
  useEffect(() => {
    if (!showFeedback) return;
    const t = setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      setQuizTimer(TIMER_DURATION);
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ((q) => q + 1);
      } else {
        // Award all earned XP in one API call
        const totalPoints = correctCountRef.current * 10;
        if (totalPoints > 0) {
          api.post('/award-points', { points: totalPoints }).catch(console.error);
        }
        setXpAwarded(totalPoints);
        setPhase('results');
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [showFeedback, currentQ]);

  const handleAnswer = (answer: boolean) => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    const timeUsed = Math.min(
      TIMER_DURATION,
      parseFloat(((Date.now() - questionStartTimeRef.current) / 1000).toFixed(1)),
    );
    const correct = answer === QUESTIONS[currentQ].answer;
    if (correct) correctCountRef.current++;
    setSelectedAnswer(answer);
    setAnswers((prev) => [...prev, { correct, timeUsed, answered: true }]);
    setShowFeedback(true);
  };

  const resetGame = () => {
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    setPhase('playing');
    setCurrentQ(0);
    setAnswers([]);
    setShowFeedback(false);
    setSelectedAnswer(null);
    setQuizTimer(TIMER_DURATION);
    setXpAwarded(0);
    hasAnsweredRef.current = false;
    correctCountRef.current = 0;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — Playing
  // ══════════════════════════════════════════════════════════════════════════

  if (phase === 'playing') {
    const question = QUESTIONS[currentQ];
    const correctAnswerText = question.answer ? 'Vrai' : 'Faux';
    const userWasCorrect = selectedAnswer !== null && selectedAnswer === question.answer;
    const isTimeout = selectedAnswer === null && showFeedback;

    const timerColor =
      quizTimer >= 4 ? 'text-green-500' : quizTimer >= 2 ? 'text-orange-500' : 'text-red-500';
    const strokeHex =
      quizTimer >= 4 ? '#22c55e' : quizTimer >= 2 ? '#f97316' : '#ef4444';
    const strokeOffset = CIRCUMFERENCE * (1 - quizTimer / TIMER_DURATION);

    const feedbackBg = isTimeout
      ? 'bg-amber-50 border-amber-200'
      : userWasCorrect
      ? 'bg-green-50 border-green-200'
      : 'bg-red-50 border-red-200';
    const feedbackTextColor = isTimeout
      ? 'text-amber-800'
      : userWasCorrect
      ? 'text-green-700'
      : 'text-red-700';
    const feedbackIcon = isTimeout ? '⏰' : userWasCorrect ? '✅' : '❌';

    return (
      <Layout>
        <div className="flex flex-col gap-5 max-w-lg mx-auto pb-8">

          {/* Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs text-text-muted">
              <span className="font-semibold">Question {currentQ + 1} / {QUESTIONS.length}</span>
              <span>{answers.filter((a) => a.correct).length} ✅</span>
            </div>
            <div className="w-full bg-border-light rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentQ) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Giant circular timer */}
          <div className="flex justify-center" key={currentQ}>
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60" cy="60" r={RADIUS}
                  fill="none" stroke="#e5e7eb" strokeWidth="8"
                />
                <circle
                  cx="60" cy="60" r={RADIUS}
                  fill="none"
                  stroke={strokeHex}
                  strokeWidth="8"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
                />
              </svg>
              <div className="text-center z-10">
                <span className={`text-5xl font-bold leading-none ${timerColor} transition-colors duration-300`}>
                  {showFeedback ? '·' : quizTimer}
                </span>
                <p className="text-xs text-text-muted mt-1">sec</p>
              </div>
            </div>
          </div>

          {/* Question card */}
          <div className="bg-background-card rounded-card border border-border-light p-7 text-center min-h-[100px] flex items-center justify-center">
            <p className="text-xl font-bold text-text leading-relaxed">
              {question.q}
            </p>
          </div>

          {/* Answer buttons */}
          <div
            className={`grid grid-cols-2 gap-4 transition-opacity duration-200 ${
              showFeedback ? 'opacity-40 pointer-events-none' : 'opacity-100'
            }`}
          >
            <button
              onClick={() => handleAnswer(true)}
              className="py-7 rounded-card border-2 border-green-400 bg-green-50 text-green-700 font-bold text-2xl hover:bg-green-100 active:scale-95 transition-all"
            >
              ✅ Vrai
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="py-7 rounded-card border-2 border-red-400 bg-red-50 text-red-700 font-bold text-2xl hover:bg-red-100 active:scale-95 transition-all"
            >
              ❌ Faux
            </button>
          </div>

          {/* Feedback panel — slides in */}
          <div
            className={`rounded-card border p-4 transition-all duration-300 ${feedbackBg} ${
              showFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{feedbackIcon}</span>
                <div>
                  <p className={`font-bold text-sm ${feedbackTextColor}`}>
                    {isTimeout
                      ? `Temps écoulé — ${correctAnswerText}`
                      : `${correctAnswerText} — ${question.feedback}`}
                  </p>
                  {isTimeout && (
                    <p className="text-amber-700 text-xs mt-0.5">{question.feedback}</p>
                  )}
                </div>
              </div>
              {userWasCorrect && (
                <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                  +10 XP
                </span>
              )}
            </div>
          </div>

        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — Results / Debrief
  // ══════════════════════════════════════════════════════════════════════════

  const score = answers.filter((a) => a.correct).length;
  const answeredItems = answers.filter((a) => a.answered);
  const avgTime =
    answeredItems.length > 0
      ? (answeredItems.reduce((s, a) => s + a.timeUsed, 0) / answeredItems.length).toFixed(1)
      : TIMER_DURATION.toFixed(1);
  const scorePercent = Math.round((score / QUESTIONS.length) * 100);

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-5 pb-10">

        {/* Trophy header */}
        <div className="text-center pt-4 space-y-1">
          <div className="text-5xl">{scorePercent >= 80 ? '🏆' : scorePercent >= 50 ? '🎯' : '📚'}</div>
          <h1 className="text-2xl font-bold text-text">Débrief Blitz</h1>
        </div>

        {/* Big score */}
        <div className="bg-background-card rounded-card border border-border-light p-6 text-center">
          <p className="text-6xl font-bold text-primary">
            {score}
            <span className="text-3xl text-text-muted font-normal">/{QUESTIONS.length}</span>
          </p>
          <p className="text-text-muted text-sm mt-1">bonnes réponses</p>
          {xpAwarded > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-green-100 border border-green-300 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full">
              <span>⭐</span>
              <span>+{xpAwarded} XP gagnés</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
            <p className="text-2xl font-bold text-text">{avgTime}s</p>
            <p className="text-xs text-text-muted mt-1">Temps moyen / réponse</p>
          </div>
          <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
            <p className="text-2xl font-bold text-text">{scorePercent}%</p>
            <p className="text-xs text-text-muted mt-1">Taux de réussite</p>
          </div>
        </div>

        {/* Comparison insight */}
        <div className="bg-primary/5 border border-primary/20 rounded-card p-5">
          <p className="text-text text-sm leading-relaxed">
            Avec seulement <strong>5 secondes</strong> par question, tu as répondu juste à{' '}
            <strong>{scorePercent}%</strong> des questions.
          </p>
        </div>

        {/* Parkinson insight */}
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⏱️</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Loi de Parkinson appliquée</p>
              <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                Tu connaissais les réponses. La contrainte t'a empêché de procrastiner — et tu as
                prouvé que tu peux décider vite quand tu y es forcé.
              </p>
            </div>
          </div>
        </div>

        {/* Question review */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
            Revue des questions
          </h3>
          {QUESTIONS.map((q, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-card border text-sm ${
                answers[i]?.correct
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className="flex-shrink-0 mt-0.5">
                {answers[i]?.correct ? '✅' : '❌'}
              </span>
              <div>
                <p
                  className={`font-medium ${
                    answers[i]?.correct ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {q.q}
                </p>
                {!answers[i]?.correct && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Réponse : <strong>{q.answer ? 'Vrai' : 'Faux'}</strong> — {q.feedback}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={resetGame}
            className="flex-1 py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover transition-colors"
          >
            🔄 Rejouer
          </button>
          <button
            onClick={() => navigate('/parkinson')}
            className="flex-1 py-3 bg-background-card border border-border-light text-text rounded-button font-medium hover:border-primary transition-colors"
          >
            Retour aux défis
          </button>
        </div>
      </div>
    </Layout>
  );
}
