import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INSTRUMENT_IDS, type InstrumentId } from '../theory/instruments';
import type { VoiceRange } from '../exercises/singing';

export type ThemePref = 'system' | 'light' | 'dark';
/** One instrument for every question, or a different one each time. */
export type InstrumentChoice = InstrumentId | 'random';

interface SettingsState {
  theme: ThemePref;
  dailyGoal: number;
  feedbackSounds: boolean;
  haptics: boolean;
  instrument: InstrumentChoice;
  voice: VoiceRange;
  /**
   * The mic has been allowed before. iPhone home-screen apps forget the
   * permission on relaunch, so this skips the explainer and goes straight
   * to the system prompt.
   */
  micAllowedBefore: boolean;
  setTheme: (t: ThemePref) => void;
  setDailyGoal: (n: number) => void;
  setFeedbackSounds: (on: boolean) => void;
  setHaptics: (on: boolean) => void;
  setInstrument: (i: InstrumentChoice) => void;
  setVoice: (v: VoiceRange) => void;
  setMicAllowedBefore: (on: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      dailyGoal: 40,
      feedbackSounds: true,
      haptics: true,
      instrument: 'piano',
      voice: 'low',
      micAllowedBefore: false,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setFeedbackSounds: (feedbackSounds) => set({ feedbackSounds }),
      setHaptics: (haptics) => set({ haptics }),
      setInstrument: (instrument) => set({ instrument }),
      setVoice: (voice) => set({ voice }),
      setMicAllowedBefore: (micAllowedBefore) => set({ micAllowedBefore }),
    }),
    {
      name: 'pt-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // v0 defaulted to the phone's theme and kept a list of instruments.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (version < 1) {
          if (s.theme === 'system') s.theme = 'dark';
          const list = Array.isArray(s.instruments) ? (s.instruments as InstrumentId[]) : [];
          s.instrument = list.length > 1 ? 'random' : (list[0] ?? 'piano');
          delete s.instruments;
        }
        return s as unknown as SettingsState;
      },
    },
  ),
);

/** Instruments a question may be played on under the current choice. */
export function allowedInstruments(choice: InstrumentChoice): readonly InstrumentId[] {
  return choice === 'random' ? INSTRUMENT_IDS : [choice];
}

const THEME_COLORS = { dark: '#1d1412', light: '#e8eaeb' } as const;

export function applyTheme(theme: ThemePref = useSettings.getState().theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  // Keep the browser / status bar colour in step with the chosen theme.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('light') ? 'light' : 'dark';
    meta.content = THEME_COLORS[theme === 'system' ? scheme : theme];
  }
}
