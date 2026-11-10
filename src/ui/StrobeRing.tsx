import { useId } from 'react';
import styles from './StrobeRing.module.css';
import { MusicText } from './MusicText';

export type RingState = 'idle' | 'playing' | 'correct' | 'wrong';

interface Props {
  state: RingState;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  size?: number;
  /** Accessible name for the button. */
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * The app's signature element, after a strobe tuner: concentric dashed bands
 * that spin while sound plays and settle when it stops. It is the listen /
 * replay button in every exercise.
 */
export function StrobeRing({ state, label, sublabel, onPress, size = 232, ariaLabel, disabled }: Props) {
  const gid = useId();
  const content = (
    <svg viewBox="0 0 240 240" width={size} height={size} className={styles.svg} aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}-abalone`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <g className={styles.bands} stroke={`url(#${gid}-abalone)`} fill="none">
        <circle className={`${styles.band} ${styles.b1}`} cx="120" cy="120" r="112" strokeWidth="6" strokeDasharray="2.5 6.3" />
        <circle className={`${styles.band} ${styles.b2}`} cx="120" cy="120" r="99" strokeWidth="7" strokeDasharray="7 11" />
        <circle className={`${styles.band} ${styles.b3}`} cx="120" cy="120" r="85" strokeWidth="8" strokeDasharray="16 17.4" />
      </g>
      <circle cx="120" cy="120" r="72" className={styles.face} />
    </svg>
  );

  return (
    <button
      type="button"
      className={styles.ring}
      data-state={state}
      onClick={onPress}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      style={{ inlineSize: size, blockSize: size }}
    >
      {content}
      <span className={styles.text}>
        <span className={styles.label} data-long={label.length > 7 || undefined}>
          <MusicText>{label}</MusicText>
        </span>
        {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
      </span>
    </button>
  );
}
