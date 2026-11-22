import React, { useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { createAppRouter } from './router';

export const App: React.FC = () => {
  const router = useMemo(() => createAppRouter(), []);

  return <RouterProvider router={router} />;
};
