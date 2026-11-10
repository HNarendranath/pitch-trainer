import styles from './CentsMeter.module.css';
import { MusicText } from './MusicText';

/** The scale spans a semitone either side, so the in-tune zone reads as narrow. */
const RANGE = 100;

/** Words for the needle, also the meter's text alternative. */
export function centsText(cents: number | null, tolerance: number): string {
  if (cents === null) return 'Sing now';
  const c = Math.round(cents);
  if (Math.abs(c) <= tolerance) return 'In tune. Hold it';
  if (c > RANGE) return 'Too high. Go lower';
  if (c < -RANGE) return 'Too low. Go higher';
  return `${Math.abs(c)}¢ ${c > 0 ? 'sharp' : 'flat'}`;
}

/**
 * A linear tuner scale under the ring: flat on the left, sharp on the right,
 * the in-tune zone shaded. Readable without the ring's motion.
 */
export function CentsMeter({ cents, tolerance, status }: { cents: number | null; tolerance: number; /** Replaces the live reading, e.g. once locked in. */ status?: string }) {
  const voice = cents !== null;
  const clamped = voice ? Math.max(-RANGE, Math.min(RANGE, cents)) : 0;
  const pos = 50 + (clamped / RANGE) * 50;
  const inTune = voice && Math.abs(cents) <= tolerance;
  const zone = (tolerance / RANGE) * 50;

  return (
    <div className={styles.meter}>
      <div className={styles.scale} aria-hidden="true" data-voice={voice || undefined} data-in-tune={inTune || undefined}>
        <span className={styles.zone} style={{ insetInlineStart: `${50 - zone}%`, inlineSize: `${zone * 2}%` }} />
        {[0, 25, 50, 75, 100].map((p) => (
          <span key={p} className={styles.tick} data-centre={p === 50 || undefined} style={{ insetInlineStart: `${p}%` }} />
        ))}
        <span className={styles.needle} data-pinned={voice && Math.abs(cents) > RANGE ? true : undefined} style={{ insetInlineStart: `${pos}%` }} />
      </div>
      <div className={styles.ends} aria-hidden="true">
        <span>
          <MusicText>♭</MusicText> Flat
        </span>
        <span>
          Sharp <MusicText>♯</MusicText>
        </span>
      </div>
      <p className={styles.reading} data-in-tune={inTune || undefined}>
        {status ?? centsText(cents, tolerance)}
      </p>
    </div>
  );
}
