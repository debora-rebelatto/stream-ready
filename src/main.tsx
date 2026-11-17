import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider, AppProvider } from './context/AppContext';
import { App } from './App';
import './index.css';
import { Analytics } from '@vercel/analytics/react';
import './lib/posthog';

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
