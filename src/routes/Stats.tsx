import { Link } from 'react-router';
import styles from './Settings.module.css';

export function Stats() {
  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Stats</h1>
      <p className={styles.body}>
        Your accuracy per exercise, the answers you mix up most, and your streak will show here after your first session.
      </p>
      <Link to="/practice/intervals" className={styles.button} style={{ display: 'inline-grid', placeItems: 'center', textDecoration: 'none' }}>
        Start with intervals
      </Link>
    </div>
  );
}
