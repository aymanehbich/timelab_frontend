import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import useParkinson from '../hooks/useParkinson';
import challengeTypes from '../data/challengeTypes';
import type { ChallengeType } from '../data/challengeTypes';

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; button: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    text: 'text-blue-500',
    badge: 'bg-blue-500/20 text-blue-400',
    button: 'bg-blue-500 hover:bg-blue-600',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30 hover:border-green-500/60',
    text: 'text-green-500',
    badge: 'bg-green-500/20 text-green-400',
    button: 'bg-green-500 hover:bg-green-600',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    text: 'text-purple-500',
    badge: 'bg-purple-500/20 text-purple-400',
    button: 'bg-purple-500 hover:bg-purple-600',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30 hover:border-orange-500/60',
    text: 'text-orange-500',
    badge: 'bg-orange-500/20 text-orange-400',
    button: 'bg-orange-500 hover:bg-orange-600',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30 hover:border-red-500/60',
    text: 'text-red-500',
    badge: 'bg-red-500/20 text-red-400',
    button: 'bg-red-500 hover:bg-red-600',
  },
};

const difficultyColor: Record<string, string> = {
  'Facile': 'bg-green-500/20 text-green-400',
  'Moyen': 'bg-yellow-500/20 text-yellow-400',
  'Difficile': 'bg-red-500/20 text-red-400',
};

