import { useEffect, useRef, useState } from 'react';
import { generateSing, SING_LEVELS, singerNoteName, type SingLevel, type SingQuestion } from '../exercises/singing';
import { centsOff, Hold, type HoldState } from '../exercises/pitchMatch';
import { buildHistory, pickNext, type AttemptLite } from '../srs/scheduler';
import { levelAttempts, recordAttempt, setLastLevel } from '../db/queries';
import { playSequence, stopAll } from '../audio/engine';
import { preloadInstrument } from '../audio/instruments';
import { MicError, micPermission, PitchListener, type MicProblem, type PitchReading } from '../mic/pitch';
import { instrumentsFor, type InstrumentId } from '../theory/instruments';
import { noteName, pick, pitchClass, prettyAccidentals } from '../theory/notes';
import { melodic, sequenceNotes } from '../theory/sequence';
import { isIOS } from '../pwa';
import { allowedInstruments, useSettings } from '../state/settings';
import { StrobeRing, type RingState } from './StrobeRing';
import { CentsMeter } from './CentsMeter';
import { CloseIcon } from './icons';
import { MusicText } from './MusicText';
import { Summary, type SessionAttempt } from './PracticeRunner';
import styles from '../routes/Practice.module.css';
import sing from './SingRunner.module.css';

/** Singing tires the voice faster than listening tires the ear. */
export const SING_SESSION_LENGTH = 10;
/** Ignore the mic this long after a note stops, so its tail isn't taken for your voice. */
const LISTEN_GAP_MS = 600;

type Phase = 'check' | 'primer' | 'blocked' | 'run' | 'done';
type Stage = 'ready' | 'playing' | 'singing' | 'matched' | 'missed';
type Q = SingQuestion & { instrument: InstrumentId };

interface Props {
  level: SingLevel;
  onExit: () => void;
  onAgain: (level: number) => void;
}

