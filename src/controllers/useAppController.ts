import { useAuth } from '../context/useAppContext';

export function useAppController() {
  const { user, isLoading } = useAuth();

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
  };
}
