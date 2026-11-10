import { useEffect, useId, useRef } from 'react';
import styles from './StrobeRing.module.css';
import { MusicText } from './MusicText';

export type RingState = 'idle' | 'playing' | 'correct' | 'wrong';

interface Props {
  state: RingState;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  /**
   * Tuner mode (pitch matching). Cents off the target: the bands drift
   * clockwise when sharp, anticlockwise when flat, and stand still in tune,
   * exactly like a strobe tuner. null = no voice heard.
   */
  cents?: number | null;
  /** In tune within this many cents. */
  tolerance?: number;
  /** 0…1: drawn as an arc round the ring while a note is held. */
  progress?: number;
}

/** Degrees per second per cent off, for the outer band; inner bands turn slower. */
const DRIFT = 3.2;
const BAND_SPEEDS = [1, 0.62, 0.38];

/**
 * The app's signature element, after a strobe tuner: concentric dashed bands
 * that spin while sound plays and settle when it stops. It is the listen /
 * replay button in every exercise, and the tuner when you sing.
 */
export function StrobeRing({ state, label, sublabel, onPress, size = 232, disabled, cents, tolerance = 0, progress }: Props) {
  const gid = useId();
  const bandsRef = useRef<SVGGElement>(null);
  const centsRef = useRef(cents);
  centsRef.current = cents;
  const tuner = cents !== undefined && state !== 'playing';

  // Drive the bands from the live pitch. JS rather than CSS because the speed
  // changes every frame.
  useEffect(() => {
    const group = bandsRef.current;
    if (!tuner || !group || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bands = [...group.children] as SVGElement[];
    const angles = bands.map(() => 0);
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const c = centsRef.current;
      if (c != null) {
        const v = Math.max(-150, Math.min(150, c)) * DRIFT;
        bands.forEach((b, i) => {
          angles[i] = (angles[i]! + v * BAND_SPEEDS[i]! * dt) % 360;
          b.style.transform = `rotate(${angles[i]}deg)`;
        });
      }
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      bands.forEach((b) => (b.style.transform = ''));
    };
  }, [tuner]);

  const voice = tuner && cents !== null;
  const inTune = voice && Math.abs(cents!) <= tolerance;

  const content = (
    <svg viewBox="0 0 240 240" width={size} height={size} className={styles.svg} aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}-abalone`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <g ref={bandsRef} className={styles.bands} stroke={`url(#${gid}-abalone)`} fill="none">
        <circle className={`${styles.band} ${styles.b1}`} cx="120" cy="120" r="112" strokeWidth="6" strokeDasharray="2.5 6.3" />
        <circle className={`${styles.band} ${styles.b2}`} cx="120" cy="120" r="99" strokeWidth="7" strokeDasharray="7 11" />
        <circle className={`${styles.band} ${styles.b3}`} cx="120" cy="120" r="85" strokeWidth="8" strokeDasharray="16 17.4" />
      </g>
      {progress !== undefined && progress > 0 && (
        <circle
          className={styles.hold}
          cx="120"
          cy="120"
          r="118"
          pathLength={100}
          strokeDasharray={`${progress * 100} 100`}
          transform="rotate(-90 120 120)"
        />
      )}
      <circle cx="120" cy="120" r="72" className={styles.face} />
    </svg>
  );

  return (
    <button
      type="button"
      className={styles.ring}
      data-state={state}
      data-voice={voice || undefined}
      data-in-tune={inTune || undefined}
      onClick={onPress}
      disabled={disabled}
      style={{ inlineSize: size, blockSize: size }}
    >
      {content}
      {/* The visible label and hint are the button's name, so what people see is what voice control hears. */}
      <span className={styles.text}>
        <span className={styles.label} data-long={label.length > 7 || undefined}>
          <MusicText>{label}</MusicText>
        </span>
        {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
      </span>
    </button>
  );
}
