"use client";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DossierPopover } from "@/components/dossier-popover";
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
  const ids = leads.map((l) => l.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onCheckedChange={(v) => onToggleAll(ids, v === true)}
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Contact</TableHead>
              <TableHead className="min-w-[180px]">Role</TableHead>
              <TableHead className="min-w-[340px]">Personalized opener</TableHead>
              <TableHead className="w-10" />
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
                    <div className="flex items-start gap-3">
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
                    <p className="text-sm">{lead.title || "—"}</p>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <span className="truncate">{lead.company || ""}</span>
                      {lead.linkedin ? (
                        <a
                          href={lead.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground"
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
                          className="hover:text-foreground"
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
                      className="min-h-[3.25rem] resize-y text-sm leading-relaxed"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-medium", status.className)}>
                          {busy ? (
                            <span className="text-muted-foreground inline-flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" /> Working
                            </span>
                          ) : (
                            status.label
                          )}
                        </span>
                        {lead.dossier ? <DossierPopover dossier={lead.dossier} /> : null}
                      </div>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={busy}
                              onClick={() => onRegenerate(lead.id)}
                              aria-label="Regenerate"
                            />
                          }
                        >
                          <Sparkles className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>Regenerate this line</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-7" aria-label="Actions" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRegenerate(lead.id)} disabled={busy}>
                          <Sparkles className="size-4" />
                          Regenerate line
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEnrichOne(lead.id)} disabled={busy}>
                          <Radar className="size-4" />
                          Enrich background
                        </DropdownMenuItem>
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
