import { create } from 'zustand';
import api from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  departmentId: string | null;
  xp: number;
  pointsBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize state from local storage if available
  const storedToken = localStorage.getItem('ecosphere_token');
  const storedUser = localStorage.getItem('ecosphere_user');
  
  let user: User | null = null;
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (e) {
      localStorage.removeItem('ecosphere_user');
    }
  }

  return {
    user,
    token: storedToken,
    isAuthenticated: !!storedToken,
    login: (user, token) => {
      localStorage.setItem('ecosphere_token', token);
      localStorage.setItem('ecosphere_user_id', user.id);
      localStorage.setItem('ecosphere_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('ecosphere_token');
      localStorage.removeItem('ecosphere_user_id');
      localStorage.removeItem('ecosphere_user');
      set({ user: null, token: null, isAuthenticated: false });
    },
    setUser: (user) => {
      localStorage.setItem('ecosphere_user', JSON.stringify(user));
      set({ user });
    },
    fetchCurrentUser: async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success) {
          localStorage.setItem('ecosphere_user', JSON.stringify(res.data.data));
          set({ user: res.data.data });
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    },
  };
});
export default useAuthStore;
