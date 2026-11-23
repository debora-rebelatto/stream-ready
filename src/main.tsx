import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppInitializer } from './context/AppContext';
import { App } from './App';
import './index.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { isTrackingBlocked } from './utils';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppInitializer>
      <App />
      <Analytics beforeSend={(event) => (isTrackingBlocked() ? null : event)} />
      <SpeedInsights />
    </AppInitializer>
  </React.StrictMode>
);
