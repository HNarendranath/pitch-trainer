import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePref;
  dailyGoal: number;
  feedbackSounds: boolean;
  haptics: boolean;
  setTheme: (t: ThemePref) => void;
  setDailyGoal: (n: number) => void;
  setFeedbackSounds: (on: boolean) => void;
  setHaptics: (on: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      dailyGoal: 40,
      feedbackSounds: true,
      haptics: true,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setFeedbackSounds: (feedbackSounds) => set({ feedbackSounds }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    { name: 'pt-settings', storage: createJSONStorage(() => localStorage) },
  ),
);

export function applyTheme(theme: ThemePref = useSettings.getState().theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
