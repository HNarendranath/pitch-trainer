import { useState, type PointerEvent } from 'react';
import { niceMax, type DayCount } from '../../srs/stats';
import styles from './Charts.module.css';

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/**
 * Answers per day, one column each, with the daily goal as a solid reference
 * line. Single series, so no legend: the title says what it is. Tap or drag
 * across it to read a day; the hidden table carries every value.
 */
export function DailyChart({ days, goal }: { days: DayCount[]; goal: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const peak = Math.max(...days.map((d) => d.count));
  const max = niceMax(Math.max(peak, goal));
  const total = days.reduce((n, d) => n + d.count, 0);
  const met = days.filter((d) => d.count >= goal).length;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * days.length);
    setSel(Math.max(0, Math.min(days.length - 1, i)));
  };

  const d = sel === null ? null : days[sel]!;
  const readout = d
    ? `${dayFmt.format(d.day)}: ${d.count} ${d.count === 1 ? 'answer' : 'answers'}${d.count >= goal ? ', goal met' : ''}`
    : `${total} answers · goal met on ${met} ${met === 1 ? 'day' : 'days'}`;

  return (
    <figure className={styles.figure}>
      <p className={styles.readout} aria-hidden="true">
        {readout}
      </p>
      <div className={styles.dailyFrame}>
        <div className={styles.yAxis} aria-hidden="true">
          {/* Hidden where the goal's own label would collide with it. */}
          <span style={{ visibility: max - goal < max * 0.15 ? 'hidden' : undefined }}>{max}</span>
          <span style={{ visibility: goal < max * 0.15 ? 'hidden' : undefined }}>0</span>
        </div>
        <div
          className={styles.dailyPlot}
          aria-hidden="true"
          onPointerDown={pick}
          onPointerMove={(e) => e.buttons > 0 || e.pointerType === 'mouse' ? pick(e) : undefined}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(null)}
        >
          <span className={styles.gridline} style={{ insetBlockEnd: '100%' }} />
          <span className={styles.goal} style={{ insetBlockEnd: `${(goal / max) * 100}%` }}>
            <span className={styles.goalTick}>{goal}</span>
          </span>
          {days.map((day, i) => (
            <span key={day.day} className={styles.col} data-selected={sel === i || undefined}>
              {day.count > 0 && <span className={styles.colBar} style={{ blockSize: `max(2px, ${(day.count / max) * 100}%)` }} />}
            </span>
          ))}
        </div>
        <span />
        <div className={styles.xAxis} aria-hidden="true">
          <span>{shortFmt.format(days[0]!.day)}</span>
          <span>Today</span>
        </div>
      </div>
      <p className={styles.legend} aria-hidden="true">
        <span className={styles.legendLine} /> Daily goal
      </p>
      <table className="sr-only">
        <caption>Answers per day, last {days.length} days. Daily goal {goal}.</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Answers</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <th scope="row">{dayFmt.format(day.day)}</th>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
