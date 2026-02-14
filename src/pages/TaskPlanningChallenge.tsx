import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION = 60; // 1 minute in seconds

interface Task {
  id: string;
  emoji: string;
  label: string;
  duration: string;
  durationMin: number;
}

const TASKS: Task[] = [
  { id: 'emails',   emoji: '📧', label: 'Répondre aux emails', duration: '30 min', durationMin: 30  },
  { id: 'revision', emoji: '📚', label: 'Réviser le cours',    duration: '2h',     durationMin: 120 },
  { id: 'sport',    emoji: '🏃', label: 'Faire du sport',      duration: '45 min', durationMin: 45  },
  { id: 'dejeuner', emoji: '🍽️', label: 'Déjeuner',           duration: '45 min', durationMin: 45  },
  { id: 'projet',   emoji: '💻', label: 'Finir le projet',     duration: '1h30',   durationMin: 90  },
  { id: 'pause',    emoji: '😴', label: 'Pause repos',         duration: '30 min', durationMin: 30  },
];

const TIME_SLOTS = ['9h', '10h', '11h', '14h', '15h', '16h'];

// Minutes available before the next slot (gap to next hour or end of day)
const SLOT_CAPACITY_MIN = [60, 60, 180, 60, 60, 60];

// Optimal slot order: emails → revision → dejeuner → pause → projet → sport
const IDEAL_SLOT_ORDER = ['emails', 'revision', 'dejeuner', 'pause', 'projet', 'sport'];

