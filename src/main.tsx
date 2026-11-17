import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider, AppProvider } from './context/AppContext';
import { App } from './App';
import './index.css';
import { Analytics } from '@vercel/analytics/react';
import './lib/posthog';
import { initPostHog } from './lib/analytics';

// Initialize PostHog if VITE_POSTHOG_KEY is configured
initPostHog();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AppProvider>
        <App />
        <Analytics />
      </AppProvider>
    </ToastProvider>
  </React.StrictMode>
);
