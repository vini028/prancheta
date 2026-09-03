import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BUYER' | 'SELLER';
}

interface AuthState {
  token: string | null;
  user: UserSession | null;
  setAuth: (token: string, user: UserSession) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'erp_auth_session' }
  )
);

// Função exportada para compatibilidade com a chamada direta no Login.page.tsx
export const setAuthSession = (token: string, user: UserSession) => {
  useAuthStore.getState().setAuth(token, user);
};