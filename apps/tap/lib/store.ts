"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TapStep = "criteria" | "asis";

interface AppState {
  _savedAt: string;
  _submittedAt: string | null;
  /**
   * Current step in the TAP intake flow. The user fills the strategic
   * "Critérios Norteadores" questionnaire first, then advances to the
   * AS-IS architecture canvas. Persisted so a refresh lands the user
   * back on the step they were last on.
   */
  step: TapStep;
  cloud_provider: string[];
  tools: Record<string, string[]>;
  /**
   * Star rating 1–5 per criteria item key (see lib/criteria.ts).
   * Unrated items omitted from the map.
   */
  criteria: Record<string, number>;

  setCloudProvider: (providers: string[]) => void;
  setTools: (category: string, tools: string[]) => void;
  setCriterion: (key: string, score: number) => void;
  setStep: (step: TapStep) => void;
  markSubmitted: () => void;
  startNewMapping: () => void;
  resetAll: () => void;
}

const INITIAL_STATE = {
  _savedAt: new Date().toISOString(),
  _submittedAt: null as string | null,
  step: "criteria" as TapStep,
  cloud_provider: [] as string[],
  tools: {} as Record<string, string[]>,
  criteria: {} as Record<string, number>,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setCloudProvider: (providers) => set({ cloud_provider: providers }),

      setTools: (category, tools) =>
        set((state) => ({
          tools: { ...state.tools, [category]: tools },
        })),

      setCriterion: (key, score) =>
        set((state) => ({
          criteria: { ...state.criteria, [key]: score },
        })),

      setStep: (step) => set({ step }),

      markSubmitted: () => set({ _submittedAt: new Date().toISOString() }),

      startNewMapping: () =>
        set({ ...INITIAL_STATE, _savedAt: new Date().toISOString() }),

      resetAll: () =>
        set({ ...INITIAL_STATE, _savedAt: new Date().toISOString() }),
    }),
    {
      name: "databricks_tap_tool_storage",
      // Auto-reset a snapshot older than 1 day — a tab left open overnight
      // starts fresh.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const savedAt = state._savedAt;
        if (savedAt) {
          const diffDays =
            (Date.now() - new Date(savedAt).getTime()) / 86400000;
          if (diffDays > 1) state.resetAll();
        }
      },
    },
  ),
);
