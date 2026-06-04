"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MailCheck, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { CampaignBrief } from "@/components/campaign-brief";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { LeadsTable } from "@/components/leads-table";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { enrichLeads, generateLines, getStatus } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { parseFile } from "@/lib/parse";
import type { Lead, LeadStatus } from "@/lib/types";

type Mode = "anthropic" | "gateway" | "mock" | "loading";

export default function Page() {
  const leads = useStore((s) => s.leads);
  const columns = useStore((s) => s.columns);
  const config = useStore((s) => s.config);
  const setLeads = useStore((s) => s.setLeads);
  const updateLead = useStore((s) => s.updateLead);
  const applyResults = useStore((s) => s.applyResults);
  const addLead = useStore((s) => s.addLead);
  const addLeads = useStore((s) => s.addLeads);
  const removeLead = useStore((s) => s.removeLead);
  const removeLeads = useStore((s) => s.removeLeads);
  const clearAll = useStore((s) => s.clearAll);

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [model, setModel] = useState<string>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const seedTried = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setHydrated(useStore.persist.hasHydrated());
    return useStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  useEffect(() => {
    getStatus()
      .then((s) => {
        setMode(s.mode as Mode);
        setModel(s.model);
      })
      .catch(() => setMode("mock"));
  }, []);

  // Auto-load SemisExecs.csv from the project folder on first run (no upload screen).
  useEffect(() => {
    if (!mounted || !hydrated || leads.length > 0 || seedTried.current) return;
    seedTried.current = true;
    setSeeding(true);
    fetch("/api/seed")
      .then((r) => r.json())
      .then((d: { leads?: Lead[]; columns?: string[] }) => {
        if (d.leads?.length) setLeads(d.leads, d.columns ?? []);
      })
      .catch(() => {})
      .finally(() => setSeeding(false));
  }, [mounted, hydrated, leads.length, setLeads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.fullName, l.firstName, l.lastName, l.email, l.company, l.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [leads, search]);

  const generated = leads.filter((l) => l.personalization?.trim()).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageLeads = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [search, pageSize]);

  function targetLeads(): Lead[] {
    return selected.size ? leads.filter((l) => selected.has(l.id)) : leads;
  }

  function setBusy(ids: string[], on: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  async function handleGenerate(targets?: Lead[]) {
    const batch = targets ?? targetLeads();
    if (!batch.length) return;
    const single = Boolean(targets && targets.length === 1);
    if (single) setBusy(batch.map((l) => l.id), true);
    else setGenerating(true);

    const toastId = !single ? toast.loading(`Writing openers 0/${batch.length}…`) : undefined;
    const CHUNK = 20;
    let ok = 0;
    let fail = 0;
    let mockSeen = false;

    try {
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        try {
          const { results, mode: m } = await generateLines(chunk, config);
          applyResults(
            results.map((r) => ({
              id: r.id,
              patch: { personalization: r.line, status: "generated" as LeadStatus },
            })),
          );
          ok += results.length;
          if (m === "mock") mockSeen = true;
        } catch {
          fail += chunk.length;
        }
        if (toastId !== undefined) {
          toast.loading(`Writing openers ${Math.min(i + CHUNK, batch.length)}/${batch.length}…`, {
            id: toastId,
          });
        }
      }

      if (single) {
        if (fail) toast.error("Couldn't write that opener — try again.");
      } else if (mockSeen) {
        toast.message(`Generated ${ok} demo lines`, {
          id: toastId,
          description: "Add an AI key for real personalization (see “Demo mode”).",
        });
      } else if (fail) {
        toast.warning(`Wrote ${ok}, ${fail} failed`, { id: toastId });
      } else {
        toast.success(`Wrote ${ok} opener${ok === 1 ? "" : "s"}`, { id: toastId });
      }
    } finally {
      if (single) setBusy(batch.map((l) => l.id), false);
      else setGenerating(false);
    }
  }

  async function handleEnrich(targets?: Lead[]) {
    const batch = targets ?? targetLeads();
    if (!batch.length) return;
    const single = Boolean(targets && targets.length === 1);
    if (single) setBusy(batch.map((l) => l.id), true);
    else setEnriching(true);

    const toastId = !single ? toast.loading(`Enriching 0/${batch.length}…`) : undefined;
    const CHUNK = 15;
    let ok = 0;
    let fail = 0;
    let provider = "";

    try {
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        try {
          const res = await enrichLeads(chunk);
          provider = res.provider;
          applyResults(
            res.results.map((r) => {
              const lead = leads.find((l) => l.id === r.id);
              const status: LeadStatus =
                lead && lead.status !== "pending" ? lead.status : "enriched";
              return { id: r.id, patch: { dossier: r.dossier, status } };
            }),
          );
          ok += res.results.length;
        } catch {
          fail += chunk.length;
        }
        if (toastId !== undefined) {
          toast.loading(`Enriching ${Math.min(i + CHUNK, batch.length)}/${batch.length}…`, {
            id: toastId,
          });
        }
      }

      if (single) {
        if (fail) toast.error("Couldn't enrich that lead — try again.");
        else
          toast.success("Enriched", {
            description: provider === "heuristic" ? "Limited data — add an enrichment key." : undefined,
          });
      } else if (fail && !ok) {
        toast.error("Enrichment failed", { id: toastId });
      } else if (fail) {
        toast.warning(`Enriched ${ok}, ${fail} failed`, { id: toastId });
      } else {
        toast.success(`Enriched ${ok} lead${ok === 1 ? "" : "s"}`, {
          id: toastId,
          description:
            provider === "heuristic"
              ? "Using row data — add an enrichment key for deeper profiles."
              : `Source: ${provider}`,
        });
      }
    } finally {
      if (single) setBusy(batch.map((l) => l.id), false);
      else setEnriching(false);
    }
  }

  function handleExport() {
    if (!leads.length) return;
    downloadCsv(leads, columns);
    toast.success("Exported SmartLead CSV", {
      description: "Import it, then use {{personalization}} in your email body.",
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll(ids: string[], checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
      return n;
    });
  }

  if (!mounted) {
    return (
      <>
        <AppHeader mode="loading" />
        <div className="flex-1" />
      </>
    );
  }

  return (
    <>
      <AppHeader mode={mode} model={model} />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        {leads.length > 0 ? (
          <div className="space-y-5">
            <CampaignBrief />
            <LeadsToolbar
              search={search}
              setSearch={setSearch}
              total={leads.length}
              generated={generated}
              selectedCount={selected.size}
              generating={generating}
              enriching={enriching}
              columns={columns}
              onGenerate={() => handleGenerate()}
              onEnrich={() => handleEnrich()}
              onExport={handleExport}
              onAddLead={(lead, cols) => addLead(lead, cols)}
              onImportLeads={(newLeads, cols) => addLeads(newLeads, cols)}
              onRemoveSelected={() => {
                const n = selected.size;
                removeLeads([...selected]);
                setSelected(new Set());
                toast.success(`Removed ${n} lead${n === 1 ? "" : "s"}`);
              }}
              onDeselectAll={() => setSelected(new Set())}
              onSelectFirst={(n) =>
                setSelected(new Set(filtered.slice(0, n).map((l) => l.id)))
              }
              selectableCount={filtered.length}
              onClear={() => {
                clearAll();
                setSelected(new Set());
              }}
            />
            <LeadsTable
              leads={pageLeads}
              selected={selected}
              busyIds={busyIds}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onEditLine={(id, text) =>
                updateLead(id, { personalization: text, status: "edited" })
              }
              onRegenerate={(id) => {
                const l = leads.find((x) => x.id === id);
                if (l) handleGenerate([l]);
              }}
              onEnrichOne={(id) => {
                const l = leads.find((x) => x.id === id);
                if (l) handleEnrich([l]);
              }}
              onRemove={(id) => {
                removeLead(id);
                setSelected((prev) => {
                  const n = new Set(prev);
                  n.delete(id);
                  return n;
                });
              }}
            />
            <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
              <span className="text-muted-foreground">
                Showing {filtered.length === 0 ? 0 : safePage * pageSize + 1}–
                {Math.min(safePage * pageSize + pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  Per page
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                  >
                    {[20, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Prev
                </Button>
                <span className="text-muted-foreground tabular-nums">
                  Page {safePage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
            <SmartLeadTip />
          </div>
        ) : !hydrated || seeding ? (
          <SeedLoading />
        ) : (
          <SeedEmpty
            onImport={(l, c) => {
              setLeads(l, c);
              setSelected(new Set());
            }}
          />
        )}
      </main>
    </>
  );
}

function SmartLeadTip() {
  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-xl border border-dashed p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
          <MailCheck className="size-4" />
        </div>
        <div>
          <p className="font-medium">Ready for SmartLead</p>
          <p className="text-muted-foreground">
            Export the CSV, import it as a new lead list, then reference your line as{" "}
            <code className="bg-background rounded px-1 py-0.5 text-xs">{"{{personalization}}"}</code>{" "}
            in the email body.
          </p>
        </div>
      </div>
    </div>
  );
}

function SeedLoading() {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
      <Loader2 className="size-4 animate-spin" />
      Loading…
    </div>
  );
}

function SeedEmpty({
  onImport,
}: {
  onImport: (leads: Lead[], columns: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    setBusy(true);
    try {
      const { leads, columns } = await parseFile(file);
      if (leads.length) {
        onImport(leads, columns);
        toast.success(`Imported ${leads.length} lead${leads.length === 1 ? "" : "s"}`);
      } else {
        toast.error("No rows found in that file");
      }
    } catch {
      toast.error("Couldn't parse that file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-sm font-medium">No leads loaded</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Put <code className="bg-muted rounded px-1 py-0.5 text-xs">SemisExecs.csv</code> in the
        project folder, or import a file.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="outline" disabled={busy} onClick={() => window.location.reload()}>
          Retry
        </Button>
        <Button disabled={busy} onClick={() => inputRef.current?.click()}>
          <FileUp className="size-4" />
          Import a file
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
