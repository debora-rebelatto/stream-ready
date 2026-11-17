import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider, AppProvider } from './context/AppContext';
import { App } from './App';
import './index.css';
import { Analytics } from '@vercel/analytics/react';
import { initPostHog, isTrackingBlocked } from './utils';

// Initialize PostHog if VITE_POSTHOG_KEY is configured and tracking is not blocked
if (!isTrackingBlocked()) {
  initPostHog();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AppProvider>
        <App />
        <Analytics beforeSend={(event) => (isTrackingBlocked() ? null : event)} />
      </AppProvider>
    </ToastProvider>
  </React.StrictMode>
);
