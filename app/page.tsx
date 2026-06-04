"use client";

import { useEffect, useMemo, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { UploadZone } from "@/components/upload-zone";
import { CampaignBrief } from "@/components/campaign-brief";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { LeadsTable } from "@/components/leads-table";
import { useStore } from "@/lib/store";
import { enrichLeads, generateLines, getStatus } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import type { Lead, LeadStatus } from "@/lib/types";

type Mode = "anthropic" | "gateway" | "mock" | "loading";

export default function Page() {
  const leads = useStore((s) => s.leads);
  const columns = useStore((s) => s.columns);
  const config = useStore((s) => s.config);
  const setLeads = useStore((s) => s.setLeads);
  const updateLead = useStore((s) => s.updateLead);
  const applyResults = useStore((s) => s.applyResults);
  const removeLead = useStore((s) => s.removeLead);
  const clearAll = useStore((s) => s.clearAll);

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [model, setModel] = useState<string>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    getStatus()
      .then((s) => {
        setMode(s.mode as Mode);
        setModel(s.model);
      })
      .catch(() => setMode("mock"));
  }, []);

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

    try {
      const { results, mode: m, degraded } = await generateLines(batch, config);
      applyResults(
        results.map((r) => ({
          id: r.id,
          patch: { personalization: r.line, status: "generated" as LeadStatus },
        })),
      );
      if (single) {
        // quiet success for a single-row regenerate
      } else if (m === "mock") {
        toast.message("Generated demo lines", {
          description: "Add an AI key for real personalization (see “Demo mode”).",
        });
      } else if (degraded > 0) {
        toast.warning(`Wrote ${results.length} lines`, {
          description: `${degraded} fell back to placeholder text.`,
        });
      } else {
        toast.success(`Wrote ${results.length} opener${results.length === 1 ? "" : "s"}`);
      }
    } catch {
      toast.error("Generation failed", {
        description: "Check the dev server logs and your API key.",
      });
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

    try {
      const { results, provider } = await enrichLeads(batch);
      applyResults(
        results.map((r) => {
          const lead = leads.find((l) => l.id === r.id);
          const status: LeadStatus =
            lead && lead.status !== "pending" ? lead.status : "enriched";
          return { id: r.id, patch: { dossier: r.dossier, status } };
        }),
      );
      if (!single) {
        toast.success(`Enriched ${results.length} lead${results.length === 1 ? "" : "s"}`, {
          description:
            provider === "heuristic"
              ? "Using row data — add an enrichment key for deeper profiles."
              : `Source: ${provider}`,
        });
      }
    } catch {
      toast.error("Enrichment failed");
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
        {leads.length === 0 ? (
          <UploadZone
            onLeads={(l, c) => {
              setLeads(l, c);
              setSelected(new Set());
            }}
          />
        ) : (
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
              onGenerate={() => handleGenerate()}
              onEnrich={() => handleEnrich()}
              onExport={handleExport}
              onClear={() => {
                clearAll();
                setSelected(new Set());
              }}
            />
            <LeadsTable
              leads={filtered}
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
            <SmartLeadTip />
          </div>
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
