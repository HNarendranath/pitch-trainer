import { createBrowserRouter } from 'react-router';
import { AppShell } from './ui/AppShell';
import { Home } from './routes/Home';
import { Practice } from './routes/Practice';
import { Stats } from './routes/Stats';
import { Settings } from './routes/Settings';

// Path routing (not #/hash): iOS home-screen apps re-ask for the microphone
// whenever the hash changes (WebKit bug 215884). Deep links work through the
// Vercel rewrite online and the service worker's navigation fallback offline.
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'stats', element: <Stats /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: 'practice/:mode', element: <Practice /> },
]);
