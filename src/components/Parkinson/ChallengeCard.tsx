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

interface ChallengeCardProps {
  challenge: Challenge;
}

export default function ChallengeCard({ challenge }: ChallengeCardProps) {
  const getStatusBadge = () => {
    const badges = {
      completed: 'bg-green-500/10 text-green-600 border-green-500/30',
      failed: 'bg-red-500/10 text-red-600 border-red-500/30',
      in_progress: 'bg-primary/10 text-primary border-primary/30',
    };
    return badges[challenge.status] || 'bg-background-secondary text-text-muted';
  };

  const getAccuracyBadge = () => {
    if (!challenge.accuracy_percentage) return null;

    const accuracy = challenge.accuracy_percentage;
    let color = 'bg-red-500/10 text-red-600';
    if (accuracy >= 90) color = 'bg-green-500/10 text-green-600';
    else if (accuracy >= 70) color = 'bg-yellow-500/10 text-yellow-600';

    return (
      <span className={`px-2 py-1 rounded-button text-xs font-medium ${color}`}>
        {Math.round(accuracy)}% accurate
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDifference = () => {
    if (!challenge.actual_duration || !challenge.estimated_duration)
      return null;
    const diff = challenge.actual_duration - challenge.estimated_duration;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff} min`;
  };

  return (
    <div className="bg-background-card rounded-card border border-border-light p-4 hover:border-primary/30 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-base font-semibold text-text flex-1 line-clamp-1">
          {challenge.title}
        </h3>
        <span className={`px-2 py-1 rounded-button text-xs font-medium border ${getStatusBadge()}`}>
          {challenge.status.replace('_', ' ')}
        </span>
      </div>

      {/* Description */}
      {challenge.description && (
        <p className="text-text-muted text-sm mb-3 line-clamp-2">
          {challenge.description}
        </p>
      )}

      {/* Time Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-background-secondary rounded-button p-2">
          <div className="text-xs text-text-muted">Estimated</div>
          <div className="text-base font-semibold text-text">
            {challenge.estimated_duration} min
          </div>
        </div>
        <div className="bg-background-secondary rounded-button p-2">
          <div className="text-xs text-text-muted">Actual</div>
          <div className="text-base font-semibold text-text">
            {challenge.actual_duration || '-'} min
          </div>
        </div>
      </div>

      {/* Accuracy Badge */}
      {getAccuracyBadge() && (
        <div className="mb-3">{getAccuracyBadge()}</div>
      )}

      {/* Difference Badge */}
      {getDifference() && (
        <div className="mb-3">
          <span
            className={`text-xs font-medium ${
              challenge.actual_duration! > challenge.estimated_duration
                ? 'text-red-500'
                : 'text-green-500'
            }`}
          >
            {getDifference()}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-text-muted pt-3 border-t border-border">
        <span>Created: {formatDate(challenge.created_at)}</span>
        {challenge.completed_at && (
          <span>Completed: {formatDate(challenge.completed_at)}</span>
        )}
      </div>
    </div>
  );
}
