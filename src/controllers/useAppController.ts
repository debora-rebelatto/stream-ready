import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAppContext';

export function useAppController() {
  const { user, isLoading } = useAuth();
  const [isDesignSystemOpen, setIsDesignSystemOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash === '#design-system';
    }
    return false;
  });

  useEffect(() => {
    const handleHashChange = () => {
      setIsDesignSystemOpen(window.location.hash === '#design-system');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCloseDesignSystem = () => {
    setIsDesignSystemOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#design-system') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isDesignSystemOpen: Boolean(user?.isAdmin && isDesignSystemOpen),
    handleCloseDesignSystem,
  };
}

