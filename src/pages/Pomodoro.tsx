import Layout from '../components/layout/Layout';
import React, { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';

// ─────────────────────────────────────────────
// Service API
// ─────────────────────────────────────────────
const pomodoroService = {
  startSession: async (taskName: string, type: string, duration: number) => {
    console.log('📤 [API] startSession envoyé', { task_name: taskName, type, duration });
    const res = await fetch('http://localhost:8000/api/pomodoro/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ task_name: taskName, type, duration }),
    });
    const data = await res.json();
    console.log('📥 [API] startSession réponse', { status: res.status, data });
    if (!res.ok) throw new Error(`start failed ${res.status}: ${JSON.stringify(data)}`);
    return data;
  },

  completeSession: async (sessionId: number) => {
    console.log('📤 [API] completeSession envoyé', { session_id: sessionId });
    const res = await fetch('http://localhost:8000/api/pomodoro/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const data = await res.json();
    console.log('📥 [API] completeSession réponse', { status: res.status, data });
    if (!res.ok) throw new Error(`complete failed ${res.status}: ${JSON.stringify(data)}`);
    return data;
  },

  interruptSession: async (sessionId: number) => {
    console.log('📤 [API] interruptSession envoyé', { session_id: sessionId });
    const res = await fetch('http://localhost:8000/api/pomodoro/interrupt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const data = await res.json();
    console.log('📥 [API] interruptSession réponse', { status: res.status, data });
    if (!res.ok) throw new Error(`interrupt failed ${res.status}: ${JSON.stringify(data)}`);
    return data;
  },
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface RewardToast {
  points: number;
  multiplier: number;
  streak: number;
  newBadge: string | null;
}

interface BreakSuggestion {
  nextMode: 'shortBreak' | 'longBreak';
  breakLabel: string;
  workCount: number;
  isCycleEnd: boolean;
  tip: string;
}

// ─────────────────────────────────────────────
// Tips
// ─────────────────────────────────────────────
const SHORT_TIPS = [
  '💧 Drink a glass of water.',
  '🧘 Close your eyes for 30 seconds.',
  '🚶 Stand up and walk a little.',
  '😮‍💨 Take three deep breaths.',
  '👀 Look into the distance to rest your eyes.',
];

const LONG_TIPS = [
  '🍎 Eat something healthy.',
  '🚶 Take a real 5-minute walk.',
  '🧘 Stretch your back and shoulders.',
  '☕ Make yourself a hot drink.',
  '🌿 Go outside for some fresh air if possible.',
];

const randomTip = (tips: string[]) =>
  tips[Math.floor(Math.random() * tips.length)];

// ─────────────────────────────────────────────
// Modes
// ─────────────────────────────────────────────
const MODES = {
  pomodoro:   { label: 'work',        duration: 25 * 60, type: 'work'       },
  shortBreak: { label: 'short break', duration:  5 * 60, type: 'break'      },
  longBreak:  { label: 'long break',  duration: 15 * 60, type: 'long_break' },
} as const;

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
function PomodoroTimer(): JSX.Element {
  type ModeKey = keyof typeof MODES;

  // — Timer —
  const [mode, setMode]           = useState<ModeKey>('pomodoro');
  const [timeLeft, setTimeLeft]   = useState<number>(MODES.pomodoro.duration);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef               = useRef<number | null>(null);

  // — Tâche —
  const [taskName, setTaskName]   = useState<string>('');
  const [sessionId, setSessionId] = useState<number | null>(null);

  // ── Refs pour éviter stale closure ──
  const modeRef      = useRef<ModeKey>('pomodoro');
  const sessionIdRef = useRef<number | null>(null);
  const workCountRef = useRef<number>(0);

  // ── FIX PRINCIPAL : ref vers handleComplete ──
  // Permet au useEffect du timer de toujours appeler
  // la VERSION ACTUELLE de handleComplete sans en dépendre
  const handleCompleteRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    sessionIdRef.current = sessionId;
    console.log('🔄 [STATE] sessionId mis à jour :', sessionId);
  }, [sessionId]);

  // — Cycle —
  const [workCount, setWorkCount] = useState<number>(0);

  // — UI —
  const [showSettings, setShowSettings]       = useState<boolean>(false);
  const [showConfetti, setShowConfetti]       = useState<boolean>(false);
  const [rewardToast, setRewardToast]         = useState<RewardToast | null>(null);
  const [breakSuggestion, setBreakSuggestion] = useState<BreakSuggestion | null>(null);
  const [isLoading, setIsLoading]             = useState<boolean>(false);
  const [windowSize, setWindowSize]           = useState({ width: 0, height: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🔑 [AUTH] Token au montage :', token ? `présent (${token.substring(0, 20)}...)` : 'MANQUANT ❌');
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // — Changer de mode —
  const handleModeChange = (newMode: ModeKey) => {
    console.log('🔄 [MODE] Changement vers :', newMode, '| sessionId :', sessionIdRef.current);
    if (sessionIdRef.current !== null && isRunning) {
      pomodoroService.interruptSession(sessionIdRef.current).catch(console.error);
      setSessionId(null);
      sessionIdRef.current = null;
    }
    setMode(newMode);
    modeRef.current = newMode;
    setIsRunning(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(MODES[newMode].duration);
    setTaskName('');
    setBreakSuggestion(null);
  };

  // ─────────────────────────────────────────────
  // handleComplete — fonction normale (pas useCallback)
  // Lit les refs → toujours les valeurs actuelles
  // ─────────────────────────────────────────────
  const handleComplete = async () => {
    const currentMode      = modeRef.current;
    const currentSessionId = sessionIdRef.current;

    console.log('⏱️ [COMPLETE] Timer terminé', {
      mode:      currentMode,
      sessionId: currentSessionId,
    });

    if (currentMode === 'pomodoro') {

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);

      const newCount   = workCountRef.current + 1;
      const isCycleEnd = newCount % 4 === 0;
      workCountRef.current = isCycleEnd ? 0 : newCount;
      setWorkCount(workCountRef.current);

      const nextMode   = isCycleEnd ? 'longBreak' : 'shortBreak';
      const breakLabel = isCycleEnd ? '15 min' : '5 min';
      const tip        = randomTip(isCycleEnd ? LONG_TIPS : SHORT_TIPS);

      if (currentSessionId !== null) {
        try {
          const data = await pomodoroService.completeSession(currentSessionId);
          setRewardToast({
            points:     data.points_earned  ?? 25,
            multiplier: data.multiplier     ?? 1,
            streak:     data.current_streak ?? 0,
            newBadge:   data.new_badge      ?? null,
          });
          setTimeout(() => setRewardToast(null), 4000);
        } catch (err) {
          console.error('❌ [COMPLETE] Erreur API:', err);
        } finally {
          setSessionId(null);
          sessionIdRef.current = null;
        }
      } else {
        console.warn('⚠️ [COMPLETE] sessionId est null');
      }

      setBreakSuggestion({ nextMode, breakLabel, workCount: newCount, isCycleEnd, tip });

    } else {
      setMode('pomodoro');
      modeRef.current = 'pomodoro';
      setTimeLeft(MODES.pomodoro.duration);
    }
  };

  // ── Mettre à jour la ref à chaque render ──
  // Ainsi le timer appelle toujours la version fraîche
  handleCompleteRef.current = handleComplete;

  // ─────────────────────────────────────────────
  // Timer useEffect
  // Dépendance : seulement [isRunning]
  // handleComplete appelé via sa REF → pas de dépendance
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      console.log('▶️ [TIMER] setInterval démarré');
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current !== null) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsRunning(false);
            // Appel via REF → version actuelle, pas de stale closure
            setTimeout(() => handleCompleteRef.current(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        console.log('⏸️ [TIMER] setInterval arrêté');
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]); // ← seulement isRunning, plus handleComplete

  // — Accepter la pause —
  const handleAcceptBreak = () => {
    if (!breakSuggestion) return;
    const next = breakSuggestion.nextMode;
    setBreakSuggestion(null);
    setMode(next);
    modeRef.current = next;
    setTimeLeft(MODES[next].duration);
    setTaskName('');
    setSessionId(null);
    sessionIdRef.current = null;
    setTimeout(() => setIsRunning(true), 300);
  };

  // — Ignorer la pause —
  const handleSkipBreak = () => {
    setBreakSuggestion(null);
    setTimeLeft(MODES.pomodoro.duration);
    setTaskName('');
  };

  // — Start / Pause —
  const handleStartPause = async () => {
    console.log('▶️ [START/PAUSE] Clic', {
      isRunning,
      sessionId: sessionIdRef.current,
      mode,
      token: localStorage.getItem('token') ? 'présent' : 'MANQUANT ❌',
    });

    if (!isRunning) {
      if (sessionIdRef.current === null && mode === 'pomodoro') {
        setIsLoading(true);
        try {
          const data = await pomodoroService.startSession(
            taskName.trim() || 'Sans nom',
            MODES[mode].type,
            MODES[mode].duration / 60,
          );
          console.log('✅ [START] Session créée :', data.session_id);
          setSessionId(data.session_id);
          sessionIdRef.current = data.session_id;
        } catch (err) {
          console.error('❌ [START] Erreur API:', err);
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      }
      setIsRunning(true);

    } else {
      console.log('⏸️ [PAUSE] sessionId conservé :', sessionIdRef.current);
      setIsRunning(false);
    }
  };

  // — Reset —
  const handleReset = async () => {
    console.log('🔄 [RESET] Clic', { sessionId: sessionIdRef.current, timeLeft });

    if (sessionIdRef.current !== null && timeLeft > 0) {
      try {
        await pomodoroService.interruptSession(sessionIdRef.current);
        console.log('✅ [RESET] Interruption enregistrée');
      } catch (err) {
        console.error('❌ [RESET] Erreur interrupt:', err);
      } finally {
        setSessionId(null);
        sessionIdRef.current = null;
      }
    } else {
      console.log('ℹ️ [RESET] Pas d\'appel API (sessionId null ou timer à 0)');
    }

    setIsRunning(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(MODES[mode].duration);
    setTaskName('');
    setBreakSuggestion(null);
  };

  const format = (s: number) => {
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isAtStart = timeLeft === MODES[mode].duration && !isRunning;

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-white">

      {showConfetti && (
        <Confetti width={windowSize.width} height={windowSize.height}
          recycle={false} numberOfPieces={300} />
      )}

      {rewardToast && (
        <div className="fixed bottom-6 right-6 bg-black text-white rounded-2xl p-5
                        shadow-2xl z-40 max-w-xs">
          <p className="text-2xl font-bold">+{rewardToast.points} pts 🎉</p>
          {rewardToast.multiplier > 1 && (
            <p className="text-yellow-400 text-sm mt-1">
              🔥 Bonus x{rewardToast.multiplier} — {rewardToast.streak} consecutive days
            </p>
          )}
          {rewardToast.newBadge && (
            <p className="text-green-400 font-bold mt-2">
              Badge unlocked: {rewardToast.newBadge}
            </p>
          )}
        </div>
      )}

      {breakSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
            <div className="text-6xl mb-3">
              {breakSuggestion.isCycleEnd ? '🏆' : '☕'}
            </div>
            <h2 className="text-2xl font-bold text-black mb-1">
              {breakSuggestion.isCycleEnd ? 'Cycle completed!' : 'Great work!'}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {breakSuggestion.isCycleEnd
                ? '4 pomodoros completed 🎉'
                : `Pomodoro ${breakSuggestion.workCount} / 4 completed`}
            </p>
            <p className="text-gray-700 font-medium mb-5">
              {breakSuggestion.isCycleEnd
                ? `You deserve a long break of ${breakSuggestion.breakLabel}!`
                : `Take a ${breakSuggestion.breakLabel} break, you deserve it!`}
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-5">
              <p className="text-sm text-gray-500">{breakSuggestion.tip}</p>
            </div>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}
                  className={`w-3 h-3 rounded-full transition-colors duration-300
                    ${i <= breakSuggestion.workCount ? 'bg-black' : 'bg-black/15'}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleAcceptBreak}
                className="flex-1 py-3 rounded-full bg-black text-white font-bold text-sm
                           hover:scale-105 active:scale-95 transition-transform duration-150 shadow-lg">
                {breakSuggestion.isCycleEnd ? '😴' : '☕'} Break {breakSuggestion.breakLabel}
              </button>
              <button onClick={handleSkipBreak}
                className="px-5 py-3 rounded-full border-2 border-black/15 text-black/50
                           font-medium text-sm hover:bg-gray-100 transition-colors duration-150">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-6 w-full max-w-md px-4">

        <div className="flex gap-3">
          {Object.entries(MODES).map(([key, val]) => (
            <button key={key}
              onClick={() => handleModeChange(key as ModeKey)}
              className={`px-5 py-2 rounded-full text-sm font-semibold
                          transition-all duration-200 border-2
                ${mode === (key as ModeKey)
                  ? 'bg-black text-white border-black shadow-lg'
                  : 'bg-white text-black border-black/70 hover:bg-gray-100'}`}>
              {val.label}
            </button>
          ))}
        </div>

        {mode === 'pomodoro' && (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300
                  ${i <= workCount ? 'bg-black' : 'bg-black/15'}`}
              />
            ))}
          </div>
        )}

        {mode === 'pomodoro' && isAtStart && (
          <div className="w-full">
            <input type="text" value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartPause()}
              placeholder="What are you working on?"
              maxLength={80}
              className="w-full px-5 py-3 rounded-full border-2 border-black/20
                         text-center text-sm font-medium outline-none
                         focus:border-black transition-colors bg-gray-50
                         placeholder:text-gray-400"
                         required
            />
          </div>
        )}

        {mode === 'pomodoro' && !isAtStart && taskName && (
          <p className="text-black/50 text-sm font-medium tracking-wide">
            🍅 {taskName}
          </p>
        )}

        <div className="text-black font-bold select-none"
          style={{
            fontSize: 'clamp(80px, 18vw, 160px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: "'Georgia', serif",
          }}>
          {format(timeLeft)}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleStartPause} disabled={isLoading}
            className="px-10 py-3 rounded-full bg-black text-white font-bold text-lg
                       shadow-lg hover:scale-105 active:scale-95 transition-transform
                       duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? '...' : isRunning ? 'pause' : 'start'}
          </button>

          <button onClick={handleReset}
            className="w-11 h-11 flex items-center justify-center rounded-full
                       text-black hover:bg-gray-200 transition-colors duration-150"
            title="Reset">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993
                   0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25
                   0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          <button onClick={() => setShowSettings((s) => !s)}
            className="w-11 h-11 flex items-center justify-center rounded-full
                       text-black hover:bg-gray-200 transition-colors duration-150"
            title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213
                   1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257
                   1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125
                   0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1
                   0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298
                   2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076
                   .124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c
                   -.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c
                   -.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72
                   -.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a
                   1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932
                   6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125
                   0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356
                   .133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644
                   -.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>

        {showSettings && (
          <div className="bg-gray-100 rounded-2xl p-5 w-72 shadow-lg border border-black/20">
            <h3 className="text-black font-bold text-base mb-4">Settings</h3>
            <div className="space-y-3 text-sm text-black">
              {Object.entries(MODES).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{val.label}</span>
                  <span className="font-semibold">{val.duration / 60} min</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSettings(false)}
              className="mt-4 w-full py-2 rounded-lg bg-black text-white text-sm
                         font-semibold hover:bg-gray-800 transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pomodoro(): JSX.Element {
  return (
    <Layout>
      <PomodoroTimer />
    </Layout>
  );
}