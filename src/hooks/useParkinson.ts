import { useState, useEffect, useCallback } from 'react';
import parkinsonService from '../services/parkinsonService';

interface Challenge {
  id: number;
  title: string;
  description?: string;
  estimated_duration: number;
  actual_duration?: number;
  status: 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  accuracy_percentage?: number;
  created_at: string;
}

interface Stats {
  total_challenges: number;
  completed: number;
  in_progress: number;
  failed: number;
  average_accuracy: number;
  completion_rate: number;
  time_stats?: {
    total_estimated_minutes: number;
    total_actual_minutes: number;
    average_estimated_minutes: number;
    average_actual_minutes: number;
    tendency: string;
  };
  recent_challenges: Challenge[];
}

interface Accuracy {
  average_accuracy: number;
  total_challenges: number;
  high_accuracy_count: number;
}

interface ChallengeData {
  title: string;
  description: string;
  estimated_duration: number;
}

interface CompleteData {
  actual_duration: number;
  success: boolean;
}

/**
 * Custom hook for Parkinson's Law features
 * Manages challenges state and operations
 */
export const useParkinson = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all challenges
   */
  const fetchChallenges = useCallback(async (status: string | null = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await parkinsonService.getChallenges(status);
      setChallenges(response.data.challenges || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch challenges');
      console.error('Error fetching challenges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new challenge
   */
  const createChallenge = useCallback(async (data: ChallengeData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await parkinsonService.createChallenge(data);
      setChallenges((prev) => [response.data.challenge, ...prev]);
      return response.data.challenge;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create challenge');
      console.error('Error creating challenge:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Start a challenge
   */
  const startChallenge = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await parkinsonService.startChallenge(id);
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? response.data.challenge : c))
      );
      return response.data.challenge;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to start challenge');
      console.error('Error starting challenge:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Complete a challenge
   */
  const completeChallenge = useCallback(async (id: number, data: CompleteData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await parkinsonService.completeChallenge(id, data);
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? response.data.challenge : c))
      );
      // Refresh stats and accuracy after completion
      fetchStats();
      fetchAccuracy();
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to complete challenge');
      console.error('Error completing challenge:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await parkinsonService.getStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  /**
   * Fetch accuracy
   */
  const fetchAccuracy = useCallback(async () => {
    try {
      const response = await parkinsonService.getAccuracy();
      setAccuracy(response.data);
    } catch (err) {
      console.error('Error fetching accuracy:', err);
    }
  }, []);

  /**
   * Get active challenge
   */
  const getActiveChallenge = useCallback(() => {
    return challenges.find(
      (c) => c.status === 'in_progress' && c.started_at
    );
  }, [challenges]);

  /**
   * Initialize data on mount
   */
  useEffect(() => {
    fetchChallenges();
    fetchStats();
    fetchAccuracy();
  }, [fetchChallenges, fetchStats, fetchAccuracy]);

  return {
    challenges,
    stats,
    accuracy,
    loading,
    error,
    fetchChallenges,
    createChallenge,
    startChallenge,
    completeChallenge,
    fetchStats,
    fetchAccuracy,
    getActiveChallenge,
  };
};

export default useParkinson;
