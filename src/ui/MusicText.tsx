import { Fragment } from 'react';
import styles from './MusicText.module.css';

/**
 * Renders text with ♯ ♭ ♮ set in the music font at a size that sits
 * naturally next to Mona Sans letters (the glyphs are drawn small and high
 * for staff use, so each needs its own size and offset).
 */
export function MusicText({ children }: { children: string }) {
  const parts = children.split(/([♯♭♮])/);
  return (
    <>
      {parts.map((p, i) =>
        p === '♯' || p === '♭' || p === '♮' ? (
          <span key={i} className={`${styles.acc} ${p === '♯' ? styles.sharp : p === '♭' ? styles.flat : styles.natural}`}>
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
