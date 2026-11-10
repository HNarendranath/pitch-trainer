import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { MODES } from '../exercises/modes';
import { allProgress, answeredToday, currentStreak, modeSummaries } from '../db/queries';
import { useSettings } from '../state/settings';
import styles from './Stats.module.css';

export function Stats() {
  const goal = useSettings((s) => s.dailyGoal);
  const data = useLiveQuery(async () => {
    const [today, streak, modes, progress] = await Promise.all([answeredToday(), currentStreak(), modeSummaries(), allProgress()]);
    return { today, streak, modes, progress };
  }, []);

  if (!data) return <div className={styles.page} />;

  const total = data.modes.reduce((n, m) => n + m.answers, 0);
  const untried = MODES.filter((m) => !data.modes.some((s) => s.mode === m.id));

  if (total === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.h1}>Stats</h1>
        <p className={styles.empty}>Nothing here yet. Answer a few questions in any exercise and your streak and accuracy show up here.</p>
        <Link to="/" className={styles.cta}>
          Choose an exercise
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Stats</h1>

      <dl className={styles.tiles}>
        <div className={styles.tile}>
          <dt>Streak</dt>
          <dd>
            {data.streak}
            <span>{data.streak === 1 ? 'day' : 'days'}</span>
          </dd>
        </div>
        <div className={styles.tile}>
          <dt>Today</dt>
          <dd>
            {data.today}
            <span>of {goal}</span>
          </dd>
        </div>
        <div className={styles.tile}>
          <dt>All time</dt>
          <dd>
            {total}
            <span>answers</span>
          </dd>
        </div>
      </dl>

      <section className={styles.section} aria-labelledby="by-mode-h">
        <h2 id="by-mode-h" className={styles.h2}>
          By exercise
        </h2>
        <p className={styles.note}>Accuracy over your last 50 answers in each.</p>
        <ul className={styles.modes}>
          {data.modes.map((s) => {
            const meta = MODES.find((m) => m.id === s.mode)!;
            const pct = Math.round(s.recentAccuracy * 100);
            const unlocked = data.progress.get(s.mode)?.unlocked ?? 1;
            return (
              <li key={s.mode} className={styles.mode}>
                <div className={styles.modeHead}>
                  <Link to={`/practice/${s.mode}`} className={styles.modeName}>
                    {meta.name}
                  </Link>
                  <span className={styles.pct}>{pct}%</span>
                </div>
                <div className={styles.bar} role="img" aria-label={`${pct}% correct over the last ${s.recentCount} answers`}>
                  <span style={{ inlineSize: `${pct}%` }} />
                </div>
                <p className={styles.modeMeta}>
                  Level {unlocked} of {meta.levels} · {s.answers} {s.answers === 1 ? 'answer' : 'answers'}
                </p>
              </li>
            );
          })}
        </ul>
        {untried.length > 0 && <p className={styles.note}>Not tried yet: {untried.map((m) => m.name).join(', ')}.</p>}
      </section>
    </div>
  );
}
