// Build a SmartLead-ready CSV: every original column, preserved, plus the
// generated opener as a custom variable you reference as {{personalization}}.
import Papa from "papaparse";
import type { Lead } from "./types";

export const MERGE_FIELD = "personalization";

function resolveMergeField(columns: string[]): string {
  const lower = columns.map((c) => c.toLowerCase());
  return lower.includes(MERGE_FIELD) ? "personalization_line" : MERGE_FIELD;
}

export function buildCsv(leads: Lead[], columns: string[]): string {
  const cols = columns.length ? columns : ["First Name", "Last Name", "Email", "Company"];
  const field = resolveMergeField(cols);
  const fields = [...cols, field];

  const data = leads.map((l) => {
    const row: Record<string, string> = {};
    for (const c of cols) row[c] = l.raw[c] ?? "";
    row[field] = l.personalization ?? "";
    return row;
  });

  return Papa.unparse({ fields, data });
}

export function downloadCsv(leads: Lead[], columns: string[], filename?: string) {
  const csv = buildCsv(leads, columns);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename || `smartlead-export-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