export function SingRunner({ level, onExit, onAgain }: Props) {
  const voice = useSettings((s) => s.voice);
  const instrumentChoice = useSettings((s) => s.instrument);

  const [phase, setPhase] = useState<Phase>('check');
  const [problem, setProblem] = useState<MicProblem>('denied');
  const [stage, setStageState] = useState<Stage>('ready');
  const [q, setQState] = useState<Q | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [sung, setSung] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [session, setSession] = useState<SessionAttempt[]>([]);
  const [base, setBase] = useState<AttemptLite[]>([]);
  const [unlockedNow, setUnlockedNow] = useState<number | undefined>();

  // The mic loop runs outside React, so it reads the live state through refs.
  const stageRef = useRef<Stage>('ready');
  const qRef = useRef<Q | null>(null);
  const sessionRef = useRef<SessionAttempt[]>([]);
  const baseRef = useRef<AttemptLite[]>([]);
  const listener = useRef<PitchListener | null>(null);
  const hold = useRef<Hold | null>(null);
  const listenFrom = useRef(0);
  const askToken = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onReading = useRef<(m: PitchReading, t: number) => void>(() => {});

  const setStage = (s: Stage) => {
    stageRef.current = s;
    setStageState(s);
  };
  const setQ = (nq: Q) => {
    qRef.current = nq;
    setQState(nq);
  };

  useEffect(() => {
    let alive = true;
    void setLastLevel('singing', level.n);
    void levelAttempts('singing', level.n).then((rows) => {
      if (!alive) return;
      baseRef.current = rows.map((r) => ({ item: r.item, answer: r.answer, correct: r.correct, ms: r.ms }));
      setBase(baseRef.current);
    });
    // Skip the explainer if the mic is allowed, or was allowed before (an
    // iPhone home-screen app forgets on relaunch; tapping Start re-asks).
    void micPermission().then((state) => {
      if (!alive) return;
      if (state === 'granted' || (state !== 'denied' && useSettings.getState().micAllowedBefore)) setPhase('run');
      else if (state === 'denied') {
        setProblem('denied');
        setPhase('blocked');
      } else setPhase('primer');
    });
    return () => {
      alive = false;
      askToken.current++;
      clearTimeout(timer.current);
      stopAll();
      listener.current?.close();
      listener.current = null;
    };
  }, [level]);

  function makeQuestion(): Q {
    const all = sessionRef.current;
    const history = buildHistory([...baseRef.current, ...all]);
    const item = pickNext({ items: level.items, history, last: all.at(-1)?.item });
    const sq = generateSing(item, level, voice);
    const notes = sq.reference ? sequenceNotes(sq.reference) : [sq.target];
    const instrument = pick(instrumentsFor(notes, allowedInstruments(instrumentChoice)));
    preloadInstrument(instrument);
    return { ...sq, instrument };
  }

  /** Must run inside a tap: opening the mic also unlocks audio. */
  async function openMic(): Promise<boolean> {
    if (listener.current) return true;
    try {
      listener.current = await PitchListener.open();
      listener.current.start((m, t) => onReading.current(m, t));
      useSettings.getState().setMicAllowedBefore(true);
      return true;
    } catch (e) {
      if (e instanceof MicError && e.problem === 'denied') useSettings.getState().setMicAllowedBefore(false);
      setProblem(e instanceof MicError ? e.problem : 'unknown');
      setPhase('blocked');
      return false;
    }
  }

  async function begin() {
    if (!(await openMic())) return;
    setPhase('run');
    void ask(makeQuestion());
  }

  /** Play the reference (if any), then start listening. */
  async function ask(nq: Q) {
    const token = ++askToken.current;
    clearTimeout(timer.current);
    setQ(nq);
    setResult('');
    setCents(null);
    setSung(null);
    setProgress(0);
    hold.current = null;
    if (nq.reference) {
      setStage('playing');
      await playSequence(nq.reference, { instrument: nq.instrument, interrupt: true });
      if (token !== askToken.current) return;
    }
    listenFrom.current = performance.now() + (nq.reference ? LISTEN_GAP_MS : 0);
    hold.current = new Hold({ target: nq.blind ? undefined : nq.target, tolerance: nq.tolerance });
    setStage('singing');
  }

  onReading.current = (midi, t) => {
    const cq = qRef.current;
    if (stageRef.current !== 'singing' || !hold.current || !cq || t < listenFrom.current) return;
    const s = hold.current.push(midi, t);
    setSung(midi === null ? null : Math.round(midi));
    setCents(s.cents === null ? null : Math.round(s.cents));
    setProgress(Math.round(s.progress * 40) / 40);
    if (s.done) void finish(cq, s);
  };

  async function finish(cq: Q, s: HoldState) {
    const off = s.heldMidi === null ? null : centsOff(s.heldMidi, cq.target);
    const correct = !cq.blind || (off !== null && Math.abs(off) <= cq.tolerance);
    setStage(correct ? 'matched' : 'missed');
    if (cq.blind) {
      const sungName = s.heldMidi === null ? '' : singerNoteName(pitchClass(Math.round(s.heldMidi)));
      const by = off === null ? '' : Math.abs(off) < 6 ? 'dead on' : `${Math.round(Math.abs(off))}¢ ${off > 0 ? 'sharp' : 'flat'}`;
      setResult(correct ? `Yes, ${cq.targetName}, ${by}.` : `You sang ${sungName}. This is ${cq.targetName}.`);
    } else {
      setResult(cq.reveal);
    }
    await record(cq, correct);
    if (correct) timer.current = setTimeout(next, 1400);
    else void playTarget(cq);
  }

  /** Give up on this one: counts as a miss, and you hear the note. */
  async function skip() {
    const cq = qRef.current;
    if (!cq) return;
    askToken.current++;
    setStage('missed');
    setCents(null);
    setProgress(0);
    setResult(cq.blind ? `This is ${cq.targetName}.` : cq.reveal);
    await record(cq, false);
    void playTarget(cq);
  }

  function playTarget(cq: Q) {
    return playSequence(melodic([cq.target], 0, 1.2), { instrument: cq.instrument, interrupt: true });
  }

  async function record(cq: Q, correct: boolean) {
    const ms = Math.max(0, Math.round(performance.now() - listenFrom.current));
    const answer = correct ? cq.itemId : 'miss';
    const all = [...sessionRef.current, { item: cq.itemId, answer, correct, ms, level: level.n }];
    sessionRef.current = all;
    setSession(all);
    const res = await recordAttempt({ mode: 'singing', level: level.n, item: cq.itemId, answer, correct, ms, ts: Date.now() }, SING_LEVELS.length);
    if (res.unlocked) setUnlockedNow(res.unlocked);
  }

  function next() {
    clearTimeout(timer.current);
    if (sessionRef.current.length >= SING_SESSION_LENGTH) {
      askToken.current++;
      stopAll();
      listener.current?.close();
      listener.current = null;
      setPhase('done');
      return;
    }
    void ask(makeQuestion());
  }

  function pressRing() {
    if (stage === 'ready') return void begin();
    const cq = qRef.current;
    if (!cq) return;
    if (stage === 'singing' && cq.reference) return void ask(cq); // hear it again
    if (stage === 'missed' || stage === 'matched') return void playTarget(cq);
  }

  if (phase === 'check') return <div className={styles.page} />;
  if (phase === 'primer') return <MicPrimer onAllow={() => void begin()} onExit={onExit} />;
  if (phase === 'blocked') return <MicBlocked problem={problem} onRetry={() => void begin()} onExit={onExit} />;
  if (phase === 'done') {
    return (
      <Summary
        modeName="Pitch matching"
        level={level}
        session={session}
        base={base}
        unlockedNow={unlockedNow}
        maxLevel={SING_LEVELS.length}
        optionLabel={(id) => id}
        showMixups={false}
        onAgain={onAgain}
        onExit={onExit}
      />
    );
  }

  const n = Math.min(session.length + (stage === 'matched' || stage === 'missed' ? 0 : 1), SING_SESSION_LENGTH);
  const blind = q?.blind ?? false;
  const answered = stage === 'matched' || stage === 'missed';
  const ringState: RingState = stage === 'playing' ? 'playing' : stage === 'matched' ? 'correct' : stage === 'missed' ? 'wrong' : 'idle';
  const ringLabel =
    stage === 'ready'
      ? 'Start'
      : stage === 'playing'
        ? 'Listen'
        : answered
          ? q!.targetName
          : !blind && sung !== null
            ? prettyAccidentals(noteName(sung, true))
            : 'Sing';
  const ringSub =
    stage === 'ready'
      ? 'Tap to begin'
      : stage === 'playing'
        ? 'Playing'
        : answered
          ? 'Tap to hear it'
          : blind
            ? 'Hold a steady note'
            : q?.reference
              ? 'Tap to hear again'
              : undefined;

  return (
    <div className={`${styles.page} ${sing.page}`}>
      <header className={styles.top}>
        <button type="button" onClick={onExit} className={styles.close} aria-label="End session">
          <CloseIcon aria-hidden="true" />
        </button>
        <h1 className={styles.title}>
          Pitch matching
          <span className={styles.titleLevel}>Level {level.n}</span>
        </h1>
        <p className={styles.count} aria-label={`Note ${n} of ${SING_SESSION_LENGTH}`}>
          {n}/{SING_SESSION_LENGTH}
        </p>
      </header>
      <div className={styles.progress} aria-hidden="true">
        <span style={{ inlineSize: `${(session.length / SING_SESSION_LENGTH) * 100}%` }} />
      </div>

      <div className={styles.stage}>
        <StrobeRing
          state={ringState}
          label={ringLabel}
          sublabel={ringSub}
          onPress={pressRing}
          ariaLabel={stage === 'ready' ? 'Start' : stage === 'singing' ? 'Hear the note again' : answered ? 'Hear the answer' : 'Playing'}
          cents={stage === 'singing' && !blind ? cents : undefined}
          tolerance={q?.tolerance}
          progress={stage === 'singing' || stage === 'matched' ? progress : undefined}
        />
        <p className={styles.prompt} role="status">
          <MusicText>{stage === 'ready' ? 'Sing along with the strobe. It stands still when you are in tune.' : answered ? result : (q?.prompt ?? '')}</MusicText>
        </p>
        <div className={sing.feedback}>
          {blind ? (
            <p className={sing.blindNote}>
              {stage === 'singing' ? (progress > 0 ? 'Hearing you. Keep it steady' : 'Sing now') : 'No meter on this level: it’s from memory.'}
            </p>
          ) : (
            <div className={sing.meterWrap} data-hidden={stage === 'ready' || stage === 'missed' || undefined}>
              <CentsMeter
                cents={stage === 'singing' || stage === 'matched' ? cents : null}
                tolerance={q?.tolerance ?? 30}
                status={stage === 'matched' ? 'Locked in' : stage === 'playing' ? 'Listen first' : undefined}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {stage === 'missed' ? (
          <button type="button" className={styles.primary} onClick={next}>
            Next note
          </button>
        ) : stage === 'singing' || stage === 'playing' ? (
          <button type="button" className={styles.secondary} onClick={() => void skip()}>
            Skip and hear it
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MicPrimer({ onAllow, onExit }: { onAllow: () => void; onExit: () => void }) {
  return (
    <div className={`${styles.page} ${styles.summary}`}>
      <div className={styles.summaryBody}>
        <div className={sing.primerArt} aria-hidden="true">
          <StrobeRing state="idle" label="A3" sublabel="In tune" size={168} disabled cents={0} tolerance={30} progress={0.7} />
        </div>
        <h1 className={styles.setupTitle}>Sing into your phone</h1>
        <p className={styles.summaryText}>Pitch matching listens while you sing and shows how close you are, as you sing.</p>
        <ul className={sing.points}>
          <li>Nothing is recorded or sent anywhere. Your phone measures the pitch and throws the sound away.</li>
          <li>Headphones help. The app stops listening while it plays a note.</li>
          <li>The microphone turns off when you leave the exercise.</li>
        </ul>
      </div>
      <div className={styles.summaryActions}>
        <button type="button" className={styles.primary} onClick={onAllow}>
          Turn on microphone
        </button>
        <button type="button" className={styles.secondary} onClick={onExit}>
          Not now
        </button>
      </div>
    </div>
  );
}

const PROBLEMS: Record<Exclude<MicProblem, 'denied'>, { title: string; body: string }> = {
  'no-device': { title: 'No microphone found', body: 'This device has no microphone the browser can use. Plug in headphones with a mic, or try on your phone.' },
  busy: { title: 'The microphone is busy', body: 'Another app is using it, such as a call or a voice recorder. Close that and try again.' },
  insecure: { title: 'Microphone not available here', body: 'The microphone only works on the secure (https) version of the app.' },
  unsupported: { title: 'Microphone not supported', body: "This browser can't use the microphone. Try Safari on iPhone or Chrome on Android." },
  unknown: { title: "Couldn't start the microphone", body: 'Something went wrong opening it. Try again, or restart the app.' },
};

function MicBlocked({ problem, onRetry, onExit }: { problem: MicProblem; onRetry: () => void; onExit: () => void }) {
  const ios = isIOS();
  return (
    <div className={`${styles.page} ${styles.summary}`}>
      <div className={styles.summaryBody}>
        {problem === 'denied' ? (
          <>
            <h1 className={styles.setupTitle}>Microphone is off</h1>
            <p className={styles.summaryText}>Pitch matching needs to hear you. Everything else in the app works without it.</p>
            <ol className={sing.points}>
              {ios ? (
                <>
                  <li>Close Pitch Trainer fully (swipe it away), then open it again and tap Try again. iPhone asks once per launch.</li>
                  <li>
                    If it never asks: Settings › Apps › Safari › Microphone, set to <strong>Ask</strong> or <strong>Allow</strong>.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Installed app: long-press its icon › App info › Permissions › Microphone › <strong>Allow</strong>.
                  </li>
                  <li>
                    In Chrome: tap the icon left of the address › Permissions › Microphone › <strong>Allow</strong>.
                  </li>
                </>
              )}
            </ol>
          </>
        ) : (
          <>
            <h1 className={styles.setupTitle}>{PROBLEMS[problem].title}</h1>
            <p className={styles.summaryText}>{PROBLEMS[problem].body}</p>
          </>
        )}
      </div>
      <div className={styles.summaryActions}>
        <button type="button" className={styles.primary} onClick={onRetry}>
          Try again
        </button>
        <button type="button" className={styles.secondary} onClick={onExit}>
          Back to exercises
        </button>
      </div>
    </div>
  );
}
