import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { modeById } from '../exercises/modes';
import { exerciseFor } from '../exercises/registry';
import { levelOf, type ExerciseDef } from '../exercises/types';
import { getProgress, levelAttempts } from '../db/queries';
import { levelReadiness, UNLOCK_WINDOW } from '../srs/mastery';
import { PracticeRunner } from '../ui/PracticeRunner';
import { SingRunner } from '../ui/SingRunner';
import { singing, SING_LEVELS, VOICE_RANGES, type VoiceRange } from '../exercises/singing';
import { useSettings } from '../state/settings';
import { noteName, prettyAccidentals } from '../theory/notes';
import { CloseIcon } from '../ui/icons';
import styles from './Practice.module.css';

export function Practice() {
  const { mode: modeId = '' } = useParams();
  // Keyed by mode so switching exercises never carries a session over.
  return <PracticeMode key={modeId} modeId={modeId} />;
}

/** `?level=N` (from Home's Continue card) skips setup and starts that level. */
function useStartLevel(max: number): { level: number; key: number } | null {
  const [params] = useSearchParams();
  const n = Number(params.get('level'));
  return Number.isInteger(n) && n >= 1 && n <= max ? { level: n, key: 1 } : null;
}

function PracticeMode({ modeId }: { modeId: string }) {
  const navigate = useNavigate();
  const mode = modeById(modeId);
  const def = exerciseFor(modeId);
  // A new key per session restarts the runner cleanly.
  const [session, setSession] = useState<{ level: number; key: number } | null>(useStartLevel(def?.levels.length ?? 0));

  if (!mode) {
    return (
      <div className={styles.page}>
        <p>That exercise doesn't exist.</p>
        <Link to="/">Back to practice</Link>
      </div>
    );
  }

  if (modeId === 'singing') return <SingPractice />;

  if (!def) {
    return (
      <div className={styles.page}>
        <p>That exercise doesn't exist.</p>
        <Link to="/">Back to practice</Link>
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

function SingPractice() {
  const navigate = useNavigate();
  const [session, setSession] = useState<{ level: number; key: number } | null>(useStartLevel(SING_LEVELS.length));
  const { voice, setVoice } = useSettings();

  if (session) {
    return (
      <SingRunner
        key={session.key}
        level={SING_LEVELS[session.level - 1] ?? SING_LEVELS[0]!}
        onExit={() => navigate('/')}
        onAgain={(level) => setSession({ level, key: session.key + 1 })}
      />
    );
  }

  return (
    <LevelSetup def={singing} name="Pitch matching" onStart={(level) => setSession({ level, key: 1 })}>
      <div className={styles.voice}>
        <span className={styles.voiceLabel} id="voice-h">
          Your voice
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="voice-h">
          {(Object.keys(VOICE_RANGES) as VoiceRange[]).map((v) => (
            <label key={v} className={styles.segment}>
              <input type="radio" name="voice" value={v} checked={voice === v} onChange={() => setVoice(v)} />
              <span>
                {VOICE_RANGES[v].name}
                <span className={styles.segmentHint}>
                  {prettyAccidentals(noteName(VOICE_RANGES[v].low))}–{prettyAccidentals(noteName(VOICE_RANGES[v].high))}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </LevelSetup>
  );
}

interface LevelSetupProps {
  def: Pick<ExerciseDef, 'id' | 'levels'>;
  name: string;
  onStart: (level: number) => void;
  /** Mode-specific options shown above the levels. */
  children?: ReactNode;
}

function LevelSetup({ def, name, onStart, children }: LevelSetupProps) {
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
    // Functional update: a tap that lands just before this runs must win.
    if (progress && chosen === null) setChosen((c) => c ?? Math.min(progress.lastLevel, def.levels.length));
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

      {children}

      <div className={styles.levels} role="radiogroup" aria-label="Level">
        {def.levels.map((l, i) => {
          const r = accuracy?.[i];
          const ahead = l.n > unlocked;
          // Say "ahead of your level" once, on the first locked level; the dashed numbers mark the rest.
          const firstAhead = l.n === unlocked + 1;
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
                    : firstAhead
                      ? 'From here on is ahead of your level. Try any of them if you like.'
                      : ahead
                        ? null
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
