interface Challenge {
  id: number;
  title: string;
  status: string;
  accuracy_percentage?: number;
}

interface Accuracy {
  average_accuracy: number;
  total_challenges: number;
  high_accuracy_count: number;
}

interface AccuracyChartProps {
  challenges: Challenge[];
  accuracy: Accuracy | null;
}

export default function AccuracyChart({ challenges, accuracy }: AccuracyChartProps) {
  const completedChallenges = challenges
    .filter((c) => c.status === 'completed' && c.accuracy_percentage)
    .slice(-10)
    .reverse();

  const maxAccuracy = 100;

  return (
    <div className="bg-background-card rounded-card border border-border-light p-6">
      <h2 className="text-xl font-semibold mb-6 text-text">
        Accuracy Statistics
      </h2>

      {/* Overall Stats */}
      {accuracy && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-primary/10 rounded-button p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {accuracy.average_accuracy}%
            </div>
            <div className="text-sm text-text-muted mt-1">Average Accuracy</div>
          </div>
          <div className="bg-green-500/10 rounded-button p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {accuracy.high_accuracy_count}
            </div>
            <div className="text-sm text-text-muted mt-1">High Accuracy (90%+)</div>
          </div>
          <div className="bg-background-secondary rounded-button p-4 text-center">
            <div className="text-3xl font-bold text-text">
              {accuracy.total_challenges}
            </div>
            <div className="text-sm text-text-muted mt-1">Total Challenges</div>
          </div>
        </div>
      )}

      {/* Simple Bar Chart */}
      {completedChallenges.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text mb-4">
            Last 10 Challenges
          </h3>
          {completedChallenges.map((challenge) => (
            <div key={challenge.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text truncate flex-1 mr-2">
                  {challenge.title}
                </span>
                <span
                  className={`font-semibold ${
                    challenge.accuracy_percentage! >= 90
                      ? 'text-green-600'
                      : challenge.accuracy_percentage! >= 70
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {Math.round(challenge.accuracy_percentage!)}%
                </span>
              </div>
              <div className="w-full bg-background-secondary rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    challenge.accuracy_percentage! >= 90
                      ? 'bg-green-500'
                      : challenge.accuracy_percentage! >= 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${
                      (challenge.accuracy_percentage! / maxAccuracy) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-muted">
          <p>Complete challenges to see accuracy statistics</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-text-muted">90%+ (High)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-text-muted">70-89% (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-text-muted">&lt;70% (Needs Improvement)</span>
        </div>
      </div>

      {/* Insights */}
      {accuracy && accuracy.average_accuracy > 0 && (
        <div className="mt-6 p-4 bg-primary/10 rounded-button">
          <p className="text-sm text-text">
            {accuracy.average_accuracy >= 80 ? (
              <>
                <strong>Excellent!</strong> Your estimation skills are very good.
                Keep challenging yourself with more complex tasks.
              </>
            ) : accuracy.average_accuracy >= 60 ? (
              <>
                <strong>Good progress!</strong> You're getting better at
                estimating. Try to identify patterns in your over/underestimations.
              </>
            ) : (
              <>
                <strong>Keep practicing!</strong> Time estimation is a skill that
                improves with practice. Focus on breaking tasks into smaller chunks.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
