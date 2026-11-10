import { createHashRouter } from 'react-router';
import { AppShell } from './ui/AppShell';
import { Home } from './routes/Home';
import { Practice } from './routes/Practice';
import { Stats } from './routes/Stats';
import { Settings } from './routes/Settings';

// Hash routing keeps deep links working on any static host and offline,
// with no server rewrite rules. In the installed app the URL bar is hidden.
export const router = createHashRouter([
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