function ChallengeTypeCard({ type }: { type: ChallengeType }) {
  const navigate = useNavigate();
  const colors = colorMap[type.color] ?? colorMap['blue'];

  return (
    <div
      className={`bg-background-card rounded-card border ${colors.border} transition-all duration-200 p-6 flex flex-col cursor-pointer group`}
      onClick={() => navigate(`/parkinson/${type.slug}`)}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center text-3xl flex-shrink-0`}>
          {type.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-text group-hover:text-primary transition-colors">
            {type.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[type.difficulty]}`}>
              {type.difficulty}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
              ⏱ {type.estimatedTime}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-text-muted flex-1 mb-6 leading-relaxed">
        {type.description}
      </p>

      <button
        className={`w-full py-2.5 rounded-button text-white text-sm font-medium ${colors.button} transition-colors`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/parkinson/${type.slug}`);
        }}
      >
        Commencer ce défi
      </button>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUIZ_DURATION = 5;
const CIRCUMFERENCE = 2 * Math.PI * 34; // r=34

// ─── Main component ──────────────────────────────────────────────────────────

export default function ParkinsonHub() {
  const { stats } = useParkinson();

  const [mode, setMode] = useState<'choice' | 'learn' | 'play'>('choice');
  const [learnStep, setLearnStep] = useState<number>(1);
  const [quizAnswer, setQuizAnswer] = useState<'vrai' | 'faux' | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizTimer, setQuizTimer] = useState(QUIZ_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Start countdown timer when quiz step appears
  useEffect(() => {
    if (mode !== 'learn' || learnStep !== 2 || quizRevealed) return;
    setQuizTimer(QUIZ_DURATION);
    timerRef.current = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setQuizRevealed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, learnStep]);

  const handleQuizAnswer = (answer: 'vrai' | 'faux') => {
    if (quizRevealed) return;
    clearInterval(timerRef.current);
    setQuizAnswer(answer);
    setQuizRevealed(true);
  };

  const goToPlay = () => setMode('play');

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — Choice screen
  // ══════════════════════════════════════════════════════════════════════════

  if (mode === 'choice') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-10">
          <div className="text-center max-w-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-5">
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="text-3xl font-bold text-text mb-3">Loi de Parkinson</h1>
            <p className="text-text-muted text-base leading-relaxed">
              "Le travail s'étale pour occuper tout le temps disponible."
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
            {/* Understand first */}
            <button
              onClick={() => { setMode('learn'); setLearnStep(1); setQuizAnswer(null); setQuizRevealed(false); }}
              className="bg-background-card border-2 border-border-light rounded-card p-7 text-left hover:border-primary hover:shadow-lg transition-all group"
            >
              <span className="text-4xl mb-4 block">📘</span>
              <h3 className="font-bold text-text text-lg mb-2 group-hover:text-primary transition-colors">
                Comprendre avant de jouer
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Découvre la loi en 60 secondes avec une mini-interaction.
              </p>
            </button>

            {/* Jump straight in */}
            <button
              onClick={goToPlay}
              className="bg-primary/5 border-2 border-primary/30 rounded-card p-7 text-left hover:border-primary hover:shadow-lg transition-all group"
            >
              <span className="text-4xl mb-4 block">⚡</span>
              <h3 className="font-bold text-text text-lg mb-2 group-hover:text-primary transition-colors">
                Me tester directement
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Plonge directement dans les défis.
              </p>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — Learn flow
  // ══════════════════════════════════════════════════════════════════════════

  if (mode === 'learn') {

    // ── Step 1: Hook ───────────────────────────────────────────────────────
    if (learnStep === 1) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-lg mx-auto text-center space-y-10">
            <div className="space-y-4">
              <div className="text-7xl">⏱️</div>
              <p className="text-2xl font-bold text-text leading-relaxed">
                "Tu as 10 minutes pour répondre à un mail…
              </p>
              <p className="text-2xl font-bold text-primary leading-relaxed">
                Pourquoi tu prends toujours 10 minutes ?"
              </p>
            </div>
            <button
              onClick={() => setLearnStep(2)}
              className="px-10 py-3.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover transition-colors text-lg"
            >
              Je veux comprendre →
            </button>
          </div>
        </Layout>
      );
    }

    // ── Step 2: Quiz ───────────────────────────────────────────────────────
    if (learnStep === 2) {
      const timerOffset = CIRCUMFERENCE * (quizTimer / QUIZ_DURATION);

      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-lg mx-auto space-y-8">

            {!quizRevealed ? (
              <>
                <div className="text-center space-y-3">
                  <p className="text-xs text-text-muted uppercase tracking-widest font-semibold">
                    Vrai ou Faux ?
                  </p>
                  <h2 className="text-xl font-bold text-text">
                    "Si j'ai plus de temps, je travaille mieux."
                  </h2>
                </div>

                {/* Countdown ring */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none" stroke="currentColor"
                      className="text-border-light"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none" stroke="currentColor"
                      className="text-primary transition-all duration-1000"
                      strokeWidth="6"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE - timerOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-2xl font-bold text-text">{quizTimer}</span>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => handleQuizAnswer('vrai')}
                    className="flex-1 py-5 rounded-card border-2 border-green-400 bg-green-50 text-green-700 font-bold text-lg hover:bg-green-100 transition-colors"
                  >
                    ✅ Vrai
                  </button>
                  <button
                    onClick={() => handleQuizAnswer('faux')}
                    className="flex-1 py-5 rounded-card border-2 border-red-400 bg-red-50 text-red-700 font-bold text-lg hover:bg-red-100 transition-colors"
                  >
                    ❌ Faux
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-5 w-full">
                {/* Result banner */}
                {quizAnswer === null ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-card p-5 text-center">
                    <p className="text-3xl mb-2">⏰</p>
                    <p className="font-bold text-amber-800 text-base">Temps écoulé !</p>
                    <p className="text-amber-700 text-sm mt-1">Tu n'as pas répondu à temps.</p>
                  </div>
                ) : quizAnswer === 'faux' ? (
                  <div className="bg-green-50 border border-green-200 rounded-card p-5 text-center">
                    <p className="text-3xl mb-2">🎯</p>
                    <p className="font-bold text-green-700 text-base">Bonne réponse !</p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-card p-5 text-center">
                    <p className="text-3xl mb-2">❌</p>
                    <p className="font-bold text-red-700 text-base">Faux.</p>
                    <p className="text-red-600 text-sm mt-1">Plus de temps = plus d'étalement.</p>
                  </div>
                )}

                {/* Insight */}
                <div className="bg-primary/5 border border-primary/20 rounded-card p-5">
                  <p className="text-text font-medium text-base text-center">
                    👉 Tu viens déjà d'appliquer la Loi de Parkinson sans le savoir.
                  </p>
                  <p className="text-text-muted text-sm mt-3 leading-relaxed text-center">
                    En hésitant, tu as laissé ta réflexion s'étirer pour remplir les 5 secondes disponibles.
                    C'est exactement ce que fait ton cerveau avec toutes tes tâches.
                  </p>
                </div>

                <button
                  onClick={() => setLearnStep(3)}
                  className="w-full py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover transition-colors"
                >
                  Continuer →
                </button>
              </div>
            )}
          </div>
        </Layout>
      );
    }

    // ── Step 3: Micro-explanation ──────────────────────────────────────────
    if (learnStep === 3) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-lg mx-auto space-y-8">
            <div className="text-center space-y-2">
              <p className="text-4xl">🧠</p>
              <h2 className="text-xl font-bold text-text">Ce que tu dois retenir</h2>
            </div>

            <div className="bg-background-card border border-border-light rounded-card p-6 space-y-5 w-full">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🧠</span>
                <p className="text-text text-base leading-relaxed">
                  <strong>La Loi de Parkinson</strong> dit que le travail s'étend pour occuper
                  tout le temps disponible.
                </p>
              </div>
              <div className="w-full h-px bg-border-light" />
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🎯</span>
                <p className="text-text text-base leading-relaxed">
                  Ici, tu vas apprendre à utiliser les <strong>deadlines comme un outil</strong>,
                  pas comme une pression.
                </p>
              </div>
              <div className="w-full h-px bg-border-light" />
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⚡</span>
                <p className="text-text text-base leading-relaxed">
                  Estime ton temps, commence, et <strong>bats ta propre prédiction</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={goToPlay}
              className="w-full py-3.5 bg-primary text-white rounded-button font-bold hover:bg-primary-hover transition-colors text-base"
            >
              Commencer les défis →
            </button>
          </div>
        </Layout>
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — Play mode (challenge hub)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-3xl font-bold text-text mb-3">
            Loi de Parkinson
          </h1>
          <p className="text-text-muted text-base leading-relaxed">
            "Le travail s'étale pour occuper tout le temps disponible."
            <br />
            Choisis un type de défi, estime ta durée et bats ton estimation !
          </p>
        </div>

        {/* Global Stats bar */}
        {stats && (stats.total_challenges > 0) && (
          <div className="bg-background-card rounded-card border border-border-light p-4">
            <div className="flex items-center justify-center gap-8 flex-wrap text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{stats.average_accuracy}%</p>
                <p className="text-xs text-text-muted mt-0.5">Précision moyenne</p>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div>
                <p className="text-2xl font-bold text-text">{stats.total_challenges}</p>
                <p className="text-xs text-text-muted mt-0.5">Défis lancés</p>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div>
                <p className="text-2xl font-bold text-text">{stats.completed}</p>
                <p className="text-xs text-text-muted mt-0.5">Complétés</p>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div>
                <p className="text-2xl font-bold text-text">{stats.completion_rate}%</p>
                <p className="text-xs text-text-muted mt-0.5">Taux de réussite</p>
              </div>
            </div>
          </div>
        )}

        {/* Challenge Types Grid */}
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">
            Choisir un type de défi
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challengeTypes.map((type) => (
              <ChallengeTypeCard key={type.slug} type={type} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
