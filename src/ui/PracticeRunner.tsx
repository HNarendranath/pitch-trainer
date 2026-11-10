import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExerciseDef, Level, Question } from '../exercises/types';
import { modeById } from '../exercises/modes';
import { buildHistory, pickNext, type AttemptLite } from '../srs/scheduler';
import { levelReadiness, readinessText } from '../srs/mastery';
import { answeredToday, levelAttempts, recordAttempt, setLastLevel } from '../db/queries';
import { useLiveQuery } from 'dexie-react-hooks';
import { isPlaying, playSequence, stopAll } from '../audio/engine';
import { preloadInstrument } from '../audio/instruments';
import { answerFeedback, buzz } from '../audio/feedback';
import { instrumentsFor } from '../theory/instruments';
import { pick } from '../theory/notes';
import { sequenceNotes } from '../theory/sequence';
import { allowedInstruments, useSettings } from '../state/settings';
import { StrobeRing, type RingState } from './StrobeRing';
import { CloseIcon } from './icons';
import { MusicText } from './MusicText';
import styles from '../routes/Practice.module.css';

export const SESSION_LENGTH = 20;

interface Props {
  def: ExerciseDef;
  level: Level;
  onExit: () => void;
  /** Called when the learner wants another session (possibly at a new level). */
  onAgain: (level: number) => void;
}

export interface SessionAttempt extends AttemptLite {
  level: number;
}

