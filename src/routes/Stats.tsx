import { useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { MODES, type ModeId } from '../exercises/modes';
import { itemLabels } from '../exercises/labels';
import { allProgress, answeredToday, attemptTimesSince, currentStreak, modeAttempts, modeSummaries } from '../db/queries';
import { confusions, dailyCounts, itemStats } from '../srs/stats';
import { startOfDay } from '../srs/streak';
import { useSettings } from '../state/settings';
import { DailyChart } from '../ui/charts/DailyChart';
import { AccuracyBars } from '../ui/charts/AccuracyBars';
import { ConfusionGrid } from '../ui/charts/ConfusionGrid';
import { MusicText } from '../ui/MusicText';
import styles from './Stats.module.css';

const DAYS = 30;

export function Stats() {
  const goal = useSettings((s) => s.dailyGoal);
  const data = useLiveQuery(async () => {
    const now = Date.now();
    const since = new Date(startOfDay(now));
    since.setDate(since.getDate() - (DAYS - 1));
    const [today, streak, modes, progress, times] = await Promise.all([
      answeredToday(),
      currentStreak(),
      modeSummaries(),
      allProgress(),
      attemptTimesSince(since.getTime()),
    ]);
    return { today, streak, modes, progress, days: dailyCounts(times, DAYS, now) };
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

      <section className={styles.section} aria-labelledby="days-h">
        <h2 id="days-h" className={styles.h2}>
          Last {DAYS} days
        </h2>
        <DailyChart days={data.days} goal={goal} />
      </section>

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
              <li key={s.mode}>
                <Link to={`/practice/${s.mode}`} className={styles.mode}>
                  <span className={styles.modeHead}>
                    <span className={styles.modeName}>{meta.name}</span>
                    <span className={styles.pct}>{pct}%</span>
                  </span>
                  <span className={styles.bar} role="img" aria-label={`${pct}% correct over the last ${s.recentCount} answers`}>
                    <span style={{ inlineSize: `${pct}%` }} />
                  </span>
                  <span className={styles.modeMeta}>
                    Level {unlocked} of {meta.levels} · {s.answers} {s.answers === 1 ? 'answer' : 'answers'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {untried.length > 0 && <p className={styles.note}>Not tried yet: {untried.map((m) => m.name).join(', ')}.</p>}
      </section>

      <ModeDetail modes={data.modes.map((m) => m.mode)} />
    </div>
  );
}

/** Per-item accuracy and mix-ups for one exercise, picked from a row of chips. */
function ModeDetail({ modes }: { modes: ModeId[] }) {
  const [picked, setPicked] = useState<ModeId | null>(null);
  const mode = picked && modes.includes(picked) ? picked : modes[0]!;
  const attempts = useLiveQuery(() => modeAttempts(mode), [mode]);
  const labels = itemLabels(mode);
  const name = MODES.find((m) => m.id === mode)!.name;
  const singing = mode === 'singing';

  return (
    <section className={styles.section} aria-labelledby="detail-h">
      <h2 id="detail-h" className={styles.h2}>
        In detail
      </h2>
      {/* One filter row above everything it scopes. */}
      <div className={styles.chips} role="radiogroup" aria-label="Exercise">
        {modes.map((m) => (
          <label key={m} className={styles.chip}>
            <input type="radio" name="detail-mode" checked={m === mode} onChange={() => setPicked(m)} />
            <span>{MODES.find((x) => x.id === m)!.name}</span>
          </label>
        ))}
      </div>

      {attempts && (
        <div className={styles.detail} style={{ opacity: attempts ? 1 : 0.5 }}>
          <Weakest attempts={attempts} order={labels.order} label={labels.long} />
          <h3 className={styles.h3}>{singing ? 'Hit rate per item' : 'Accuracy per answer'}</h3>
          <p className={styles.note}>Your last 20 tries at each. The small number is how many count so far.</p>
          <AccuracyBars stats={itemStats(attempts, labels.order)} label={labels.short} caption={`${name}: accuracy per item over the last 20 tries`} />

          {!singing && (
            <>
              <h3 className={styles.h3}>Mix-ups</h3>
              <ConfusionGrid confusions={confusions(attempts)} order={labels.order} label={labels.short} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** One line of emphasis: the item that needs the most work. */
function Weakest({ attempts, order, label }: { attempts: Parameters<typeof itemStats>[0]; order: readonly string[]; label: (id: string) => string }) {
  const stats = itemStats(attempts, order).filter((s) => s.recent >= 5);
  if (stats.length < 2) return null;
  const worst = stats.reduce((a, b) => (b.correct / b.recent < a.correct / a.recent ? b : a));
  const pct = Math.round((worst.correct / worst.recent) * 100);
  if (pct >= 90) return <p className={styles.callout}>Everything is above 90%. Time to try the next level.</p>;
  return (
    <p className={styles.callout}>
      Needs the most work: <MusicText>{label(worst.item)}</MusicText>, {pct}%.
    </p>
  );
}
