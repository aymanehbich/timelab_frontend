import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Adjust to your Laravel backend URL
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't automatically redirect on 401 - let the auth context handle it
    // This prevents race conditions during login/logout
    return Promise.reject(error);
  }
);

// Gamification API endpoints
export const gamificationApi = {
  // Get user stats (total points, badges, level)
  getStats: () => api.get('/stats'),
  
  // Get leaderboard (top 10 users)
  getLeaderboard: () => api.get('/leaderboard'),
  
  // Award points to user
  awardPoints: (amount: number) => api.post('/award-points', { amount }),
  
  // Get points history
  getPointsHistory: () => api.get('/points-history'),
  
  // Get user badges
  getUserBadges: () => api.get('/user-badges'),
  
  // Get user level
  getLevel: () => api.get('/level'),
};


export default api;

// ============================================
// TIME BLOCKING API 
// ============================================

// Types/Interfaces - ALL EXPORTED
export interface Task {
  id: string;
  title: string;
  duration: number;
  color: string;
}

export interface TimeBlock {
  id: string;
  task: Task;
  startHour: number;
  endHour: number;
  completed: boolean;
  blockDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBlockCreate {
  task: {
    title: string;
    duration: number;
    color: string;
  };
  startHour: number;
  endHour: number;
  blockDate?: string;
}

export interface TimeBlockUpdate {
  completed?: boolean;
  task?: {
    title?: string;
    duration?: number;
    color?: string;
  };
  startHour?: number;
  endHour?: number;
}

export interface Statistics {
  date: string;
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
  xp: number;
  isPerfectDay: boolean;
}

// Time Block API Service
export const timeBlockAPI = {
  /**
   * Get all time blocks for a specific date (defaults to today)
   * GET /time-blocks?date=2024-01-15
   */
  async getAll(date?: string): Promise<TimeBlock[]> {
    try {
      const params = date ? { date } : {};
      const response = await api.get('/time-blocks', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching time blocks:', error);
      throw error;
    }
  },

  /**
   * Get a specific time block by ID
   * GET /time-blocks/{id}
   */
  async getById(id: string): Promise<TimeBlock> {
    try {
      const response = await api.get(`/time-blocks/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching time block:', error);
      throw error;
    }
  },

  /**
   * Create a new time block
   * POST /time-blocks
   */
  async create(data: TimeBlockCreate): Promise<TimeBlock> {
    try {
      const response = await api.post('/time-blocks', data);
      return response.data;
    } catch (error) {
      console.error('Error creating time block:', error);
      throw error;
    }
  },

  /**
   * Update an existing time block
   * PATCH /time-blocks/{id}
   */
  async update(id: string, data: TimeBlockUpdate): Promise<TimeBlock> {
    try {
      const response = await api.patch(`/time-blocks/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating time block:', error);
      throw error;
    }
  },

  /**
   * Mark a time block as completed
   */
  async markComplete(id: string): Promise<TimeBlock> {
    return this.update(id, { completed: true });
  },

  /**
   * Mark a time block as incomplete
   */
  async markIncomplete(id: string): Promise<TimeBlock> {
    return this.update(id, { completed: false });
  },

  /**
   * Delete a time block
   * DELETE /time-blocks/{id}
   */
  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/time-blocks/${id}`);
    } catch (error) {
      console.error('Error deleting time block:', error);
      throw error;
    }
  },

  /**
   * Bulk update multiple time blocks
   * POST /time-blocks/bulk-update
   */
  async bulkUpdate(ids: string[], completed: boolean): Promise<{ updated_count: number }> {
    try {
      const response = await api.post('/time-blocks/bulk-update', {
        ids,
        completed,
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating time blocks:', error);
      throw error;
    }
  },

  /**
   * Get statistics for a specific date
   * GET /time-blocks-statistics?date=2024-01-15
   */
  async getStatistics(date?: string): Promise<Statistics> {
    try {
      const params = date ? { date } : {};
      const response = await api.get('/time-blocks-statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}
