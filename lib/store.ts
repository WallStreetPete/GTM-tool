"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GenerateConfig, Lead } from "./types";

export const DEFAULT_CONFIG: GenerateConfig = {
  theme: "",
  icp: "",
  offer: "",
  style:
    'Casual but sharp. Lead with one specific, non-generic observation about them or their company. No greeting, no flattery clichés, no "I hope this finds you well." Sound like a smart human wrote it, not a template.',
  lines: 1,
  personalityAware: true,
};

type State = {
  leads: Lead[];
  columns: string[];
  config: GenerateConfig;
  setLeads: (leads: Lead[], columns: string[]) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  applyResults: (updates: { id: string; patch: Partial<Lead> }[]) => void;
  removeLead: (id: string) => void;
  clearAll: () => void;
  setConfig: (patch: Partial<GenerateConfig>) => void;
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      leads: [],
      columns: [],
      config: DEFAULT_CONFIG,
      setLeads: (leads, columns) => set({ leads, columns }),
      updateLead: (id, patch) =>
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      applyResults: (updates) =>
        set((s) => {
          const map = new Map(updates.map((u) => [u.id, u.patch]));
          return {
            leads: s.leads.map((l) => (map.has(l.id) ? { ...l, ...map.get(l.id)! } : l)),
          };
        }),
      removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),
      clearAll: () => set({ leads: [], columns: [] }),
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
    }),
    {
      name: "outboundauto",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ leads: s.leads, columns: s.columns, config: s.config }),
    },
  ),
);
