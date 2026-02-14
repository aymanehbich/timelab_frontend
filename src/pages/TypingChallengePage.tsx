import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import challengeTypes from '../data/challengeTypes';

// ─── Types ─────────────────────────────────────────────────────────────────

type Phase = 'level-select' | 'estimate' | 'typing' | 'results';
type HomeTab = 'play' | 'history';

interface HistoryItem {
  id: number;
  level: string;
  accuracy_percentage: number;
  words_per_minute: number;
  time_used: number;
  time_limit: number;
  finished_before_timer: boolean;
  points_earned: number;
  total_words: number;
  words_typed: number;
  created_at: string;
}

interface ChallengeData {
  challenge_id: number;
  text_content: string;
  time_limit: number;
  word_count: number;
  level: string;
  title: string;
}

interface Bonus {
  label: string;
  value: number;
}

interface EarnedBadge {
  name: string;
  icon: string;
  description: string;
}

interface ResultsData {
  points_earned: number;
  bonuses: Bonus[];
  is_new_record: boolean;
  best_wpm: number;
  earned_badges: EarnedBadge[];
  parkinson_lesson: {
    title: string;
    message: string;
    tip: string;
  };
  stats: {
    accuracy: number;
    wpm: number;
    time_used: number;
    time_limit: number;
    completed: boolean;
    finished_before_timer: boolean;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const LEVELS = [
  {
    key: 'beginner',
    label: 'Débutant',
    description: '~57 mots · 90 secondes',
    icon: '🌱',
  },
  {
    key: 'intermediate',
    label: 'Intermédiaire',
    description: '~113 mots · 150 secondes',
    icon: '⚡',
  },
  {
    key: 'expert',
    label: 'Expert',
    description: '~155 mots · 185 secondes',
    icon: '🔥',
  },
];

/**
 * Word-based accuracy: correct words / attempted words * 100
 * Only words actually attempted by the user are counted.
 */
function computeWordAccuracy(typedText: string, targetWords: string[]): number {
  if (typedText.trim() === '') return 0;
  const attempted = typedText.trimEnd().split(' ');
  const correct = attempted.filter((w, i) => w === targetWords[i]).length;
  return Math.round((correct / attempted.length) * 100);
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function TypingChallengePage() {
  const navigate = useNavigate();
  const challengeType = challengeTypes.find((c) => c.slug === 'typing')!;

  // Phase
  const [phase, setPhase] = useState<Phase>('level-select');

  // Challenge data
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<ResultsData | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [homeTab, setHomeTab] = useState<HomeTab>('play');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<typeof LEVELS[0] | null>(null);
  const [estimatedSeconds, setEstimatedSeconds] = useState('');

  // Refs to avoid stale closures in callbacks
  const typedTextRef = useRef('');
  const timeLeftRef = useRef(0);
  const startTimeRef = useRef(0);
  const completingRef = useRef(false);
  const userEstimateRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep refs in sync
  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // ── Real-time computed values ──────────────────────────────────────────

  const words = (challenge?.text_content ?? '').split(' ').filter(Boolean);
  const typedWords = typedText.split(' ');
  const currentWordIdx = typedWords.length - 1;

  const accuracy = computeWordAccuracy(typedText, words);

  const elapsed = startTimeRef.current > 0
    ? (Date.now() - startTimeRef.current) / 60000
    : 0.001;
  const completedWords = typedWords.slice(0, -1).filter((w, i) => w === words[i]).length;
  const wpm = elapsed > 0 ? Math.round(completedWords / elapsed) : 0;

  const timerMinutes = Math.floor(timeLeft / 60);
  const timerSeconds = timeLeft % 60;
  const timerDisplay = `${timerMinutes}:${timerSeconds.toString().padStart(2, '0')}`;
  const timerPct = challenge ? (timeLeft / challenge.time_limit) * 100 : 100;

  // ── Fetch history ─────────────────────────────────────────────────────

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/parkinson/typing/history');
      setHistory(res.data.data.history ?? []);
    } catch {
      // silently ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (homeTab === 'history' && phase === 'level-select') {
      fetchHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeTab, phase]);

  // ── Timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'typing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Watch for timer hitting 0
  useEffect(() => {
    if (phase === 'typing' && timeLeft === 0) {
      handleComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Watch for all words typed
  useEffect(() => {
    if (phase !== 'typing' || !challenge || completingRef.current) return;
    const typed = typedText.trimEnd().split(' ');
    if (typed.length >= words.length) {
      const currentAccuracy = computeWordAccuracy(typedText, words);
      // Auto-complete only if accuracy >= 60% (prevents typing garbage to finish fast)
      if (currentAccuracy >= 60) {
        clearInterval(timerRef.current);
        handleComplete();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedText]);

  // ── API calls ──────────────────────────────────────────────────────────

  // Load text from API → go to estimate phase (text visible, timer not started)
  const loadChallenge = async (level: typeof LEVELS[0]) => {
    setSelectedLevel(level);
    setEstimatedSeconds('');
    setLoading(true);
    setError('');
    completingRef.current = false;
    try {
      const res = await api.post('/parkinson/typing/start', { level: level.key });
      const data: ChallengeData = res.data.data;
      // Normalize: remove leading/trailing whitespace and collapse inner newlines to spaces
      data.text_content = data.text_content.trim().replace(/\s+/g, ' ');
      setChallenge(data);
      setTypedText('');
      setTimeLeft(data.time_limit);
      setResults(null);
      setPhase('estimate');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erreur lors du chargement du défi.');
    } finally {
      setLoading(false);
    }
  };

  // User has estimated → start the timer and go to typing phase
  const confirmEstimate = () => {
    userEstimateRef.current = parseInt(estimatedSeconds);
    startTimeRef.current = Date.now();
    setPhase('typing');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleComplete = async () => {
    if (!challenge || completingRef.current) return;
    completingRef.current = true;
    clearInterval(timerRef.current);

    const currentTyped = typedTextRef.current;
    const timeUsed = challenge.time_limit - timeLeftRef.current;

    const targetWords = (challenge.text_content ?? '').split(' ').filter(Boolean);
    const typedList = currentTyped.trimEnd().split(' ').filter(Boolean);
    const wordsAttempted = typedList.length;                                         // for completion check
    const correctWords = typedList.filter((w, i) => w === targetWords[i]).length;   // for WPM
    const acc = computeWordAccuracy(currentTyped, targetWords);
    const el = (Date.now() - startTimeRef.current) / 60000;
    const wpmFinal = el > 0.001 ? Math.round(correctWords / el) : 0;

    try {
      const res = await api.post('/parkinson/typing/complete', {
        challenge_id: challenge.challenge_id,
        words_typed: wordsAttempted,           // total attempted (for completion)
        total_words: targetWords.length,       // actual word count from text content
        accuracy_percentage: acc,
        words_per_minute: wpmFinal,
        time_used: Math.max(1, timeUsed),
      });
      setResults(res.data.data);
      setPhase('results');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erreur lors de la complétion.');
    }
  };

  const resetChallenge = () => {
    clearInterval(timerRef.current);
    completingRef.current = false;
    userEstimateRef.current = 0;
    setPhase('level-select');
    setChallenge(null);
    setTypedText('');
    setTimeLeft(0);
    startTimeRef.current = 0;
    setResults(null);
    setError('');
    setSelectedLevel(null);
    setEstimatedSeconds('');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = challenge?.text_content ?? '';
    if (e.target.value.length > target.length + 5) return;
    setTypedText(e.target.value);
  };

  // ── Word coloring helper ───────────────────────────────────────────────

  const getWordClass = (idx: number): string => {
    if (idx < currentWordIdx) {
      return typedWords[idx] === words[idx]
        ? 'text-green-600'
        : 'text-red-500 underline decoration-red-400';
    }
    if (idx === currentWordIdx) {
      return 'text-text bg-primary/15 rounded px-0.5 underline decoration-primary';
    }
    return 'text-text-muted';
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER — Level selection
  // ════════════════════════════════════════════════════════════════════════

  if (phase === 'level-select') {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Back */}
          <button
            onClick={() => navigate('/parkinson')}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tous les défis
          </button>

          {/* Header */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0">
                {challengeType.icon}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-text">{challengeType.title}</h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    {challengeType.difficulty}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background-secondary text-text-muted">
                    ⏱ {challengeType.estimatedTime}
                  </span>
                </div>
                <p className="text-text-muted text-sm mt-1">{challengeType.description}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-card p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex gap-1">
              {(['play', 'history'] as HomeTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHomeTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    homeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-muted hover:text-text'
                  }`}
                >
                  {tab === 'play' ? '🎮 Jouer' : '📋 Historique'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab: Play ── */}
          {homeTab === 'play' && (
            <div>
              <h2 className="text-lg font-bold text-text mb-4">Choisissez votre niveau</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {LEVELS.map((level) => (
                  <button
                    key={level.key}
                    onClick={() => loadChallenge(level)}
                    disabled={loading}
                    className="bg-background-card rounded-card border border-border-light p-6 text-left hover:border-primary hover:shadow-md transition-all group disabled:opacity-50"
                  >
                    <div className="text-4xl mb-3">{level.icon}</div>
                    <h3 className="font-bold text-text text-lg">{level.label}</h3>
                    <p className="text-text-muted text-sm mt-1">{level.description}</p>
                    <div className="mt-4 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Commencer →
                    </div>
                    <div className="mt-3 pt-3 border-t border-border-light flex items-center gap-1.5 text-xs text-text-muted">
                      <span>⏳</span>
                      <span>Tu devras estimer ton temps avant de commencer</span>
                    </div>
                  </button>
                ))}
              </div>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: History ── */}
          {homeTab === 'history' && (
            <div>
              <h2 className="text-lg font-bold text-text mb-4">Historique des défis complétés</h2>

              {historyLoading && (
                <div className="flex items-center justify-center py-12">
                  <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              {!historyLoading && history.length === 0 && (
                <div className="bg-background-card rounded-card border border-border-light p-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-text font-semibold">Aucun défi complété</p>
                  <p className="text-text-muted text-sm mt-1">Lance un premier défi pour voir ton historique ici.</p>
                </div>
              )}

              {!historyLoading && history.length > 0 && (
                <div className="space-y-3">
                  {history.map((item) => {
                    const levelInfo = LEVELS.find((l) => l.key === item.level);
                    const date = new Date(item.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    });
                    const time = new Date(item.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    });
                    return (
                      <div
                        key={item.id}
                        className="bg-background-card rounded-card border border-border-light p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                      >
                        {/* Level badge */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-2xl">{levelInfo?.icon ?? '📝'}</span>
                          <div>
                            <span className="text-xs font-semibold text-primary capitalize">{item.level}</span>
                            <p className="text-xs text-text-muted">{date} · {time}</p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-1 flex-wrap gap-4 sm:justify-center">
                          <div className="text-center">
                            <p className="text-lg font-bold text-text">{Math.round(item.words_per_minute)}</p>
                            <p className="text-xs text-text-muted">WPM</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-lg font-bold ${
                              item.accuracy_percentage >= 90 ? 'text-green-600'
                              : item.accuracy_percentage >= 70 ? 'text-yellow-500'
                              : 'text-red-500'
                            }`}>
                              {Math.round(item.accuracy_percentage)}%
                            </p>
                            <p className="text-xs text-text-muted">Précision</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-text">{item.time_used}s</p>
                            <p className="text-xs text-text-muted">Temps / {item.time_limit}s</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-text">{item.words_typed}/{item.total_words}</p>
                            <p className="text-xs text-text-muted">Mots</p>
                          </div>
                        </div>

                        {/* Points + badges */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.finished_before_timer && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">
                              ⚡ Avant timer
                            </span>
                          )}
                          <div className="text-center">
                            <p className="text-xl font-bold text-primary">+{item.points_earned}</p>
                            <p className="text-xs text-text-muted">pts</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER — Estimation phase
  // ════════════════════════════════════════════════════════════════════════

  if (phase === 'estimate' && selectedLevel && challenge) {
    const parsed = parseInt(estimatedSeconds);
    const isValid = !isNaN(parsed) && parsed >= 5 && parsed <= 600;

    return (
      <Layout>
        <div className="space-y-6">
          {/* Back */}
          <button
            onClick={resetChallenge}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Changer de niveau
          </button>

          {/* Parkinson Law callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-card p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⏳</span>
              <div>
                <h3 className="font-bold text-amber-800 text-base">La Loi de Parkinson</h3>
                <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                  "Le travail s'étend pour remplir le temps disponible." Lis le texte ci-dessous, estime ton temps, puis essaie de battre ta propre prédiction.
                </p>
              </div>
            </div>
          </div>

          {/* Text to read */}
          <div className="bg-background-card rounded-card border border-border-light p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{selectedLevel.icon}</span>
              <div>
                <h3 className="font-bold text-text">{challenge.title}</h3>
                <p className="text-text-muted text-xs">{challenge.word_count} mots · {challenge.time_limit}s max</p>
              </div>
            </div>
            <div className="bg-background-secondary rounded-button p-4 select-none border border-dashed border-border">
              <p className="text-sm text-text leading-relaxed font-mono">{challenge.text_content}</p>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center italic">Lis attentivement ce texte avant d'estimer</p>
          </div>

          {/* Estimation input */}
          <div className="bg-background-card rounded-card border border-primary/30 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-text">En combien de secondes vas-tu taper ce texte ?</h2>
              <p className="text-text-muted text-sm mt-1">
                L'objectif est de <strong>battre ta propre estimation</strong>. Le chrono démarre quand tu cliques sur "Commencer".
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={600}
                value={estimatedSeconds}
                onChange={(e) => setEstimatedSeconds(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) confirmEstimate(); }}
                placeholder="ex: 75"
                className="w-36 bg-background-secondary rounded-button px-4 py-3 text-text text-xl font-bold outline-none border border-border focus:border-primary transition-colors text-center"
                autoFocus
              />
              <span className="text-text-muted font-medium">secondes</span>
            </div>
            {estimatedSeconds !== '' && !isValid && (
              <p className="text-red-500 text-xs">Entrez une valeur entre 5 et 600 secondes.</p>
            )}
          </div>

          {/* Start button */}
          <button
            onClick={confirmEstimate}
            disabled={!isValid}
            className="w-full py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ⚡ Commencer — le chrono démarre !
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-card p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER — Typing phase
  // ════════════════════════════════════════════════════════════════════════

  if (phase === 'typing' && challenge) {
    const progressPct = Math.round((currentWordIdx / words.length) * 100);

    return (
      <Layout>
        <div className="space-y-5">
          {/* Abandon button */}
          <button
            onClick={resetChallenge}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Abandonner
          </button>

          {/* Stats bar — Timer / WPM / Accuracy */}
          <div className="grid grid-cols-3 gap-4">
            {/* Timer */}
            <div className={`bg-background-card rounded-card border p-4 text-center transition-colors ${
              timeLeft <= 15 ? 'border-red-400 bg-red-50' : 'border-border-light'
            }`}>
              <p className={`text-3xl font-mono font-bold ${timeLeft <= 15 ? 'text-red-500 animate-pulse' : 'text-text'}`}>
                {timerDisplay}
              </p>
              <p className="text-xs text-text-muted mt-1">Temps restant</p>
              <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${timeLeft <= 15 ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
            </div>

            {/* WPM */}
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-3xl font-bold text-primary">{wpm}</p>
              <p className="text-xs text-text-muted mt-1">Mots / min</p>
            </div>

            {/* Accuracy */}
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className={`text-3xl font-bold ${
                accuracy >= 90 ? 'text-green-600' : accuracy >= 70 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {accuracy}%
              </p>
              <p className="text-xs text-text-muted mt-1">Précision</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-background-card rounded-card border border-border-light px-5 py-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span>Progression</span>
              <span>{currentWordIdx} / {words.length} mots</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Text to type — word by word coloring */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">{challenge.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-background-secondary text-text-muted capitalize">
                {challenge.level}
              </span>
            </div>
            <p className="text-base leading-relaxed font-mono select-none">
              {words.map((word, i) => (
                <span key={i} className={`${getWordClass(i)} transition-colors`}>
                  {word}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>

          {/* Typing input */}
          <div className="bg-background-card rounded-card border border-border-light p-4">
            <p className="text-xs text-text-muted mb-2">Tapez le texte ci-dessus ↓</p>
            <textarea
              ref={textareaRef}
              value={typedText}
              onChange={handleTextChange}
              className="w-full bg-background-secondary rounded-button p-4 font-mono text-text text-sm resize-none outline-none border border-border focus:border-primary transition-colors h-28"
              placeholder="Commencez à taper ici..."
              autoFocus
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-card p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER — Results
  // ════════════════════════════════════════════════════════════════════════

  if (phase === 'results' && results) {
    return (
      <Layout>
        <div className="space-y-5">
          {/* Back */}
          <button
            onClick={() => navigate('/parkinson')}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tous les défis
          </button>

          {/* Points hero */}
          <div className="bg-gradient-to-r from-primary to-primary-hover rounded-card p-8 text-center text-white">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold mb-1">Défi terminé !</h2>
            <p className="text-white/70 text-sm mb-4">
              {results.stats.finished_before_timer
                ? 'Tu as battu le chrono !'
                : 'Continue comme ça !'}
            </p>
            <div className="text-6xl font-bold">+{results.points_earned}</div>
            <p className="text-white/70 mt-1 text-sm">points gagnés</p>

            {results.bonuses.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {results.bonuses.map((bonus, i) => (
                  <span key={i} className="text-xs bg-white/20 rounded-full px-3 py-1">
                    +{bonus.value} {bonus.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Newly earned badges */}
          {results.earned_badges?.length > 0 && (
            <div className="bg-background-card rounded-card border border-yellow-300 p-5">
              <h3 className="font-bold text-text text-base mb-3 flex items-center gap-2">
                <span>🏅</span> Nouveaux badges débloqués !
              </h3>
              <div className="flex flex-wrap gap-3">
                {results.earned_badges.map((badge, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-card px-4 py-3"
                  >
                    <span className="text-3xl">{badge.icon}</span>
                    <div>
                      <p className="font-semibold text-text text-sm">{badge.name}</p>
                      <p className="text-text-muted text-xs">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimation vs Réalité */}
          {userEstimateRef.current > 0 && (
            <div className="bg-background-card rounded-card border border-amber-200 p-5">
              <h3 className="font-bold text-text text-base mb-4 flex items-center gap-2">
                <span>🎯</span> Estimation vs Réalité
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center bg-amber-50 rounded-card p-3">
                  <p className="text-2xl font-bold text-amber-600">{userEstimateRef.current}s</p>
                  <p className="text-xs text-text-muted mt-1">Ton estimation</p>
                </div>
                <div className="text-center bg-primary/5 rounded-card p-3">
                  <p className="text-2xl font-bold text-primary">{results.stats.time_used}s</p>
                  <p className="text-xs text-text-muted mt-1">Temps utilisé</p>
                </div>
              </div>
              {results.stats.time_used <= userEstimateRef.current ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-button p-3">
                  <span className="text-lg">🏆</span>
                  <p className="text-sm text-green-700 font-semibold">
                    Bravo ! Tu as battu ton estimation de {userEstimateRef.current - results.stats.time_used}s !
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-button p-3">
                  <span className="text-lg">📊</span>
                  <p className="text-sm text-amber-700">
                    Tu as dépassé ton estimation de <strong>{results.stats.time_used - userEstimateRef.current}s</strong>. Continue à t'entraîner pour mieux te connaître !
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Performance stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-2xl font-bold text-primary">{Math.round(results.stats.wpm)}</p>
              <p className="text-xs text-text-muted mt-1">Mots / min</p>
            </div>
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-2xl font-bold text-text">{Math.round(results.stats.accuracy)}%</p>
              <p className="text-xs text-text-muted mt-1">Précision</p>
            </div>
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-2xl font-bold text-text">{results.stats.time_used}s</p>
              <p className="text-xs text-text-muted mt-1">Temps utilisé</p>
            </div>
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-2xl font-bold text-text">{Math.round(results.best_wpm)}</p>
              <p className="text-xs text-text-muted mt-1">Meilleur WPM</p>
              {results.is_new_record && (
                <span className="text-xs text-primary font-semibold">Nouveau record !</span>
              )}
            </div>
          </div>

          {/* Parkinson lesson */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <h3 className="font-bold text-text text-lg mb-2">{results.parkinson_lesson.title}</h3>
            <p className="text-text-muted text-sm leading-relaxed mb-4">
              {results.parkinson_lesson.message}
            </p>
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-button p-4">
              <span className="text-xl">💡</span>
              <p className="text-sm text-text-muted">
                <strong className="text-text">Conseil : </strong>
                {results.parkinson_lesson.tip}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={resetChallenge}
              className="flex-1 py-3 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover transition-colors"
            >
              Rejouer
            </button>
            <button
              onClick={() => navigate('/parkinson')}
              className="flex-1 py-3 bg-background-card text-text border border-border rounded-button font-semibold hover:bg-background-secondary transition-colors"
            >
              Retour aux défis
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}
