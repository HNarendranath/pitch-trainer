import { Link } from 'react-router';
import { MODES, type ModeMeta } from '../exercises/modes';
import { ModeString } from '../ui/ModeString';
import { useSettings } from '../state/settings';
import styles from './Home.module.css';

function ModeRow({ mode, level }: { mode: ModeMeta; level: number }) {
  return (
    <li>
      <Link to={`/practice/${mode.id}`} className={styles.row}>
        <span className={styles.rowHead}>
          <span className={styles.rowName}>{mode.name}</span>
          <span className={styles.rowLevel}>
            Level {level} of {mode.levels}
          </span>
        </span>
        <span className={styles.rowBlurb}>{mode.blurb}</span>
        <ModeString levels={mode.levels} level={level} />
      </Link>
    </li>
  );
}

export function Home() {
  const goal = useSettings((s) => s.dailyGoal);
  // Wired to real stats in the persistence milestone.
  const answeredToday = 0;
  const pct = Math.min(1, answeredToday / goal);

  const listen = MODES.filter((m) => m.group === 'listen');
  const sing = MODES.filter((m) => m.group === 'sing');

  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <h1 className={styles.wordmark}>Pitch Trainer</h1>
        <div className={styles.today}>
          <svg viewBox="0 0 44 44" className={styles.goalRing} aria-hidden="true">
            <circle cx="22" cy="22" r="18" className={styles.goalTrack} />
            <circle cx="22" cy="22" r="18" className={styles.goalFill} pathLength={100} strokeDasharray={`${pct * 100} 100`} />
          </svg>
          <p>
            <strong>
              {answeredToday} of {goal}
            </strong>{' '}
            answers today
          </p>
        </div>
      </header>

      <section aria-labelledby="listen-h">
        <h2 id="listen-h" className={styles.groupTitle}>
          Listen
        </h2>
        <ul className={styles.list}>
          {listen.map((m) => (
            <ModeRow key={m.id} mode={m} level={1} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="sing-h">
        <h2 id="sing-h" className={styles.groupTitle}>
          Sing
        </h2>
        <ul className={styles.list}>
          {sing.map((m) => (
            <ModeRow key={m.id} mode={m} level={1} />
          ))}
        </ul>
      </section>
    </div>
  );
}
