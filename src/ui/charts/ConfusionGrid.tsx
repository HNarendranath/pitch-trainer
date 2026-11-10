import { useState } from 'react';
import type { Confusion } from '../../srs/stats';
import { MusicText } from '../MusicText';
import styles from './Charts.module.css';

/** Grids wider than this fall back to a ranked list. */
const MAX_SIDE = 12;
/** Labels longer than this don't fit a column head on a phone. */
const MAX_LABEL = 4;
const STEPS = 4;

interface Props {
  confusions: Confusion[];
  order: readonly string[];
  label: (id: string) => string;
}

/**
 * What you answered when you got it wrong: rows are what was played, columns
 * what you chose. A one-hue ramp (violet, not the teal that means "right")
 * shows how often. It is a real table, so the numbers are there for screen
 * readers too. Exercises with long names get a ranked list instead.
 */
export function ConfusionGrid({ confusions, order, label }: Props) {
  const [sel, setSel] = useState<Confusion | null>(null);
  if (confusions.length === 0) return <p className={styles.note}>No mix-ups yet.</p>;

  const involved = new Set(confusions.flatMap((c) => [c.asked, c.answered]));
  const axis = [...order.filter((id) => involved.has(id)), ...[...involved].filter((id) => !order.includes(id))];
  const fits = axis.length <= MAX_SIDE && axis.every((id) => label(id).length <= MAX_LABEL);
  const top = confusions[0]!;

  if (!fits) {
    return (
      <ol className={styles.pairs}>
        {confusions.slice(0, 6).map((c) => (
          <li key={`${c.asked}|${c.answered}`}>
            <span>
              <strong>
                <MusicText>{label(c.asked)}</MusicText>
              </strong>{' '}
              answered as{' '}
              <strong>
                <MusicText>{label(c.answered)}</MusicText>
              </strong>
            </span>
            <span className={styles.pairCount}>{c.count}×</span>
          </li>
        ))}
      </ol>
    );
  }

  const max = top.count;
  const count = new Map(confusions.map((c) => [`${c.asked}|${c.answered}`, c.count]));
  const step = (n: number) => Math.max(1, Math.ceil((n / max) * STEPS));
  const shown = sel ?? top;
  const readout = `${sel ? '' : 'Most often: '}${label(shown.asked)} answered as ${label(shown.answered)}, ${shown.count} ${shown.count === 1 ? 'time' : 'times'}`;

  return (
    <figure className={styles.figure}>
      <p className={styles.readout} aria-hidden="true">
        <MusicText>{readout}</MusicText>
      </p>
      <p className={styles.heatKey} aria-hidden="true">
        Rows: what played. Columns: what you answered.
      </p>
      <div className={styles.heatWrap}>
        <table className={styles.heat} style={{ ['--cols' as string]: axis.length }}>
          <caption className="sr-only">Mistakes: rows are what was played, columns what you answered. Numbers are how many times.</caption>
          <thead>
            <tr>
              <td className={styles.heatCorner} aria-hidden="true" />
              {axis.map((id) => (
                <th key={id} scope="col" className={styles.heatHead}>
                  <MusicText>{label(id)}</MusicText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {axis.map((asked) => (
              <tr key={asked}>
                <th scope="row" className={styles.heatHead}>
                  <MusicText>{label(asked)}</MusicText>
                </th>
                {axis.map((answered) => {
                  const n = count.get(`${asked}|${answered}`) ?? 0;
                  if (asked === answered) return <td key={answered} className={styles.heatSelf} aria-label="Same item" />;
                  if (n === 0) return <td key={answered} className={styles.heatEmpty} />;
                  const c = { asked, answered, count: n };
                  const isSel = sel?.asked === asked && sel.answered === answered;
                  return (
                    <td key={answered} className={styles.heatCell} data-step={step(n)} data-selected={isSel || undefined} onClick={() => setSel(isSel ? null : c)}>
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.scale} aria-hidden="true">
        <span>1</span>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={styles.scaleStep} data-step={i + 1} />
        ))}
        <span>{max}</span>
        <span className={styles.scaleTitle}>mistakes</span>
      </div>
    </figure>
  );
}
