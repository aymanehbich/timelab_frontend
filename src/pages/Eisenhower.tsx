import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { QuadrantCard, eisenhowerApi } from '../components/eisenhower';
import type { QuizTask, QuizProgress, SubmitResponse } from '../components/eisenhower';
import { LEVEL_CONFIG } from '../components/eisenhower/types';
import type { ProgressResponse } from '../components/eisenhower/types';

// ─────────────────────────────────────────────
// Quiz page
// ─────────────────────────────────────────────
type QState = 'idle' | 'disabled' | 'correct' | 'wrong' | 'reveal';
type Screen = 'intro' | 'levels' | 'quiz';

function EisenhowerQuiz() {
  const [task, setTask] = useState<QuizTask | null>(null);
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [qStates, setQStates] = useState<Record<number, QState>>({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('eisenhower_screen');
    return (saved === 'levels' || saved === 'quiz') ? saved : 'intro';
  });

  // ── Level state ──
  const [currentLevel, setCurrentLevel] = useState(() => {
    const saved = localStorage.getItem('eisenhower_level');
    const n = saved ? parseInt(saved, 10) : 1;
    return (n >= 1 && n <= 3) ? n : 1;
  });
  const [levelProgress, setLevelProgress] = useState<Record<number, QuizProgress | null>>({ 1: null, 2: null, 3: null });

  // ── Compute unlocked levels from progress data ──
  const isLevelUnlocked = (level: number): boolean => {
    if (level === 1) return true;
    const prev = levelProgress[level - 1];
    return prev !== null && prev.score_percentage >= 80;
  };

  // ── Fetch helpers ──
  const loadNext = useCallback(async (level: number) => {
    try {
      const data = await eisenhowerApi.getNext(level);
      if ('completed' in data && data.completed) {
        setCompleted(true);
        setTask(null);
      } else {
        setTask(data as QuizTask);
        setCompleted(false);
      }
    } catch (e) {
      console.error('Failed to load next task:', e);
    }
  }, []);

  const normalizeProgress = (p: any): QuizProgress => {
    const total = p?.total_tasks ?? 0;
    const correct = p?.correct ?? 0;
    return {
      total_tasks: total,
      attempted: p?.attempted ?? 0,
      correct,
      incorrect: p?.incorrect ?? 0,
      remaining: p?.remaining ?? 0,
      score_percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      total_points_earned: p?.total_points_earned ?? 0,
    };
  };

  // Parse the { overall, levels[] } response from the backend
  const parseProgressResponse = (raw: ProgressResponse): Record<number, QuizProgress> => {
    const result: Record<number, QuizProgress> = { 1: normalizeProgress(null), 2: normalizeProgress(null), 3: normalizeProgress(null) };
    if (raw?.levels && Array.isArray(raw.levels)) {
      for (const lp of raw.levels) {
        if (lp.level >= 1 && lp.level <= 3) {
          result[lp.level] = normalizeProgress(lp);
        }
      }
    }
    return result;
  };

  const loadAllProgress = useCallback(async (activeLevel?: number) => {
    try {
      const raw = await eisenhowerApi.getProgress();
      const parsed = parseProgressResponse(raw);
      setLevelProgress(parsed);
      if (activeLevel) {
        setProgress(parsed[activeLevel]);
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  }, []);

  // ── Persist screen & level to localStorage ──
  useEffect(() => {
    localStorage.setItem('eisenhower_screen', screen);
  }, [screen]);
  useEffect(() => {
    localStorage.setItem('eisenhower_level', String(currentLevel));
  }, [currentLevel]);

  // ── Initial load: fetch progress and resume quiz if needed ──
  useEffect(() => {
    const init = async () => {
      await loadAllProgress(screen === 'quiz' ? currentLevel : undefined);
      if (screen === 'quiz') {
        await loadNext(currentLevel);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ── Start a level ──
  const startLevel = async (level: number) => {
    setCurrentLevel(level);
    setScreen('quiz');
    setLoading(true);
    setCompleted(false);
    setResult(null);
    setQStates({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
    await Promise.all([loadNext(level), loadAllProgress(level)]);
    setLoading(false);
  };

  // ── Pick a quadrant ──
  const handlePick = async (q: number) => {
    if (!task || busy || result) return;
    setBusy(true);
    setError(null);

    try {
      const res = await eisenhowerApi.submit(task.id, q);
      setResult(res);

      const next: Record<number, QState> = { 1: 'disabled', 2: 'disabled', 3: 'disabled', 4: 'disabled' };
      if (res.is_correct) {
        next[q] = 'correct';
      } else {
        next[q] = 'wrong';
        next[res.correct_quadrant] = 'reveal';
      }
      setQStates(next);

      // Optimistic update from submit result
      if (progress) {
        const updated: QuizProgress = {
          ...progress,
          attempted: progress.attempted + 1,
          correct: progress.correct + (res.is_correct ? 1 : 0),
          incorrect: progress.incorrect + (res.is_correct ? 0 : 1),
          remaining: Math.max(0, progress.remaining - 1),
          total_points_earned: progress.total_points_earned + res.points_earned,
          score_percentage: progress.total_tasks > 0
            ? Math.round(((progress.correct + (res.is_correct ? 1 : 0)) / progress.total_tasks) * 100)
            : 0,
        };
        setProgress(updated);
        setLevelProgress(prev => ({ ...prev, [currentLevel]: updated }));
      }

    } catch (e: any) {
      setError(e.message || 'Échec de la soumission');
    } finally {
      setBusy(false);
    }
  };

  // ── Next task ──
  const handleNext = async () => {
    setResult(null);
    setQStates({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
    setLoading(true);
    await loadNext(currentLevel);
    setLoading(false);
  };

  // ── Try again ──
  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await eisenhowerApi.reset(currentLevel);
      setCompleted(false);
      setResult(null);
      setQStates({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
      await Promise.all([loadNext(currentLevel), loadAllProgress(currentLevel)]);
    } catch (e: any) {
      setError(e.message || 'Échec de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  // ── Go back to level selection ──
  const goToLevels = async () => {
    setScreen('levels');
    setTask(null);
    setResult(null);
    setCompleted(false);
    setProgress(null);
    setLoading(true);
    await loadAllProgress();
    setLoading(false);
  };

  // ── Next level ──
  const goToNextLevel = () => {
    if (currentLevel < 3) {
      startLevel(currentLevel + 1);
    }
  };

  const answered = result !== null;
  const pct = progress && progress.total_tasks > 0
    ? Math.round((progress.attempted / progress.total_tasks) * 100)
    : 0;

  const lvlCfg = LEVEL_CONFIG[currentLevel as 1 | 2 | 3];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Matrice d'Eisenhower</h1>
            <p className="text-text-muted text-sm">Classez chaque tâche dans le bon quadrant</p>
          </div>
        </div>
        {screen === 'quiz' && progress && (
          <div className="flex items-center gap-4 px-5 py-3 bg-background-card rounded-card border border-border-light">
            <div className="text-center">
              <p className="text-xs text-text-muted">Niveau</p>
              <p className={`text-lg font-bold ${lvlCfg.color}`}>{lvlCfg.emoji} {lvlCfg.name}</p>
            </div>
            <div className="w-px h-10 bg-border-light" />
            <div className="text-center">
              <p className="text-xs text-text-muted">Score</p>
              <p className="text-xl font-bold text-primary">{progress.score_percentage}%</p>
            </div>
            <div className="w-px h-10 bg-border-light" />
            <div className="text-center">
              <p className="text-xs text-text-muted">Points</p>
              <p className="text-xl font-bold text-text">{progress.total_points_earned}</p>
            </div>
            <div className="w-px h-10 bg-border-light" />
            <div className="text-center">
              <p className="text-xs text-text-muted">Correctes</p>
              <p className="text-xl font-bold text-success">{progress.correct}/{progress.total_tasks}</p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════ */}
      {/* INTRO SCREEN                            */}
      {/* ════════════════════════════════════════ */}
      {screen === 'intro' && !loading && (
        <div className="space-y-6">
          {/* What is the Eisenhower Matrix */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text mb-3">Qu'est-ce que la Matrice d'Eisenhower ?</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              La Matrice d'Eisenhower, également connue sous le nom de Matrice Urgent-Important, est une méthode de productivité qui vous aide à prioriser vos tâches en les classant dans quatre quadrants selon leur urgence et leur importance. Elle a été popularisée par le Président Dwight D. Eisenhower qui a dit : <em>« Ce qui est important est rarement urgent, et ce qui est urgent est rarement important. »</em>
            </p>
          </div>

          {/* Four quadrants explanation */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Les Quatre Quadrants</h2>
            <div className="space-y-4">
              {[
                { q: 'Q1', title: 'Faire en premier', subtitle: 'Urgent et Important', desc: 'Tâches qui nécessitent une attention immédiate. Crises, délais et problèmes urgents qui ne peuvent pas être retardés.', color: 'bg-error' },
                { q: 'Q2', title: 'Planifier', subtitle: 'Non Urgent et Important', desc: 'Tâches qui contribuent aux objectifs à long terme. Planification, développement personnel, prévention et renforcement des relations.', color: 'bg-primary' },
                { q: 'Q3', title: 'Déléguer', subtitle: 'Urgent et Non Important', desc: 'Tâches qui semblent pressantes mais ne contribuent pas à vos objectifs. Interruptions, certains e-mails et certaines réunions.', color: 'bg-warning' },
                { q: 'Q4', title: 'Éliminer', subtitle: 'Non Urgent et Non Important', desc: 'Tâches qui ne sont ni urgentes ni importantes. Perte de temps, réseaux sociaux excessifs et distractions inutiles.', color: 'bg-text-muted' },
              ].map((item) => (
                <div key={item.q} className="flex items-start gap-3 pb-4 border-b border-border-light last:border-0 last:pb-0">
                  <div className={`w-3 h-3 rounded-full ${item.color} shrink-0 mt-1`} />
                  <div>
                    <p className="text-sm text-text">
                      <span className="font-bold">{item.q} - {item.title}</span>
                      <span className="text-text-muted ml-2 text-xs">({item.subtitle})</span>
                    </p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How the practice works */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text mb-3">Comment fonctionne la pratique ?</h2>
            <div className="space-y-3 text-sm text-text-muted">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p>Choisissez votre niveau de difficulté parmi les trois disponibles.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p>Une description de tâche vous sera présentée une à la fois.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p>Cliquez sur le quadrant que vous pensez être correct. Vous recevrez un retour instantané avec une explication.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p>Obtenez 80% ou plus pour débloquer le niveau suivant.</p>
              </div>
            </div>
          </div>

          {/* Start button */}
          <div className="flex justify-center">
            <button
              onClick={() => setScreen('levels')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-button bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm"
            >
              Commencer la pratique
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* LEVEL SELECTION SCREEN                  */}
      {/* ════════════════════════════════════════ */}
      {screen === 'levels' && !loading && (
        <div className="space-y-6">
          <button
            onClick={() => setScreen('intro')}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voir la méthode
          </button>
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text mb-2">Choisissez votre niveau</h2>
            <p className="text-sm text-text-muted mb-6">Complétez chaque niveau avec un score de 80% ou plus pour débloquer le suivant.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([1, 2, 3] as const).map((level) => {
                const cfg = LEVEL_CONFIG[level];
                const unlocked = isLevelUnlocked(level);
                const lp = levelProgress[level];
                const hasProgress = lp !== null && lp.attempted > 0;
                const isCompleted = lp !== null && lp.remaining === 0;
                const passed = lp !== null && lp.score_percentage >= 80;

                return (
                  <button
                    key={level}
                    onClick={() => unlocked && startLevel(level)}
                    disabled={!unlocked}
                    className={`relative text-left p-5 rounded-card border-2 transition-all ${
                      unlocked
                        ? `${cfg.border} ${cfg.bg} hover:shadow-card cursor-pointer active:scale-[0.98]`
                        : 'border-border bg-background-secondary opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {/* Lock icon for locked levels */}
                    {!unlocked && (
                      <div className="absolute top-4 right-4">
                        <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}

                    {/* Passed badge */}
                    {passed && (
                      <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-success text-white flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{cfg.emoji}</span>
                      <div>
                        <p className={`text-base font-bold ${unlocked ? cfg.color : 'text-text-muted'}`}>
                          Niveau {level}
                        </p>
                        <p className={`text-sm ${unlocked ? 'text-text' : 'text-text-muted'}`}>
                          {cfg.name}
                        </p>
                      </div>
                    </div>

                    {/* Progress info */}
                    {unlocked && hasProgress && (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-muted">Progression</span>
                          <span className="text-text font-medium">{lp!.attempted}/{lp!.total_tasks}</span>
                        </div>
                        <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${lp!.total_tasks > 0 ? Math.round((lp!.attempted / lp!.total_tasks) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-text-muted">Score: <span className={`font-medium ${lp!.score_percentage >= 80 ? 'text-success' : 'text-text'}`}>{lp!.score_percentage}%</span></span>
                          {isCompleted && <span className={`font-medium ${passed ? 'text-success' : 'text-warning'}`}>{passed ? 'Réussi' : 'À refaire'}</span>}
                        </div>
                      </div>
                    )}

                    {unlocked && !hasProgress && (
                      <p className="text-xs text-text-muted mt-2">Pas encore commencé</p>
                    )}

                    {!unlocked && (
                      <p className="text-xs text-text-muted mt-2">Obtenez 80% au niveau {level - 1} pour débloquer</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* QUIZ SCREEN                             */}
      {/* ════════════════════════════════════════ */}

      {/* Back to levels button */}
      {screen === 'quiz' && !loading && (
        <button
          onClick={goToLevels}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux niveaux
        </button>
      )}

      {/* Progress bar */}
      {screen === 'quiz' && progress && progress.total_tasks > 0 && (
        <div className="bg-background-card rounded-card border border-border-light p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-muted">
              Question <span className="font-semibold text-text">{progress.attempted + (completed ? 0 : 1)}</span> sur {progress.total_tasks}
            </span>
            <span className="text-text-muted font-medium">{pct}% terminé</span>
          </div>
          <div className="h-2.5 bg-background-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {screen === 'quiz' && error && (
        <div className="flex items-center gap-3 p-4 rounded-card border border-error/30 bg-error-light text-sm text-error">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-error/60 hover:text-error transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Completed */}
      {screen === 'quiz' && !loading && completed && progress && progress.total_tasks > 0 && (
        <div className="bg-background-card rounded-card border border-border-light shadow-sm overflow-hidden">
          <div className="bg-primary/5 border-b border-border-light px-6 py-10 text-center">
            <div className="text-6xl mb-4">{progress.score_percentage >= 80 ? '🏆' : progress.score_percentage >= 50 ? '👍' : '📚'}</div>
            <h2 className="text-2xl font-bold text-text">
              {progress.score_percentage >= 80 ? 'Excellent !' : progress.score_percentage >= 50 ? 'Bon travail !' : 'Continuez à apprendre !'}
            </h2>
            <p className="text-text-muted mt-2">
              Vous avez terminé les {progress.total_tasks} tâches du niveau {lvlCfg.emoji} {lvlCfg.name}
            </p>
            {progress.score_percentage >= 80 && currentLevel < 3 && (
              <p className="text-success font-semibold mt-3">
                {LEVEL_CONFIG[(currentLevel + 1) as 1 | 2 | 3].emoji} Niveau {currentLevel + 1} débloqué !
              </p>
            )}
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Score', value: `${progress.score_percentage}%`, color: 'text-primary', icon: '🎯' },
              { label: 'Correctes', value: progress.correct, color: 'text-success', icon: '✅' },
              { label: 'Incorrectes', value: progress.incorrect, color: 'text-error', icon: '❌' },
              { label: 'Points', value: progress.total_points_earned, color: 'text-text', icon: '⭐' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-lg bg-background-secondary">
                <span className="text-xl">{stat.icon}</span>
                <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                <p className="text-xs text-text-muted mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button border border-border text-text text-sm font-semibold hover:bg-background-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Réessayer
            </button>
            {progress.score_percentage >= 80 && currentLevel < 3 && (
              <button
                onClick={goToNextLevel}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm"
              >
                Niveau suivant
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
            <button
              onClick={goToLevels}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button border border-border text-text-muted text-sm font-semibold hover:bg-background-secondary transition-colors"
            >
              Retour aux niveaux
            </button>
          </div>
        </div>
      )}

      {/* No tasks */}
      {screen === 'quiz' && !loading && !task && (!completed || (progress && progress.total_tasks === 0)) && (
        <div className="text-center py-16 bg-background-card rounded-card border border-border-light">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-secondary flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <p className="text-text font-semibold">Aucune tâche disponible</p>
          <p className="text-text-muted text-sm mt-1">Revenez plus tard pour de nouvelles questions</p>
        </div>
      )}

      {/* Active task */}
      {screen === 'quiz' && !loading && task && (
        <>
          {/* Task card */}
          <div className={`bg-background-card rounded-card border overflow-hidden ${
            !answered ? 'border-primary/20' : 'border-border-light'
          } transition-all`}>
            <div className="px-5 py-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!answered ? 'bg-primary/10' : 'bg-background-secondary'}`}>
                <svg className={`w-4 h-4 ${!answered ? 'text-primary' : 'text-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-text">{task.title}</h2>
                <p className="text-xs text-text-muted truncate">{task.description}</p>
              </div>
              {!answered && !busy && (
                <span className="text-xs text-text-placeholder shrink-0">Sélectionnez ci-dessous</span>
              )}
            </div>
          </div>

          {/* Matrix section */}
          <div className="bg-background-card rounded-card border border-border-light p-4 lg:p-6">
            {/* Axis labels */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Urgent</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Non Urgent</span>
              </div>
            </div>

            {/* Matrix grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Row 1: Important */}
              <div className="lg:col-span-2 hidden lg:block">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 pl-1">Important</p>
              </div>
              <QuadrantCard quadrant={1} onSelect={handlePick} state={qStates[1]} />
              <QuadrantCard quadrant={2} onSelect={handlePick} state={qStates[2]} />

              {/* Row 2: Not Important */}
              <div className="lg:col-span-2 hidden lg:block">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 pl-1">Non Important</p>
              </div>
              <QuadrantCard quadrant={3} onSelect={handlePick} state={qStates[3]} />
              <QuadrantCard quadrant={4} onSelect={handlePick} state={qStates[4]} />
            </div>
          </div>

          {/* Feedback */}
          {result && (
            <div className={`rounded-card border-2 overflow-hidden ${result.is_correct ? 'border-success/40' : 'border-error/40'}`}>
              <div className={`px-6 py-4 flex items-center gap-4 ${result.is_correct ? 'bg-success/10' : 'bg-error/10'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white ${result.is_correct ? 'bg-success' : 'bg-error'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={result.is_correct ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${result.is_correct ? 'text-success' : 'text-error'}`}>
                    {result.is_correct ? 'Correct !' : 'Incorrect'}
                  </h3>
                </div>
                {result.points_earned > 0 && (
                  <span className="px-3 py-1 rounded-full bg-success/20 text-success text-sm font-bold">
                    +{result.points_earned} pts
                  </span>
                )}
              </div>
              <div className="px-6 py-4 bg-background-card">
                <p className="text-sm text-text leading-relaxed">{result.explanation}</p>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm"
                  >
                    Tâche suivante
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Eisenhower() {
  return (
    <Layout>
      <EisenhowerQuiz />
    </Layout>
  );
}