type Phase = 'intro' | 'playing' | 'results' | 'comparison';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTask(id: string): Task {
  return TASKS.find((t) => t.id === id)!;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

interface CriterionResult {
  label: string;
  ok: boolean;
  note: string;
}

interface EvalResult {
  criteria: CriterionResult[];
  score: number;
  conflicts: number;
}

function evaluate(slots: (string | null)[]): EvalResult {
  let conflicts = 0;
  slots.forEach((id, i) => {
    if (id && getTask(id).durationMin > SLOT_CAPACITY_MIN[i]) conflicts++;
  });

  const revSlot   = slots.indexOf('revision');
  const projSlot  = slots.indexOf('projet');
  const pauseSlot = slots.indexOf('pause');
  const sportSlot = slots.indexOf('sport');
  const emailSlot = slots.indexOf('emails');

  // Both hard cognitive tasks in morning slots (0, 1, 2 = 9h, 10h, 11h)
  const hardMorning = revSlot >= 0 && revSlot <= 2 && projSlot >= 0 && projSlot <= 2;

  // Pause placed immediately after revision or projet
  const pauseAfterHard =
    pauseSlot > 0 &&
    (slots[pauseSlot - 1] === 'revision' || slots[pauseSlot - 1] === 'projet');

  // Sport in one of the last two slots (15h or 16h)
  const sportLate = sportSlot >= 4;

  // Emails not shunted to the very last slot
  const emailsNotLast = emailSlot >= 0 && emailSlot < 5;

  let score = 0;
  if (hardMorning)    score += 35;
  if (pauseAfterHard) score += 20;
  if (sportLate)      score += 20;
  if (emailsNotLast)  score += 15;
  score -= conflicts * 15;
  score = Math.max(0, Math.min(100, score));

  return {
    criteria: [
      {
        label: 'Tâches difficiles le matin',
        ok:   hardMorning,
        note: hardMorning    ? 'Excellent !'                            : 'Mets Révision & Projet avant 14h',
      },
      {
        label: 'Pause après effort intense',
        ok:   pauseAfterHard,
        note: pauseAfterHard ? 'Très bien !'                            : 'Place Pause juste après une tâche difficile',
      },
      {
        label: 'Sport en fin de journée',
        ok:   sportLate,
        note: sportLate      ? 'Parfait !'                              : 'Sport à 15h ou 16h pour décompresser',
      },
      {
        label: 'Emails traités tôt',
        ok:   emailsNotLast,
        note: emailsNotLast  ? 'Efficace !'                             : 'Évite de finir ta journée par les emails',
      },
    ],
    score,
    conflicts,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskPlanningChallenge() {
  const navigate = useNavigate();

  const [phase,     setPhase]     = useState<Phase>('intro');
  const [slots,     setSlots]     = useState<(string | null)[]>(Array(6).fill(null));
  const [selected,  setSelected]  = useState<string | null>(null);
  const [timeLeft,  setTimeLeft]  = useState(DURATION);
  const [alertMsg,  setAlertMsg]  = useState<string | null>(null);
  const [result,    setResult]    = useState<EvalResult | null>(null);
  const [timeUsed,  setTimeUsed]  = useState(0);
  const [xpAwarded, setXpAwarded] = useState(0);

  const intervalRef  = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);
  const slotsRef     = useRef(slots);
  const doneRef      = useRef(false);

  useEffect(() => { slotsRef.current = slots; }, [slots]);

  // ── Finish game (timer expires or validate clicked) ──────────────────────
  const finishGame = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(intervalRef.current);

    const used = Math.min(DURATION, Math.round((Date.now() - startTimeRef.current) / 1000));
    setTimeUsed(used);

    const eval_ = evaluate(slotsRef.current);
    setResult(eval_);

    if (eval_.score > 0) {
      api.post('/award-points', { points: eval_.score }).catch(console.error);
    }
    setXpAwarded(eval_.score);
    setPhase('results');
  }, []);

  // ── Start countdown when phase = playing ────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    startTimeRef.current = Date.now();
    doneRef.current = false;
    setTimeLeft(DURATION);
    setAlertMsg(null);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, DURATION - elapsed);
      setTimeLeft(left);
      if (left === 30) setAlertMsg('⚠️ Plus que 30 secondes !');
      if (left === 12) setAlertMsg('🔴 Dépêche-toi ! Plus que 12 secondes !');
      if (left === 0)  clearInterval(intervalRef.current);
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [phase]);

  // Trigger end when timer hits 0
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) finishGame();
  }, [timeLeft, phase, finishGame]);

  // ── Slot interaction ─────────────────────────────────────────────────────
  const handleSlotClick = (i: number) => {
    const current = slots[i];
    if (current && !selected) {
      // Remove task → return to pool
      setSlots((prev) => { const n = [...prev]; n[i] = null; return n; });
    } else if (current && selected) {
      // Swap: place selected, return current to pool
      setSlots((prev) => {
        const n = prev.map((s) => (s === selected ? null : s));
        n[i] = selected;
        return n;
      });
      setSelected(null);
    } else if (!current && selected) {
      // Place selected in empty slot
      setSlots((prev) => {
        const n = prev.map((s) => (s === selected ? null : s));
        n[i] = selected;
        return n;
      });
      setSelected(null);
    }
  };

  // ── Start / Reset ────────────────────────────────────────────────────────
  const startGame = () => {
    setSlots(Array(6).fill(null));
    setSelected(null);
    setAlertMsg(null);
    setResult(null);
    setXpAwarded(0);
    setTimeUsed(0);
    setPhase('playing');
  };

  const resetGame = () => {
    clearInterval(intervalRef.current);
    setSlots(Array(6).fill(null));
    setSelected(null);
    setAlertMsg(null);
    setResult(null);
    setXpAwarded(0);
    setTimeUsed(0);
    setTimeLeft(DURATION);
    setPhase('intro');
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const placedCount   = slots.filter(Boolean).length;
  const unplacedTasks = TASKS.filter((t) => !slots.includes(t.id));
  const timerColor    = timeLeft > 60 ? 'text-green-600'  : timeLeft > 30 ? 'text-orange-500'  : 'text-red-500';
  const timerBg       = timeLeft > 60 ? 'bg-green-50 border-green-200' : timeLeft > 30 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200';

  // ══════════════════════════════════════════════════════════════════════════
  // INTRO
  // ══════════════════════════════════════════════════════════════════════════

  if (phase === 'intro') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-5 py-6">
          <button
            onClick={() => navigate('/parkinson')}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            ← Retour aux défis
          </button>

          <div className="bg-background-card rounded-card border border-border-light p-6 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">📋</div>
              <h1 className="text-2xl font-bold text-text">Day Planner Challenge</h1>
              <p className="text-text-muted text-sm mt-1">Planifie ta journée avant que le timer expire !</p>
            </div>

            {/* Scenario */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-semibold text-blue-800 mb-1">📋 Scénario</p>
              <p className="text-blue-700 text-sm leading-relaxed">
                Tu es étudiant. Demain tu as un examen. Tu as 8 heures disponibles aujourd'hui.
                Tu dois planifier ces tâches intelligemment pour maximiser ta productivité.
              </p>
            </div>

            {/* Tasks */}
            <div>
              <p className="font-semibold text-text mb-3">📌 Les tâches à planifier :</p>
              <div className="grid grid-cols-2 gap-2">
                {TASKS.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-background rounded-xl border border-border-light p-3"
                  >
                    <span className="text-xl">{task.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-text leading-tight">{task.label}</p>
                      <p className="text-xs text-text-muted">{task.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer info */}
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="font-semibold text-amber-800">Tu as 1 minute pour planifier</p>
                <p className="text-amber-700 text-sm">La contrainte de temps t'empêche de procrastiner !</p>
              </div>
            </div>

            {/* Parkinson tip */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700 italic">
              💡 <strong>Loi de Parkinson :</strong> "Plus tu as de temps pour planifier,
              plus tu compliques inutilement ton planning"
            </div>

            <button
              onClick={startGame}
              className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors text-lg"
            >
              Commencer ⏱️
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PLAYING
  // ══════════════════════════════════════════════════════════════════════════

  if (phase === 'playing') {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-4 py-4">

          {/* Header + timer */}
          <div className="flex items-center justify-between bg-background-card rounded-card border border-border-light px-5 py-3">
            <div>
              <h2 className="font-bold text-text">🗓️ Day Planner Challenge</h2>
              <p className="text-xs text-text-muted">Clique une tâche puis un créneau pour la placer</p>
            </div>
            <div className={`px-4 py-2 rounded-xl border ${timerBg}`}>
              <p className={`text-2xl font-mono font-bold ${timerColor}`}>{fmtTime(timeLeft)}</p>
            </div>
          </div>

          {/* Alert */}
          {alertMsg && (
            <div
              className={`rounded-xl p-3 text-sm font-bold text-center border ${
                timeLeft <= 12
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : 'bg-amber-100 border-amber-300 text-amber-700'
              }`}
            >
              {alertMsg}
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>⚠️ {TASKS.length - placedCount} à placer</span>
            <div className="flex-1 h-2 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-2 bg-primary rounded-full transition-all"
                style={{ width: `${(placedCount / TASKS.length) * 100}%` }}
              />
            </div>
            <span>✅ {placedCount} placées</span>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-[220px_1fr] gap-4">

            {/* Left — unplaced tasks */}
            <div className="bg-background-card rounded-card border border-border-light p-4 space-y-2 h-fit">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wide">📋 Tâches à placer</p>

              {unplacedTasks.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">
                  <div className="text-2xl mb-1">🎉</div>
                  Toutes placées !
                </div>
              ) : (
                unplacedTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelected((s) => (s === task.id ? null : task.id))}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected === task.id
                        ? 'border-primary bg-primary/10 shadow ring-1 ring-primary/30 scale-[1.02]'
                        : 'border-border-light bg-background hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl shrink-0">{task.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-text leading-tight">{task.label}</p>
                        <p className="text-xs text-text-muted mt-0.5">{task.duration}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}

              {selected && (
                <p className="text-xs text-primary text-center animate-pulse pt-1">
                  👆 Clique sur un créneau
                </p>
              )}
            </div>

            {/* Right — time slots */}
            <div className="bg-background-card rounded-card border border-border-light p-4 space-y-2">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wide">🗓️ Ton Planning</p>

              {TIME_SLOTS.map((slotTime, i) => {
                const taskId   = slots[i];
                const task     = taskId ? getTask(taskId) : null;
                const conflict = task ? task.durationMin > SLOT_CAPACITY_MIN[i] : false;

                return (
                  <div key={slotTime} className="flex items-stretch gap-3">
                    <span className="w-10 flex items-center text-sm font-mono font-semibold text-text-muted shrink-0">
                      {slotTime}
                    </span>
                    <button
                      onClick={() => handleSlotClick(i)}
                      className={`flex-1 min-h-[52px] rounded-xl border-2 border-dashed transition-all px-3 py-2 ${
                        conflict
                          ? 'border-red-400 bg-red-50 cursor-pointer'
                          : task
                          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10 cursor-pointer'
                          : selected
                          ? 'border-primary/50 bg-blue-50/50 hover:border-primary cursor-pointer'
                          : 'border-border-light bg-background cursor-default'
                      }`}
                    >
                      {task ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{task.emoji}</span>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-text leading-tight">{task.label}</p>
                            <p className="text-xs text-text-muted">{task.duration}</p>
                          </div>
                          {conflict && (
                            <span className="text-xs font-bold text-red-500 shrink-0">⚠️ Conflit</span>
                          )}
                          <span className="text-xs text-text-muted opacity-50">✕</span>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted/50 text-center select-none">
                          {selected ? '✦ Zone de dépôt' : 'Zone de dépôt'}
                        </p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validate button */}
          <button
            onClick={finishGame}
            disabled={placedCount < TASKS.length}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              placedCount === TASKS.length
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-background-card border border-border-light text-text-muted cursor-not-allowed opacity-60'
            }`}
          >
            {placedCount === TASKS.length
              ? '✅ Valider mon planning'
              : `Valider mon planning (${placedCount}/${TASKS.length} tâches placées)`}
          </button>
        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════════

  if (phase === 'results' && result) {
    const mins    = Math.floor(timeUsed / 60);
    const secs    = timeUsed % 60;
    const timeStr = mins > 0 ? `${mins}min ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
    const placedFinal = slots.filter(Boolean).length;

    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-5 py-6">
          <div className="text-center">
            <div className="text-5xl mb-2">🎉</div>
            <h1 className="text-2xl font-bold text-text">Planning Terminé !</h1>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-2xl font-bold text-primary">{timeStr}</p>
              <p className="text-xs text-text-muted mt-1">Temps utilisé</p>
            </div>
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{placedFinal}/{TASKS.length}</p>
              <p className="text-xs text-text-muted mt-1">Tâches placées</p>
            </div>
            <div className="bg-background-card rounded-card border border-border-light p-4 text-center">
              <p className={`text-2xl font-bold ${result.conflicts === 0 ? 'text-green-500' : 'text-red-500'}`}>
                {result.conflicts}
              </p>
              <p className="text-xs text-text-muted mt-1">Conflits</p>
            </div>
          </div>

          {/* Evaluation criteria */}
          <div className="bg-background-card rounded-card border border-border-light p-5 space-y-3">
            <p className="font-bold text-text">📊 Évaluation de ton Planning :</p>
            {result.criteria.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.ok ? '✅' : '⚠️'}</span>
                  <span className="text-sm text-text">{c.label}</span>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${c.ok ? 'text-green-600' : 'text-orange-600'}`}>
                  {c.note}
                </span>
              </div>
            ))}
          </div>

          {/* Score + XP */}
          <div className="bg-background-card rounded-card border border-border-light p-5 text-center">
            <p className="text-6xl font-bold text-primary">{result.score}</p>
            <p className="text-text-muted text-sm">/100</p>
            {xpAwarded > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-yellow-100 border border-yellow-300 text-yellow-700 text-sm font-bold px-4 py-1.5 rounded-full">
                <span>🏆</span>
                <span>+{xpAwarded} XP gagnés</span>
              </div>
            )}
          </div>

          {/* Parkinson lesson */}
          <div className="bg-purple-50 border border-purple-200 rounded-card p-5">
            <p className="font-bold text-purple-800 mb-2">💡 Leçon Parkinson :</p>
            <p className="text-purple-700 text-sm leading-relaxed">
              Tu as planifié 8 heures de tâches en {timeStr}. Sans timer, tu aurais probablement
              passé 20 minutes à réfléchir pour le même résultat. La contrainte de temps t'a
              forcé à décider plus efficacement !
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={resetGame}
              className="py-3 rounded-xl border border-border-light text-text hover:bg-background-card transition-colors font-medium text-sm"
            >
              Rejouer
            </button>
            <button
              onClick={() => setPhase('comparison')}
              className="py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              Voir Planning Idéal
            </button>
            <button
              onClick={() => navigate('/parkinson')}
              className="py-3 rounded-xl border border-border-light text-text hover:bg-background-card transition-colors font-medium text-sm"
            >
              Autre Défi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPARISON
  // ══════════════════════════════════════════════════════════════════════════

  if (phase === 'comparison') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-5 py-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPhase('results')}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              ← Retour
            </button>
            <h2 className="font-bold text-text">📊 Ton Planning vs Planning Idéal</h2>
          </div>

          {/* Comparison table */}
          <div className="bg-background-card rounded-card border border-border-light overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_1fr] border-b border-border-light bg-background">
              <div className="p-3 text-xs font-bold text-text-muted">Heure</div>
              <div className="p-3 text-xs font-bold text-text border-l border-border-light">Ton Planning</div>
              <div className="p-3 text-xs font-bold text-text border-l border-border-light">Planning Idéal</div>
            </div>

            {TIME_SLOTS.map((slotTime, i) => {
              const userTaskId  = slots[i];
              const idealTaskId = IDEAL_SLOT_ORDER[i];
              const userTask    = userTaskId ? getTask(userTaskId) : null;
              const idealTask   = getTask(idealTaskId);
              const isMatch     = userTaskId === idealTaskId;

              return (
                <div
                  key={slotTime}
                  className="grid grid-cols-[60px_1fr_1fr] border-b border-border-light last:border-b-0"
                >
                  <div className="p-3 flex items-center text-sm font-mono font-semibold text-text-muted">
                    {slotTime}
                  </div>
                  <div
                    className={`p-3 border-l border-border-light flex items-center gap-2 ${
                      !userTask ? 'bg-red-50' : isMatch ? '' : 'bg-orange-50'
                    }`}
                  >
                    {userTask ? (
                      <>
                        <span>{userTask.emoji}</span>
                        <span className="text-sm text-text flex-1">{userTask.label}</span>
                        <span>{isMatch ? '✅' : '⚠️'}</span>
                      </>
                    ) : (
                      <span className="text-sm text-text-muted italic">Non placé</span>
                    )}
                  </div>
                  <div className="p-3 border-l border-border-light flex items-center gap-2">
                    <span>{idealTask.emoji}</span>
                    <span className="text-sm text-text">{idealTask.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Why this order */}
          <div className="bg-background-card rounded-card border border-border-light p-5 space-y-3">
            <p className="font-bold text-text">💡 Pourquoi cet ordre est optimal ?</p>
            <ul className="space-y-2 text-sm text-text-muted">
              {[
                ['📧 Emails en premier',             'Court et facile, libère l\'esprit pour les vraies tâches'],
                ['📚 Révision le matin',             'Le cerveau est plus frais et concentré tôt le matin'],
                ['🍽️ Déjeuner à 11h',              'Pause naturelle qui recharge l\'énergie pour l\'après-midi'],
                ['😴 Pause ensuite',                 'Après le déjeuner pour éviter la baisse de vigilance post-repas'],
                ['💻 Projet en milieu d\'après-midi','La concentration est encore disponible'],
                ['🏃 Sport en dernier',              'Décompresse et libère les tensions de la journée'],
              ].map(([title, desc]) => (
                <li key={title} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">•</span>
                  <span>
                    <strong className="text-text">{title}</strong> — {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="flex-1 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
            >
              Rejouer
            </button>
            <button
              onClick={() => navigate('/parkinson')}
              className="flex-1 py-3 rounded-xl border border-border-light text-text hover:bg-background-card transition-colors font-medium"
            >
              Autre Défi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}
