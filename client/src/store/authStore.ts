import { create } from 'zustand';

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
  };
});
export default useAuthStore;
