import api from './api';

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
 * Service for Parkinson's Law features
 * Manages challenges and time estimations
 */
const parkinsonService = {
  /**
   * Get all challenges for the current user
   * @param status - Optional filter by status (in_progress, completed, failed)
   * @returns List of challenges
   */
  getChallenges: (status: string | null = null) => {
    const params = status ? { status } : {};
    return api.get('/parkinson/challenges', { params });
  },

  /**
   * Create a new challenge
   * @param data - Challenge data
   * @returns Created challenge
   */
  createChallenge: (data: ChallengeData) => {
    return api.post('/parkinson/challenges', data);
  },

  /**
   * Start a challenge
   * @param id - Challenge ID
   * @returns Updated challenge
   */
  startChallenge: (id: number) => {
    return api.post(`/parkinson/challenges/${id}/start`);
  },

  /**
   * Complete a challenge
   * @param id - Challenge ID
   * @param data - Completion data
   * @returns Updated challenge with accuracy
   */
  completeChallenge: (id: number, data: CompleteData) => {
    return api.post(`/parkinson/challenges/${id}/complete`, data);
  },

  /**
   * Get user's accuracy statistics
   * @returns Accuracy data
   */
  getAccuracy: () => {
    return api.get('/parkinson/accuracy');
  },

  /**
   * Get detailed statistics
   * @returns Statistics data
   */
  getStats: () => {
    return api.get('/parkinson/stats');
  },
};

export default parkinsonService;
