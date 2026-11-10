import styles from './ModeString.module.css';

interface Props {
  levels: number;
  /** 1-based current level. */
  level: number;
}

/**
 * A mode's progress drawn as a string over frets: one fret per level, the
 * played part of the string lit, an inlay dot at the current level.
 */
export function ModeString({ levels, level }: Props) {
  return (
    <div className={styles.string} style={{ gridTemplateColumns: `repeat(${levels}, 1fr)` }} aria-hidden="true">
      {Array.from({ length: levels }, (_, i) => {
        const n = i + 1;
        const state = n < level ? 'done' : n === level ? 'current' : 'todo';
        return (
          <span key={n} className={styles.fret} data-state={state}>
            {state === 'current' && <span className={styles.inlay} />}
          </span>
        );
      })}
    </div>
  );
}