export function PracticeRunner({ def, level, onExit, onAgain }: Props) {
  const mode = modeById(def.id)!;
  const options = useMemo(() => def.options(level), [def, level]);
  const instrumentChoice = useSettings((s) => s.instrument);
  const columns = def.columns ?? (options.length <= 6 ? 3 : 4);
  const compact = options.length > 12;

  const [baseAttempts, setBase] = useState<AttemptLite[] | null>(null);
  const [session, setSession] = useState<SessionAttempt[]>([]);
  const [q, setQ] = useState<Question | null>(null);
  const [ring, setRing] = useState<RingState>('idle');
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [unlockedNow, setUnlockedNow] = useState<number | undefined>();
  const [done, setDone] = useState(false);

  const followUp = useRef<string | undefined>(undefined);
  const firstHeardAt = useRef(0);
  const playToken = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** Questions that don't name an instrument get one of yours that can play every note. */
  function withInstrument(q: Question): Question {
    const instrument = q.instrument ?? pick(instrumentsFor(sequenceNotes(q.sequence), allowedInstruments(instrumentChoice)));
    preloadInstrument(instrument);
    return { ...q, instrument };
  }

  // Load this level's history once, then ask the first question.
  useEffect(() => {
    let alive = true;
    void setLastLevel(def.id, level.n);
    void levelAttempts(def.id, level.n).then((rows) => {
      if (!alive) return;
      const base = rows.map((r) => ({ item: r.item, answer: r.answer, correct: r.correct, ms: r.ms }));
      setBase(base);
      const item = pickNext({ items: level.items, history: buildHistory(base) });
      setQ(withInstrument(def.generate(item, level)));
    });
    return () => {
      alive = false;
      stopAll();
      clearTimeout(advanceTimer.current);
    };
  }, [def, level]);

  const play = useCallback(async (question: Question, { interrupt = false, replay = false } = {}) => {
    if (!interrupt && isPlaying()) return;
    const token = ++playToken.current;
    setRing('playing');
    setHeard((h) => {
      if (!h) firstHeardAt.current = Date.now();
      return true;
    });
    try {
      await playSequence(question.sequence, { instrument: question.instrument, interrupt, skipNoise: replay });
    } finally {
      if (token === playToken.current) setRing((r) => (r === 'playing' ? 'idle' : r));
    }
  }, []);

  const next = useCallback(
    (all: SessionAttempt[]) => {
      clearTimeout(advanceTimer.current);
      if (all.length >= SESSION_LENGTH) {
        stopAll();
        setDone(true);
        return;
      }
      const history = buildHistory([...(baseAttempts ?? []), ...all]);
      const item = pickNext({ items: level.items, history, last: all.at(-1)?.item, followUp: followUp.current });
      followUp.current = undefined;
      const nq = withInstrument(def.generate(item, level));
      setQ(nq);
      setPicked(null);
      setHeard(false);
      void play(nq, { interrupt: true });
    },
    [baseAttempts, def, level, play],
  );

  async function choose(optionId: string) {
    if (!q || picked !== null || !heard) return;
    setPicked(optionId);
    const correct = optionId === q.answerId;
    setRing(correct ? 'correct' : 'wrong');
    answerFeedback(correct);
    const ms = Date.now() - firstHeardAt.current;
    const attempt: SessionAttempt = { item: q.itemId, answer: optionId, correct, ms, level: level.n };
    const all = [...session, attempt];
    setSession(all);
    // After a mix-up, bring the answer you gave back soon so you hear both.
    followUp.current = correct ? undefined : options.some((o) => o.id === optionId) ? optionId : undefined;

    const res = await recordAttempt({ mode: def.id, level: level.n, item: q.itemId, answer: optionId, correct, ms, ts: Date.now() }, def.levels.length);
    if (res.unlocked) {
      setUnlockedNow(res.unlocked);
      buzz('unlock');
    }
    if (correct) advanceTimer.current = setTimeout(() => next(all), 900);
  }

  if (done) {
    return (
      <Summary
        modeName={mode.name}
        level={level}
        session={session}
        base={baseAttempts ?? []}
        unlockedNow={unlockedNow}
        maxLevel={def.levels.length}
        optionLabel={(id) => options.find((o) => o.id === id)?.label ?? id}
        onAgain={onAgain}
        onExit={onExit}
      />
    );
  }

  const n = Math.min(session.length + (picked === null ? 1 : 0), SESSION_LENGTH);
  const answered = picked !== null;
  const wrong = answered && q !== null && picked !== q.answerId;
  const answerLabel = q ? (options.find((o) => o.id === q.answerId)?.label ?? q.answerId) : '';
  const ringLabel = !heard && !answered ? 'Listen' : answered ? answerLabel : 'Again';
  const ringSub = ring === 'playing' ? 'Playing' : !heard ? 'Tap to play' : 'Tap to replay';

  return (
    <div className={styles.page} data-compact={compact || undefined}>
      <header className={styles.top}>
        <button type="button" onClick={onExit} className={styles.close} aria-label="End session">
          <CloseIcon aria-hidden="true" />
        </button>
        <h1 className={styles.title}>
          {mode.name}
          <span className={styles.titleLevel}>Level {level.n}</span>
        </h1>
        <p className={styles.count} aria-label={`Question ${n} of ${SESSION_LENGTH}`}>
          {n}/{SESSION_LENGTH}
        </p>
      </header>
      <div className={styles.progress} aria-hidden="true">
        <span style={{ inlineSize: `${(session.length / SESSION_LENGTH) * 100}%` }} />
      </div>

      <div className={styles.stage}>
        <StrobeRing
          state={ring}
          label={ringLabel}
          sublabel={ringSub}
          onPress={() => q && void play(q, { replay: heard })}
          disabled={!q}
          size={compact ? 184 : 232}
        />
        <p className={styles.prompt} role="status">
          {!q ? 'Loading…' : <MusicText>{!answered ? q.prompt : q.reveal}</MusicText>}
        </p>
      </div>

      <div className={styles.answers} role="group" aria-label="Answers" data-cols={columns}>
        {options.map((o) => {
          const state = !answered || !q ? undefined : o.id === q.answerId ? 'correct' : o.id === picked ? 'wrong' : 'dim';
          return (
            <button key={o.id} type="button" className={styles.key} data-state={state} aria-disabled={!heard || answered} onClick={() => void choose(o.id)}>
              <span className={styles.keyShort}>
                <MusicText>{o.label}</MusicText>
              </span>
              {o.sublabel && <span className={styles.keyName}>{o.sublabel}</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        {wrong && (
          <button type="button" className={styles.primary} onClick={() => next(session)}>
            Next question
          </button>
        )}
      </div>
    </div>
  );
}

export interface SummaryProps {
  modeName: string;
  level: Level;
  session: SessionAttempt[];
  base: AttemptLite[];
  unlockedNow?: number;
  maxLevel: number;
  optionLabel: (id: string) => string;
  /** Off for pitch matching, where a miss has no "heard as". */
  showMixups?: boolean;
  onAgain: (level: number) => void;
  onExit: () => void;
}

export function Summary({ modeName, level, session, base, unlockedNow, maxLevel, optionLabel, showMixups = true, onAgain, onExit }: SummaryProps) {
  const right = session.filter((a) => a.correct).length;
  const goal = useSettings((s) => s.dailyGoal);
  const today = useLiveQuery(() => answeredToday(), []);
  // This session is what carried you over the line.
  const goalJustMet = today !== undefined && today >= goal && today - session.length < goal;
  const readiness = levelReadiness([...base, ...session].map((a) => a.correct));

  // "m6 heard as M6 (2)" — grouped, most frequent first.
  const mixups = new Map<string, number>();
  for (const a of session) if (!a.correct) mixups.set(`${a.item}→${a.answer}`, (mixups.get(`${a.item}→${a.answer}`) ?? 0) + 1);
  const mixupList = [...mixups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className={`${styles.page} ${styles.summary}`}>
      <div className={styles.summaryBody}>
        <h1 className="sr-only">{modeName}: session finished</h1>
        <p className={styles.score}>
          {right}
          <span> / {session.length}</span>
        </p>
        <p className={styles.summaryText}>
          right in {modeName.toLowerCase()}, level {level.n}.
        </p>

        {unlockedNow && (
          <p className={styles.unlock} role="status">
            Level {unlockedNow} unlocked.
          </p>
        )}

        {goalJustMet ? (
          <p className={styles.goalMet}>Daily goal reached: {today} answers today.</p>
        ) : (
          today !== undefined && (
            <p className={styles.goalLine}>
              {today >= goal ? `${today} answers today. Goal met.` : `${today} of ${goal} answers today. ${goal - today} to go.`}
            </p>
          )
        )}

        {showMixups && mixupList.length > 0 && (
          <div className={styles.mixups}>
            <h2 className={styles.mixupsTitle}>Mixed up</h2>
            <ul>
              {mixupList.map(([key, count]) => {
                const [item, answer] = key.split('→') as [string, string];
                return (
                  <li key={key}>
                    <strong>{optionLabel(item)}</strong> heard as <strong>{optionLabel(answer)}</strong>
                    {count > 1 && <span className={styles.times}> {count} times</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className={styles.readiness}>{readinessText(readiness)}</p>
      </div>

      <div className={styles.summaryActions}>
        {unlockedNow && unlockedNow <= maxLevel && unlockedNow !== level.n ? (
          <>
            <button type="button" className={styles.primary} onClick={() => onAgain(unlockedNow)}>
              Try level {unlockedNow}
            </button>
            <button type="button" className={styles.secondary} onClick={() => onAgain(level.n)}>
              Practise level {level.n} again
            </button>
          </>
        ) : (
          <button type="button" className={styles.primary} onClick={() => onAgain(level.n)}>
            Practise again
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}
