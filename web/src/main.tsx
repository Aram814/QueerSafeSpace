import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { applyTheme, getTheme } from './theme';
import { initInstall } from './lib/install';

applyTheme(getTheme());
initInstall();

// Lets phones offer "Install" and shows a friendly page when offline. Does not cache the app.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* installing as an app is a nice-to-have */
    });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
