"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { GenerateConfig, Lead } from "./types";

export const DEFAULT_CONFIG: GenerateConfig = {
  theme: "",
  icp: "",
  offer: "",
  style:
    'Casual but sharp. Lead with one specific, non-generic observation about them or their company. No greeting, no flattery clichés, no "I hope this finds you well." Sound like a smart human wrote it, not a template.',
  opening:
    'Open with a warm, personal first line that references something specific from their background. Use one of these styles, filling the blanks with real details about them:\n• "I came across your profile and was struck by ..."\n• "I saw your profile and knew immediately ..."\n• "Your background in ... is truly inspiring ..."',
  maxChars: 200,
  personalityAware: true,
};

export type ColumnKey = "select" | "contact" | "role" | "opener" | "actions";

export const DEFAULT_COL_WIDTHS: Record<ColumnKey, number> = {
  select: 44,
  contact: 232,
  role: 196,
  opener: 700,
  actions: 168,
};

export const MIN_COL_WIDTHS: Record<ColumnKey, number> = {
  select: 44,
  contact: 150,
  role: 120,
  opener: 300,
  actions: 150,
};

// IndexedDB-backed storage. localStorage's ~5MB cap overflows with 800+ leads
// and full profiles (and throws on save); IndexedDB has a much larger quota.
const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

type State = {
  leads: Lead[];
  columns: string[];
  config: GenerateConfig;
  columnWidths: Record<string, number>;
  briefOpen: boolean;
  setLeads: (leads: Lead[], columns: string[]) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  applyResults: (updates: { id: string; patch: Partial<Lead> }[]) => void;
  addLead: (lead: Lead, columns?: string[]) => void;
  addLeads: (leads: Lead[], columns: string[]) => void;
  removeLead: (id: string) => void;
  removeLeads: (ids: string[]) => void;
  clearAll: () => void;
  setConfig: (patch: Partial<GenerateConfig>) => void;
  setColumnWidth: (key: string, width: number) => void;
  setBriefOpen: (open: boolean) => void;
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      leads: [],
      columns: [],
      config: DEFAULT_CONFIG,
      columnWidths: { ...DEFAULT_COL_WIDTHS },
      briefOpen: false,
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
      addLead: (lead, columns) =>
        set((s) => ({
          leads: [lead, ...s.leads],
          columns: columns && columns.length ? columns : s.columns,
        })),
      addLeads: (leads, columns) =>
        set((s) => {
          const merged = [...s.columns];
          for (const c of columns) if (!merged.includes(c)) merged.push(c);
          return { leads: [...s.leads, ...leads], columns: merged };
        }),
      removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),
      removeLeads: (ids) =>
        set((s) => {
          const drop = new Set(ids);
          return { leads: s.leads.filter((l) => !drop.has(l.id)) };
        }),
      clearAll: () => set({ leads: [], columns: [] }),
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setColumnWidth: (key, width) =>
        set((s) => ({ columnWidths: { ...s.columnWidths, [key]: width } })),
      setBriefOpen: (open) => set({ briefOpen: open }),
    }),
    {
      name: "outboundauto",
      version: 4,
      storage: createJSONStorage(() => idbStorage),
      migrate: (persisted) => {
        // Keep the user's leads / config / widths; just seed the "How to open"
        // example lines when that field is still empty.
        const p = (persisted ?? {}) as Partial<State>;
        const config = { ...DEFAULT_CONFIG, ...(p.config ?? {}) };
        if (!config.opening?.trim()) config.opening = DEFAULT_CONFIG.opening;
        return {
          leads: p.leads ?? [],
          columns: p.columns ?? [],
          config,
          columnWidths: p.columnWidths,
          briefOpen: p.briefOpen ?? false,
        } as unknown as State;
      },
      partialize: (s) => ({
        leads: s.leads,
        columns: s.columns,
        config: s.config,
        columnWidths: s.columnWidths,
        briefOpen: s.briefOpen,
      }),
      // Always fill missing config/width keys from defaults so adding a field
      // never breaks a persisted store (and never forces a wipe).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          config: { ...DEFAULT_CONFIG, ...(p.config ?? {}) },
          columnWidths: { ...DEFAULT_COL_WIDTHS, ...(p.columnWidths ?? {}) },
        };
      },
    },
  ),
);
