import { useState } from 'react';
import ChallengeCard from './ChallengeCard';

interface Challenge {
  id: number;
  title: string;
  description?: string;
  estimated_duration: number;
  actual_duration?: number;
  status: 'in_progress' | 'completed' | 'failed';
  accuracy_percentage?: number;
  created_at: string;
  completed_at?: string;
}

interface ChallengeListProps {
  challenges: Challenge[];
}

export default function ChallengeList({ challenges }: ChallengeListProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'failed'>('all');

  const filteredChallenges = challenges.filter((challenge) => {
    if (filter === 'all') return true;
    return challenge.status === filter;
  });

  const stats = {
    total: challenges.length,
    completed: challenges.filter((c) => c.status === 'completed').length,
    in_progress: challenges.filter((c) => c.status === 'in_progress').length,
    failed: challenges.filter((c) => c.status === 'failed').length,
  };

  return (
    <div className="bg-background-card rounded-card border border-border-light p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-text">Challenge History</h2>
        <span className="text-sm text-text-muted">
          {filteredChallenges.length} challenges
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-background-secondary rounded-button p-3 text-center">
          <div className="text-2xl font-bold text-text">{stats.total}</div>
          <div className="text-xs text-text-muted">Total</div>
        </div>
        <div className="bg-green-500/10 rounded-button p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.completed}
          </div>
          <div className="text-xs text-text-muted">Completed</div>
        </div>
        <div className="bg-primary/10 rounded-button p-3 text-center">
          <div className="text-2xl font-bold text-primary">
            {stats.in_progress}
          </div>
          <div className="text-xs text-text-muted">In Progress</div>
        </div>
        <div className="bg-red-500/10 rounded-button p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-text-muted">Failed</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-button text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-text-secondary hover:bg-border'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-button text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-green-500 text-white'
              : 'bg-background-secondary text-text-secondary hover:bg-border'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-button text-sm font-medium transition-colors ${
            filter === 'in_progress'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-text-secondary hover:bg-border'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-4 py-2 rounded-button text-sm font-medium transition-colors ${
            filter === 'failed'
              ? 'bg-red-500 text-white'
              : 'bg-background-secondary text-text-secondary hover:bg-border'
          }`}
        >
          Failed
        </button>
      </div>

      {/* Challenge Cards */}
      {filteredChallenges.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p>No challenges found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
}
