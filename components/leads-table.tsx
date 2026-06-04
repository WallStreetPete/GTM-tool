"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Link2,
  Globe,
  MoreHorizontal,
  Sparkles,
  Radar,
  Copy,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DossierView } from "@/components/dossier-view";
import {
  useStore,
  DEFAULT_COL_WIDTHS,
  MIN_COL_WIDTHS,
  type ColumnKey,
} from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  leads: Lead[];
  selected: Set<string>;
  busyIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onEditLine: (id: string, text: string) => void;
  onRegenerate: (id: string) => void;
  onEnrichOne: (id: string) => void;
  onRemove: (id: string) => void;
};

const STATUS: Record<LeadStatus, { label: string; className: string }> = {
  pending: { label: "New", className: "text-muted-foreground" },
  enriched: { label: "Enriched", className: "text-sky-600 dark:text-sky-400" },
  generated: { label: "Written", className: "text-emerald-600 dark:text-emerald-400" },
  edited: { label: "Edited", className: "text-amber-600 dark:text-amber-400" },
  error: { label: "Error", className: "text-destructive" },
};

function initials(lead: Lead): string {
  const f = lead.firstName?.[0] ?? lead.fullName?.[0] ?? "";
  const l = lead.lastName?.[0] ?? lead.fullName?.split(/\s+/)[1]?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

export function LeadsTable({
  leads,
  selected,
  busyIds,
  onToggle,
  onToggleAll,
  onEditLine,
  onRegenerate,
  onEnrichOne,
  onRemove,
}: Props) {
  const columnWidths = useStore((s) => s.columnWidths);
  const setColumnWidth = useStore((s) => s.setColumnWidth);
  const [drag, setDrag] = useState<{ key: ColumnKey; w: number } | null>(null);

  const widthOf = (key: ColumnKey) =>
    drag?.key === key ? drag.w : (columnWidths[key] ?? DEFAULT_COL_WIDTHS[key]);
  const total =
    widthOf("select") +
    widthOf("contact") +
    widthOf("role") +
    widthOf("opener") +
    widthOf("actions");

  function startResize(e: ReactMouseEvent, key: ColumnKey) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthOf(key);
    const min = MIN_COL_WIDTHS[key];
    const onMove = (ev: MouseEvent) =>
      setDrag({ key, w: Math.max(min, startW + ev.clientX - startX) });
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setColumnWidth(key, Math.max(min, startW + ev.clientX - startX));
      setDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const ids = leads.map((l) => l.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className={cn("overflow-x-auto", drag && "select-none")}>
        <Table className="table-fixed" style={{ width: total }}>
          <colgroup>
            <col style={{ width: widthOf("select") }} />
            <col style={{ width: widthOf("contact") }} />
            <col style={{ width: widthOf("role") }} />
            <col style={{ width: widthOf("opener") }} />
            <col style={{ width: widthOf("actions") }} />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onCheckedChange={(v) => onToggleAll(ids, v === true)}
                />
              </TableHead>
              <TableHead className="relative">
                Contact
                <ResizeHandle onMouseDown={(e) => startResize(e, "contact")} />
              </TableHead>
              <TableHead className="relative">
                Role
                <ResizeHandle onMouseDown={(e) => startResize(e, "role")} />
              </TableHead>
              <TableHead className="relative">
                Personalized opener
                <ResizeHandle onMouseDown={(e) => startResize(e, "opener")} />
              </TableHead>
              <TableHead className="relative pr-4 text-right">
                Actions
                <ResizeHandle onMouseDown={(e) => startResize(e, "actions")} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const busy = busyIds.has(lead.id);
              const status = STATUS[lead.status];
              return (
                <TableRow key={lead.id} data-state={selected.has(lead.id) ? "selected" : undefined}>
                  <TableCell className="pl-4 align-top">
                    <Checkbox
                      aria-label="Select row"
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => onToggle(lead.id)}
                    />
                  </TableCell>

                  {/* Contact */}
                  <TableCell className="align-top">
                    <div className="flex items-start gap-2.5">
                      <div className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                        {initials(lead)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {lead.fullName || lead.firstName || "—"}
                        </p>
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-muted-foreground hover:text-foreground block truncate text-xs"
                          >
                            {lead.email}
                          </a>
                        ) : null}
                        {lead.location ? (
                          <p className="text-muted-foreground truncate text-xs">{lead.location}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="align-top">
                    <p className="truncate text-sm">{lead.title || "—"}</p>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <span className="truncate">{lead.company || ""}</span>
                      {lead.linkedin ? (
                        <a
                          href={lead.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground shrink-0"
                          aria-label="LinkedIn"
                        >
                          <Link2 className="size-3.5" />
                        </a>
                      ) : null}
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground shrink-0"
                          aria-label="Website"
                        >
                          <Globe className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Opener */}
                  <TableCell className="align-top">
                    <Textarea
                      value={lead.personalization ?? ""}
                      onChange={(e) => onEditLine(lead.id, e.target.value)}
                      placeholder={busy ? "Generating…" : "Not generated yet — hit Generate."}
                      disabled={busy}
                      className="min-h-14 w-full min-w-0 resize-y text-sm leading-relaxed"
                    />
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className={cn("text-xs font-medium", status.className)}>
                        {busy ? (
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" /> Working
                          </span>
                        ) : (
                          status.label
                        )}
                      </span>
                      {lead.dossier ? <DossierView lead={lead} dossier={lead.dossier} /> : null}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="pr-4 align-top">
                    {busy ? (
                      <div className="text-muted-foreground flex h-8 items-center gap-1.5 text-xs">
                        <Loader2 className="size-3.5 animate-spin" />
                        Working…
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => onEnrichOne(lead.id)}
                            title="Pull this person's LinkedIn background"
                          >
                            <Radar className="size-3.5" />
                            Enrich
                          </Button>
                          <Button
                            size="sm"
                            className="w-full justify-center"
                            onClick={() => onRegenerate(lead.id)}
                            title="Write a personalized email opener from the context"
                          >
                            <Sparkles className="size-3.5" />
                            Generate
                          </Button>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="More" />}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!lead.personalization}
                              onClick={() => {
                                navigator.clipboard.writeText(lead.personalization ?? "");
                                toast.success("Copied to clipboard");
                              }}
                            >
                              <Copy className="size-4" />
                              Copy line
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => onRemove(lead.id)}>
                              <Trash2 className="size-4" />
                              Remove lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {leads.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No leads match your search.
        </div>
      ) : null}
    </div>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: ReactMouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="hover:bg-primary/50 absolute top-0 -right-[5px] z-20 h-full w-2.5 cursor-col-resize touch-none select-none"
      aria-hidden
    />
  );
}
