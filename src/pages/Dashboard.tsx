import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { eisenhowerApi } from '../components/eisenhower';
import type { QuizProgress } from '../components/eisenhower';
import api, { gamificationApi } from '../services/api';

interface UserStats {
  total_points: string | number;
  badges_count: number;
  level: {
    id: number;
    name: string;
    required_points: number;
  };
  badges?: Array<{
    id: number;
    name: string;
    icon: string | null;
    required_points: number;
  }>;
}

interface UserLevel {
  level: number;
  current_xp: number;
  xp_for_next_level: number;
  progress_percentage: number;
}

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  level: number;
}

interface TypingStats {
  completed_challenges: number;
  average_accuracy: number;
  average_wpm: number;
  best_wpm: number;
}

export default function Dashboard() {
  const { user } = useAuth();

const [pomodoroStats, setPomodoroStats] = useState({
  today_sessions : 0,
  avg_per_day    : 0,
  best_day       : 0,
  total_sessions : 0
});
const [pomodoroLoading, setPomodoroLoading] = useState(true);

useEffect(() => {
  fetch('http://localhost:8000/api/pomodoro/stats', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Accept': 'application/json',
    },
  })
    .then(res => res.json())
    .then(data => setPomodoroStats(data))
    .catch(console.error)
    .finally(() => setPomodoroLoading(false));
}, []);

  // API data states
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [eisenhowerProgress, setEisenhowerProgress] = useState<QuizProgress | null>(null);
  const [typingStats, setTypingStats] = useState<TypingStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch gamification data
  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        const [statsRes, levelRes, badgesRes, leaderboardRes, eisenhowerRes, typingRes] = await Promise.all([
          gamificationApi.getStats(),
          gamificationApi.getLevel(),
          gamificationApi.getUserBadges(),
          gamificationApi.getLeaderboard(),
          eisenhowerApi.getProgress(),
          api.get('/parkinson/typing/stats'),
        ]);

        setUserStats(statsRes.data);
        setUserLevel(levelRes.data);
        setBadges(badgesRes.data);
        setLeaderboard(leaderboardRes.data);
        const overall = eisenhowerRes?.overall ?? null;
        if (overall && overall.total_tasks > 0) {
          overall.score_percentage = Math.round((overall.correct / overall.total_tasks) * 100);
        }
        setEisenhowerProgress(overall);
        setTypingStats(typingRes.data.data);
      } catch (error) {
        console.error('Failed to fetch gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGamificationData();
  }, []);

  // Derived stats from API data
  const totalFocusTime = pomodoroStats.total_sessions * 25; // 25 min per session
  const tasksCompleted = eisenhowerProgress?.total_tasks ?? 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Loading spinner component
  const Loader = () => (
    <div className="flex items-center justify-center py-6">
      <svg className="w-6 h-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  // Small inline loader
  const SmallLoader = () => (
    <svg className="w-4 h-4 animate-spin text-primary inline-block" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-text-muted mt-1">
              Here's your productivity overview
            </p>
          </div>
          
          {/* Level Badge - Using API Data */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background-card rounded-card border border-border-light">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-background-secondary"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${Math.min((userLevel?.progress_percentage ?? 100), 100) * 1.26} 126`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-text">
                  {loading ? <SmallLoader /> : (userStats?.level?.id ?? userLevel?.level ?? 1)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted">
                {loading ? 'Level' : (userStats?.level?.name ?? 'Level')}
              </p>
              <p className="text-sm font-semibold text-primary">
                {loading ? <SmallLoader /> : `${Number(userStats?.total_points ?? 0).toLocaleString()} XP`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Points - From API */}
          <div className="bg-background-card rounded-card border border-primary/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Points</p>
                <p className="text-xl font-bold text-primary">
                  {loading ? <SmallLoader /> : Number(userStats?.total_points ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Pomodoro Sessions */}
          <div className="bg-background-card rounded-card border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center">
                <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Pomodoros</p>
                <p className="text-xl font-bold text-text">{pomodoroLoading ? <SmallLoader /> : pomodoroStats.total_sessions}</p>
              </div>
            </div>
          </div>

          {/* Focus Time */}
          <div className="bg-background-card rounded-card border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center">
                <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Focus Time</p>
                <p className="text-xl font-bold text-text">{pomodoroLoading ? <SmallLoader /> : formatTime(totalFocusTime)}</p>
              </div>
            </div>
          </div>

          {/* Tasks Completed */}
          <div className="bg-background-card rounded-card border border-border-light p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center">
                <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-muted">Tasks Done</p>
                <p className="text-xl font-bold text-text">{tasksCompleted}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Method Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pomodoro Stats */}
        <div className="bg-background-card rounded-card border border-border-light p-5">
  <div className="flex items-center gap-2 mb-3">
    <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="font-semibold text-text">Pomodoro</h3>
  </div>
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span className="text-text-muted">Today</span>
      <span className="text-text font-medium">
        {pomodoroLoading ? <SmallLoader /> : `${pomodoroStats.today_sessions} sessions`}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-text-muted">Avg/day</span>
      <span className="text-text font-medium">
        {pomodoroLoading ? <SmallLoader /> : `${pomodoroStats.avg_per_day} sessions`}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-text-muted">Best day</span>
      <span className="text-text font-medium">
        {pomodoroLoading ? <SmallLoader /> : `${pomodoroStats.best_day} sessions`}
      </span>
    </div>
  </div>
</div>

          {/* Time Blocking Stats */}
          <div className="bg-background-card rounded-card border border-border-light p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="font-semibold text-text">Time Blocking</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Today's blocks</span>
                <span className="text-text font-medium">6 blocks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Completed</span>
                <span className="text-text font-medium">83%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Planned hours</span>
                <span className="text-text font-medium">5.5h</span>
              </div>
            </div>
          </div>

          {/* Eisenhower Stats */}
          <div className="bg-background-card rounded-card border border-border-light p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <h3 className="font-semibold text-text">Eisenhower</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Score</span>
                <span className="text-primary font-medium">
                  {loading ? <SmallLoader /> : `${eisenhowerProgress?.score_percentage ?? 0}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Correctes</span>
                <span className="text-success font-medium">
                  {loading ? <SmallLoader /> : `${eisenhowerProgress?.correct ?? 0}/${eisenhowerProgress?.total_tasks ?? 0}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Points gagnés</span>
                <span className="text-text font-medium">
                  {loading ? <SmallLoader /> : (eisenhowerProgress?.total_points_earned ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Parkinson Stats */}
          <div className="bg-background-card rounded-card border border-border-light p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-semibold text-text">Parkinson</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Challenges done</span>
                <span className="text-text font-medium">
                  {loading ? <SmallLoader /> : (typingStats?.completed_challenges ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Avg accuracy</span>
                <span className="text-text font-medium">
                  {loading ? <SmallLoader /> : `${Math.round(typingStats?.average_accuracy ?? 0)}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Best WPM</span>
                <span className="text-text font-medium">
                  {loading ? <SmallLoader /> : Math.round(typingStats?.best_wpm ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard & Badges Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard - Using API Data */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text mb-4">🏆 Leaderboard</h2>
            {loading ? (
              <Loader />
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => {
                  const rank = entry.rank ?? index + 1;
                  const displayLevel = entry.level ?? 1;
                  const displayPoints = entry.points ?? 0;
                  const displayName = entry.name || 'Unknown';
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        displayName === user?.name 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'bg-background-secondary/50 hover:bg-background-secondary'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                        rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                        rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-background-secondary text-text-muted'
                      }`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </div>
                      
                      {/* User Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text font-medium truncate">
                          {displayName} {displayName === user?.name && <span className="text-primary">(You)</span>}
                        </p>
                        <p className="text-xs text-text-muted">Level {displayLevel}</p>
                      </div>
                      
                      {/* Points */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{displayPoints.toLocaleString()}</p>
                        <p className="text-xs text-text-muted">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-text-muted">
                <span>No leaderboard data yet</span>
                <span className="text-xs mt-1">Start earning points to compete!</span>
              </div>
            )}
          </div>

          {/* Badges Preview - Using API Data */}
          <div className="bg-background-card rounded-card border border-border-light p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">
                Badges {!loading && <span className="text-sm text-text-muted">({badges.length})</span>}
              </h2>
            </div>
            {loading ? (
              <Loader />
            ) : badges.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center p-3 rounded-button bg-background-secondary min-w-[90px]"
                    title={badge.description}
                  >
                    <span className="text-2xl mb-1">{badge.icon || '🏅'}</span>
                    <span className="text-xs text-text-muted text-center break-words">{badge.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {/* Placeholder badges when no badges earned */}
                {[
                  { name: 'Early Bird', emoji: '🌅' },
                  { name: 'Streak Master', emoji: '🔥' },
                  { name: 'Focus Pro', emoji: '🎯' },
                  { name: 'Time Lord', emoji: '⏰' },
                  { name: 'Achiever', emoji: '🏆' },
                  { name: 'Planner', emoji: '📋' },
                ].map((badge) => (
                  <div
                    key={badge.name}
                    className="flex flex-col items-center p-3 rounded-button bg-background-secondary opacity-40 min-w-[90px]"
                  >
                    <span className="text-2xl mb-1">{badge.emoji}</span>
                    <span className="text-xs text-text-muted text-center break-words">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}