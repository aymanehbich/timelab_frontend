import Layout from '../components/layout/Layout';
import React, { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';

const MODES = {
  pomodoro: { label: 'work', duration: 25 * 60 },
  shortBreak: { label: 'short break', duration: 5 * 60 },
  longBreak: { label: 'long break', duration: 15 * 60 },
} as const;

function PomodoroTimer(): JSX.Element {
  type ModeKey = keyof typeof MODES;
  const [mode, setMode] = useState<ModeKey>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(MODES.pomodoro.duration);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleModeChange = (newMode: ModeKey) => {
    setMode(newMode);
    setIsRunning(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(MODES[newMode].duration);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current !== null) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsRunning(false);
            if (mode === 'pomodoro') {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
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
  }, [isRunning, mode]);

  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(MODES[mode].duration);
  };

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-white">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} />}
      <div className="flex flex-col items-center gap-8">
        <div className="flex gap-3">
          {Object.entries(MODES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => handleModeChange(key as ModeKey)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2
                ${mode === (key as ModeKey)
                  ? 'bg-black text-white border-black shadow-lg'
                  : 'bg-white text-black border-black/70 hover:bg-gray-100'
                }`}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div
          className="text-black font-bold select-none"
          style={{
            fontSize: 'clamp(80px, 18vw, 160px)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: "'Georgia', serif",
          }}
        >
          {format(timeLeft)}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsRunning((r) => !r)}
            className="px-10 py-3 rounded-full bg-black text-white font-bold text-lg shadow-lg
              hover:scale-105 active:scale-95 transition-transform duration-150"
          >
            {isRunning ? 'pause' : 'start'}
          </button>

          <button
            onClick={handleReset}
            className="w-11 h-11 flex items-center justify-center rounded-full text-black
              hover:bg-gray-200 transition-colors duration-150"
            title="Reset"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          <button
            onClick={() => setShowSettings((s) => !s)}
            className="w-11 h-11 flex items-center justify-center rounded-full text-black
              hover:bg-gray-200 transition-colors duration-150"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
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
