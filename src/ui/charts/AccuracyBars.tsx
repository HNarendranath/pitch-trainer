import type { ItemStat } from '../../srs/stats';
import { MusicText } from '../MusicText';
import styles from './Charts.module.css';

/**
 * Accuracy per item, in the exercise's own order (intervals by size, notes
 * up the octave). One hue: the bars are one series. Every value is printed
 * at the bar's tip, so nothing hides behind a tap.
 */
export function AccuracyBars({ stats, label, caption }: { stats: ItemStat[]; label: (id: string) => string; caption: string }) {
  return (
    <figure className={styles.figure}>
      <table className={styles.bars}>
        <caption className="sr-only">{caption}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Accuracy</th>
            <th scope="col">Answers counted</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => {
            const pct = Math.round((s.correct / s.recent) * 100);
            return (
              <tr key={s.item} data-few={s.recent < 5 || undefined}>
                <th scope="row" className={styles.barLabel}>
                  <MusicText>{label(s.item)}</MusicText>
                </th>
                <td className={styles.barCell}>
                  <span className={styles.track} aria-hidden="true">
                    <span className={styles.bar} style={{ inlineSize: `${pct}%` }} />
                  </span>
                  <span className={styles.barValue}>{pct}%</span>
                </td>
                <td className={styles.barCount}>
                  <span className="sr-only">{s.recent} answers</span>
                  <span aria-hidden="true">{s.recent}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}
