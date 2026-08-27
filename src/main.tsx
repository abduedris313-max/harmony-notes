import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for offline capability
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    const baseUrl = (import.meta as any).env?.BASE_URL || './';
    const swUrl = `${baseUrl}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.log('SW registration skipped:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
