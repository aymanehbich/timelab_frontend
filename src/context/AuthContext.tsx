import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const fetchUser = async () => {
    try {
      const response = await api.get('/user');
      setUser(response.data);
    } catch (error: any) {
      // Only clear token if it's an auth error (401)
      if (error.response?.status === 401) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token && !initialFetchDone) {
        await fetchUser();
      }
      setLoading(false);
      setInitialFetchDone(true);
    };
    initAuth();
  }, [token, initialFetchDone]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/login', { email, password });
    const newToken = response.data.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setInitialFetchDone(false); // Let useEffect handle the fetch
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    const response = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    const newToken = response.data.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setInitialFetchDone(false); // Let useEffect handle the fetch
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}