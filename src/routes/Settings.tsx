import { useSettings, type InstrumentChoice, type ThemePref } from '../state/settings';
import { useInstall } from '../ui/useInstall';
import { isIOS, isStandalone } from '../pwa';
import { supportsAudioSession } from '../audio/engine';
import { INSTRUMENT_IDS, INSTRUMENT_META } from '../theory/instruments';
import styles from './Settings.module.css';

const INSTRUMENT_CHOICES: InstrumentChoice[] = [...INSTRUMENT_IDS, 'random'];

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Match phone' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function Settings() {
  const s = useSettings();
  const { available, install, status } = useInstall();
  const standalone = isStandalone();
  const ios = isIOS();

  return (
    <div className={styles.page}>
      <h1 className={styles.h1}>Settings</h1>

      <section className={styles.group} aria-labelledby="look-h">
        <h2 id="look-h" className={styles.h2}>
          Appearance
        </h2>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="look-h">
          {THEMES.map((t) => (
            <label key={t.value} className={styles.segment}>
              <input type="radio" name="theme" value={t.value} checked={s.theme === t.value} onChange={() => s.setTheme(t.value)} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={styles.group} aria-labelledby="practice-h">
        <h2 id="practice-h" className={styles.h2}>
          Practice
        </h2>
        <label className={styles.row}>
          <span>
            Daily goal
            <span className={styles.hint}>Answers per day</span>
          </span>
          <select value={s.dailyGoal} onChange={(e) => s.setDailyGoal(Number(e.target.value))} className={styles.select}>
            {[20, 40, 60, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.row}>
          <span>Right and wrong sounds</span>
          <input type="checkbox" role="switch" className={styles.switch} checked={s.feedbackSounds} onChange={(e) => s.setFeedbackSounds(e.target.checked)} />
        </label>
        <label className={styles.row}>
          <span>
            Vibration
            <span className={styles.hint}>Android only. iPhone doesn't allow it in web apps.</span>
          </span>
          <input type="checkbox" role="switch" className={styles.switch} checked={s.haptics} onChange={(e) => s.setHaptics(e.target.checked)} />
        </label>
      </section>

      <section className={styles.group} aria-labelledby="inst-h">
        <h2 id="inst-h" className={styles.h2}>
          Instruments
        </h2>
        <p className={styles.hint}>Questions are played on this. Random mixes timbres, which trains your ear for real music. Extra instruments download the first time you use them.</p>
        <div role="radiogroup" aria-labelledby="inst-h">
          {INSTRUMENT_CHOICES.map((id) => (
            <label key={id} className={styles.row}>
              <span>
                {id === 'random' ? 'Random' : INSTRUMENT_META[id].name}
                {id === 'random' && <span className={styles.hint}>A different instrument each question</span>}
              </span>
              <input type="radio" name="instrument" className={styles.radio} checked={s.instrument === id} onChange={() => s.setInstrument(id)} />
            </label>
          ))}
        </div>
      </section>

      {!standalone && (
        <section className={styles.group} aria-labelledby="install-h">
          <h2 id="install-h" className={styles.h2}>
            Install
          </h2>
          {available ? (
            <button type="button" className={styles.button} onClick={() => void install()}>
              Add to home screen
            </button>
          ) : ios ? (
            <p className={styles.body}>In Safari, tap Share, then Add to Home Screen. It opens full screen and works offline.</p>
          ) : (
            <p className={styles.body}>Use your browser menu to install this app.</p>
          )}
          <p className={styles.hint} role="status">
            {status}
          </p>
        </section>
      )}

      {ios && !supportsAudioSession && (
        <section className={styles.group}>
          <h2 className={styles.h2}>Sound</h2>
          <p className={styles.body}>This iOS version mutes web audio when the silent switch is on. Flip the switch or update iOS to hear notes.</p>
        </section>
      )}

      <section className={styles.group} aria-labelledby="credits-h">
        <h2 id="credits-h" className={styles.h2}>
          Credits
        </h2>
        <p className={styles.body}>
          Piano: Salamander Grand Piano by Alexander Holm, licensed{' '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
            CC BY 3.0
          </a>
          .
        </p>
        <p className={styles.body}>
          Guitar, strings, organ and flute:{' '}
          <a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noreferrer">
            tonejs-instruments
          </a>{' '}
          by Nicholaus Brosowsky, licensed{' '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
            CC BY 3.0
          </a>
          .
        </p>
      </section>
    </div>
  );
}
