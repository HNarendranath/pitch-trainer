import { Link } from 'react-router';
import { MODES, type ModeMeta } from '../exercises/modes';
import { ModeString } from '../ui/ModeString';
import { useSettings } from '../state/settings';
import { useLiveQuery } from 'dexie-react-hooks';
import { allProgress, answeredToday, currentStreak } from '../db/queries';
import { isPlayable } from '../exercises/registry';
import styles from './Home.module.css';

/** `level` 0 means the mode isn't playable yet. */
function ModeRow({ mode, level }: { mode: ModeMeta; level: number }) {
  return (
    <li>
      <Link to={`/practice/${mode.id}`} className={styles.row} data-soon={level === 0 || undefined}>
        <span className={styles.rowHead}>
          <span className={styles.rowName}>{mode.name}</span>
          <span className={styles.rowLevel}>{level === 0 ? 'Coming soon' : `Level ${level} of ${mode.levels}`}</span>
        </span>
        <span className={styles.rowBlurb}>{mode.blurb}</span>
        <ModeString levels={mode.levels} level={level} />
      </Link>
    </li>
  );
}

export function Home() {
  const goal = useSettings((s) => s.dailyGoal);
  const today = useLiveQuery(() => answeredToday(), []) ?? 0;
  const streak = useLiveQuery(() => currentStreak(), []) ?? 0;
  const progress = useLiveQuery(() => allProgress(), []);
  const pct = Math.min(1, today / goal);
  const levelFor = (m: ModeMeta) => (isPlayable(m.id) ? (progress?.get(m.id)?.unlocked ?? 1) : 0);

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
              {today} of {goal}
            </strong>{' '}
            answers today
            {streak > 1 && <span className={styles.streak}>{streak}-day streak</span>}
          </p>
        </div>
      </header>

      <section aria-labelledby="listen-h">
        <h2 id="listen-h" className={styles.groupTitle}>
          Listen
        </h2>
        <ul className={styles.list}>
          {listen.map((m) => (
            <ModeRow key={m.id} mode={m} level={levelFor(m)} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="sing-h">
        <h2 id="sing-h" className={styles.groupTitle}>
          Sing
        </h2>
        <ul className={styles.list}>
          {sing.map((m) => (
            <ModeRow key={m.id} mode={m} level={levelFor(m)} />
          ))}
        </ul>
      </section>
    </div>
  );
}
