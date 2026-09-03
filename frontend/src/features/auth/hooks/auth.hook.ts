import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const { token, user, logout } = useAuthStore();

  return {
    token,
    user,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'ADMIN',
    role: user?.role,
    logout,
  };
};