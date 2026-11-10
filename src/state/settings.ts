import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { InstrumentId } from '../theory/instruments';

export type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePref;
  dailyGoal: number;
  feedbackSounds: boolean;
  haptics: boolean;
  /** Instruments questions are played on (one picked per question). */
  instruments: InstrumentId[];
  setTheme: (t: ThemePref) => void;
  setDailyGoal: (n: number) => void;
  setFeedbackSounds: (on: boolean) => void;
  setHaptics: (on: boolean) => void;
  toggleInstrument: (id: InstrumentId) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      dailyGoal: 40,
      feedbackSounds: true,
      haptics: true,
      instruments: ['piano'],
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setFeedbackSounds: (feedbackSounds) => set({ feedbackSounds }),
      setHaptics: (haptics) => set({ haptics }),
      toggleInstrument: (id) =>
        set((s) => {
          const on = s.instruments.includes(id);
          // Always keep at least one instrument.
          if (on && s.instruments.length === 1) return s;
          return { instruments: on ? s.instruments.filter((i) => i !== id) : [...s.instruments, id] };
        }),
    }),
    { name: 'pt-settings', storage: createJSONStorage(() => localStorage) },
  ),
);

export function applyTheme(theme: ThemePref = useSettings.getState().theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
