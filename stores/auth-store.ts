import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  login: (user?: Partial<User>) => void;
  logout: () => void;
}

const defaultUser: User = {
  id: 'user_demo_001',
  name: 'Alex Johnson',
  email: 'alex@terrawatt.demo',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (userData) =>
        set({
          user: { ...defaultUser, ...userData },
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'terrawatt-auth',
    }
  )
);
