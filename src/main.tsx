import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './router';
import { registerServiceWorker } from './pwa';
import { applyTheme } from './state/settings';
import './styles/global.css';

// Links saved from the old hash-routed app (/#/settings) still land in the right place.
if (location.hash.startsWith('#/')) history.replaceState(null, '', location.hash.slice(1));

applyTheme();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
