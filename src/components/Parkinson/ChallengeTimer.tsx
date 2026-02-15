import { useState, useEffect, useRef } from 'react';

interface Challenge {
  id: number;
  title: string;
  description?: string;
  estimated_duration: number;
}

interface ChallengeTimerProps {
  challenge: Challenge;
  onComplete: (data: { actual_duration: number; success: boolean }) => void;
  onCancel?: () => void;
}

export default function ChallengeTimer({ challenge, onComplete, onCancel }: ChallengeTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const estimatedSeconds = challenge.estimated_duration * 60;
  const percentage = Math.min((elapsed / estimatedSeconds) * 100, 100);
  const isOvertime = elapsed > estimatedSeconds;

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    const actualMinutes = Math.ceil(elapsed / 60);
    onComplete({
      actual_duration: actualMinutes,
      success: true,
    });
  };

  const handleFail = () => {
    const actualMinutes = Math.ceil(elapsed / 60);
    onComplete({
      actual_duration: actualMinutes,
      success: false,
    });
  };

  return (
    <div className="bg-background-card rounded-card border border-border-light p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text">{challenge.title}</h3>
        {challenge.description && (
          <p className="text-text-muted mt-1 text-sm">{challenge.description}</p>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div
          className={`text-5xl font-bold mb-2 ${
            isOvertime ? 'text-red-500' : 'text-primary'
          }`}
        >
          {formatTime(elapsed)}
        </div>
        <div className="text-sm text-text-muted">
          Estimated: {challenge.estimated_duration} minutes
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-background-secondary rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOvertime ? 'bg-red-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>0%</span>
          <span>{Math.round(percentage)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Overtime Alert */}
      {isOvertime && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-button p-3 mb-4">
          <p className="text-red-600 text-sm font-medium">
            ⚠️ You've exceeded the estimated time by{' '}
            {Math.ceil((elapsed - estimatedSeconds) / 60)} minutes
          </p>
        </div>
      )}

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-background-secondary rounded-button">
        <div>
          <div className="text-xs text-text-muted">Estimated</div>
          <div className="text-lg font-semibold text-text">
            {challenge.estimated_duration} min
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted">Actual</div>
          <div
            className={`text-lg font-semibold ${
              isOvertime ? 'text-red-500' : 'text-primary'
            }`}
          >
            {Math.ceil(elapsed / 60)} min
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex-1 bg-background-secondary text-text py-2.5 px-4 rounded-button hover:bg-border transition-colors font-medium text-sm"
        >
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        <button
          onClick={handleComplete}
          className="flex-1 bg-primary text-white py-2.5 px-4 rounded-button hover:bg-primary-hover transition-colors font-medium text-sm"
        >
          ✅ Complete
        </button>
        <button
          onClick={handleFail}
          className="flex-1 bg-red-500 text-white py-2.5 px-4 rounded-button hover:bg-red-600 transition-colors font-medium text-sm"
        >
          ❌ Failed
        </button>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-3 text-text-muted hover:text-text text-sm transition-colors"
        >
          Cancel Challenge
        </button>
      )}
    </div>
  );
}
