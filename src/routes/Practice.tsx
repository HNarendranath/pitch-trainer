import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { modeById } from '../exercises/modes';
import { exerciseFor } from '../exercises/registry';
import { levelOf, type ExerciseDef } from '../exercises/types';
import { getProgress, levelAttempts } from '../db/queries';
import { levelReadiness, UNLOCK_WINDOW } from '../srs/mastery';
import { PracticeRunner } from '../ui/PracticeRunner';
import { CloseIcon } from '../ui/icons';
import styles from './Practice.module.css';

export function Practice() {
  const { mode: modeId = '' } = useParams();
  // Keyed by mode so switching exercises never carries a session over.
  return <PracticeMode key={modeId} modeId={modeId} />;
}

function PracticeMode({ modeId }: { modeId: string }) {
  const navigate = useNavigate();
  const mode = modeById(modeId);
  const def = exerciseFor(modeId);
  // A new key per session restarts the runner cleanly.
  const [session, setSession] = useState<{ level: number; key: number } | null>(null);

  if (!mode) {
    return (
      <div className={styles.page}>
        <p>That exercise doesn't exist.</p>
        <Link to="/">Back to practice</Link>
      </div>
    );
  }

  if (!def) {
    return (
      <div className={`${styles.page} ${styles.summary}`}>
        <div className={styles.summaryBody}>
          <h1 className={styles.setupTitle}>{mode.name}</h1>
          <p className={styles.summaryText}>This exercise is being built. Intervals is ready to practise now.</p>
        </div>
        <div className={styles.summaryActions}>
          <Link to="/practice/intervals" className={styles.primary}>
            Practise intervals
          </Link>
          <Link to="/" className={styles.secondary}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <PracticeRunner
        key={session.key}
        def={def}
        level={levelOf(def, session.level)}
        onExit={() => navigate('/')}
        onAgain={(level) => setSession({ level, key: session.key + 1 })}
      />
    );
  }

  return <LevelSetup def={def} name={mode.name} onStart={(level) => setSession({ level, key: 1 })} />;
}

function LevelSetup({ def, name, onStart }: { def: ExerciseDef; name: string; onStart: (level: number) => void }) {
  const progress = useLiveQuery(() => getProgress(def.id), [def.id]);
  const accuracy = useLiveQuery(
    async () =>
      Promise.all(
        def.levels.map(async (l) => levelReadiness((await levelAttempts(def.id, l.n, UNLOCK_WINDOW)).map((a) => a.correct))),
      ),
    [def.id],
  );
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    if (progress && chosen === null) setChosen(Math.min(progress.lastLevel, def.levels.length));
  }, [progress, chosen, def.levels.length]);

  const unlocked = progress?.unlocked ?? 1;

  return (
    <div className={`${styles.page} ${styles.setup}`}>
      <header className={styles.top}>
        <Link to="/" className={styles.close} aria-label="Back">
          <CloseIcon aria-hidden="true" />
        </Link>
      </header>

      <div>
        <h1 className={styles.setupTitle}>{name}</h1>
        <p className={styles.setupLead}>Pick a level. Reach 85% over 20 answers to unlock the next.</p>
      </div>

      <div className={styles.levels} role="radiogroup" aria-label="Level">
        {def.levels.map((l, i) => {
          const r = accuracy?.[i];
          const ahead = l.n > unlocked;
          return (
            <label key={l.n} className={styles.levelRow} data-ahead={ahead || undefined}>
              <input type="radio" name="level" value={l.n} checked={chosen === l.n} onChange={() => setChosen(l.n)} />
              <span className={styles.levelNum} aria-hidden="true">
                {l.n}
              </span>
              <span className={styles.levelText}>
                <span className={styles.levelName}>{l.name}</span>
                <span className={styles.levelDesc}>{l.description}</span>
                <span className={styles.levelMeta}>
                  {r && r.counted > 0
                    ? `${Math.round(r.accuracy * 100)}% over your last ${r.counted}`
                    : ahead
                      ? 'Ahead of your level. Try it anyway if you like.'
                      : 'Not practised yet'}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className={styles.setupActions}>
        <button type="button" className={styles.primary} disabled={chosen === null} onClick={() => chosen && onStart(chosen)}>
          Start level {chosen ?? ''}
        </button>
      </div>
    </div>
  );
}
