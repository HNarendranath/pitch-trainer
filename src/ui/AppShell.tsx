import { NavLink, Outlet } from 'react-router';
import styles from './AppShell.module.css';
import { ForkIcon, BarsIcon, SlidersIcon } from './icons';

const TABS = [
  { to: '/', label: 'Practice', Icon: ForkIcon, end: true },
  { to: '/stats', label: 'Stats', Icon: BarsIcon, end: false },
  { to: '/settings', label: 'Settings', Icon: SlidersIcon, end: false },
] as const;

export function AppShell() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.tabbar} aria-label="Main">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
