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
