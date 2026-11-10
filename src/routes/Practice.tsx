import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { modeById } from '../exercises/modes';
import { INTERVALS, type IntervalInfo } from '../theory/intervals';
import { DEFAULT_RANGE, randInt, pick } from '../theory/notes';
import { melodic } from '../theory/sequence';
import { isPlaying, playSequence, stopAll } from '../audio/engine';
import { preloadInstrument } from '../audio/instruments';
import { StrobeRing, type RingState } from '../ui/StrobeRing';
import { CloseIcon } from '../ui/icons';
import styles from './Practice.module.css';

// Milestone 1 preview: ascending intervals within an octave, with no
// adaptive scheduling yet. Replaced by the generic PracticeRunner next.
const CHOICES = INTERVALS.filter((i) => i.semitones >= 1 && i.semitones <= 12);
const SESSION_LENGTH = 20;

interface Question {
  low: number;
  answer: IntervalInfo;
}

function makeQuestion(): Question {
  const answer = pick(CHOICES);
  const low = randInt(DEFAULT_RANGE.low, DEFAULT_RANGE.high - answer.semitones);
  return { low, answer };
}

export function Practice() {
  const { mode: modeId = '' } = useParams();
  const mode = modeById(modeId);

  const [q, setQ] = useState<Question>(makeQuestion);
  const [ring, setRing] = useState<RingState>('idle');
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [n, setN] = useState(1);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playToken = useRef(0);

  useEffect(() => {
    preloadInstrument('piano');
    return () => {
      stopAll();
      clearTimeout(advanceTimer.current);
    };
  }, []);

  /**
   * `interrupt` is only used when moving to a new question. A replay tap while
   * the notes are still sounding is ignored, so playback never overlaps.
   */
  const play = useCallback(async (question: Question, interrupt = false) => {
    if (!interrupt && isPlaying()) return;
    const token = ++playToken.current;
    setRing('playing');
    setHeard(true);
    try {
      await playSequence(melodic([question.low, question.low + question.answer.semitones]), { interrupt });
    } finally {
      // An interrupted playback must not reset the ring of the one replacing it.
      if (token === playToken.current) setRing((r) => (r === 'playing' ? 'idle' : r));
    }
  }, []);

  const next = useCallback(() => {
    if (n >= SESSION_LENGTH) {
      setDone(true);
      return;
    }
    const nq = makeQuestion();
    setQ(nq);
    setPicked(null);
    setN((x) => x + 1);
    void play(nq, true);
  }, [n, play]);

  function choose(semitones: number) {
    if (picked !== null || !heard) return;
    setPicked(semitones);
    const ok = semitones === q.answer.semitones;
    setRing(ok ? 'correct' : 'wrong');
    if (ok) {
      setRight((r) => r + 1);
      advanceTimer.current = setTimeout(next, 900);
    }
  }

  if (!mode) {
    return (
      <div className={styles.page}>
        <p>That exercise doesn't exist.</p>
        <Link to="/">Back to practice</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`${styles.page} ${styles.summary}`}>
        <p className={styles.score}>
          {right}
          <span> / {SESSION_LENGTH}</span>
        </p>
        <p className={styles.summaryText}>right in this session of {mode.name.toLowerCase()}.</p>
        <div className={styles.summaryActions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setDone(false);
              setN(1);
              setRight(0);
              setPicked(null);
              setHeard(false);
              setRing('idle');
              setQ(makeQuestion());
            }}
          >
            Practise again
          </button>
          <Link to="/" className={styles.secondary}>
            Done
          </Link>
        </div>
      </div>
    );
  }

  const answered = picked !== null;
  const wrong = answered && picked !== q.answer.semitones;
  const ringLabel = !heard ? 'Listen' : ring === 'correct' ? q.answer.short : ring === 'wrong' ? q.answer.short : 'Again';
  const ringSub = ring === 'playing' ? 'Playing' : !heard ? 'Tap to play' : answered ? q.answer.name : 'Tap to replay';

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link to="/" className={styles.close} aria-label="End session">
          <CloseIcon aria-hidden="true" />
        </Link>
        <h1 className={styles.title}>{mode.name}</h1>
        <p className={styles.count} aria-label={`Question ${n} of ${SESSION_LENGTH}`}>
          {n}/{SESSION_LENGTH}
        </p>
      </header>
      <div className={styles.progress} aria-hidden="true">
        <span style={{ inlineSize: `${((n - 1) / SESSION_LENGTH) * 100}%` }} />
      </div>

      <div className={styles.stage}>
        <StrobeRing state={ring} label={ringLabel} sublabel={ringSub} onPress={() => void play(q)} ariaLabel={heard ? 'Replay' : 'Play'} />
        <p className={styles.prompt} role="status">
          {!heard ? 'Two notes, low then high.' : !answered ? 'Which interval was that?' : wrong ? 'Not quite. Replay it, then go on.' : 'Right.'}
        </p>
      </div>

      <div className={styles.answers} role="group" aria-label="Answers">
        {CHOICES.map((c) => {
          const state = !answered
            ? undefined
            : c.semitones === q.answer.semitones
              ? 'correct'
              : c.semitones === picked
                ? 'wrong'
                : 'dim';
          return (
            <button
              key={c.semitones}
              type="button"
              className={styles.key}
              data-state={state}
              aria-disabled={!heard || answered}
              onClick={() => choose(c.semitones)}
            >
              <span className={styles.keyShort}>{c.short}</span>
              <span className={styles.keyName}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        {wrong && (
          <button type="button" className={styles.primary} onClick={next}>
            Next question
          </button>
        )}
      </div>
    </div>
  );
}
