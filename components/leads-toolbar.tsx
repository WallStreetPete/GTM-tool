"use client";

import { useRef, useState } from "react";
import {
  Search,
  Sparkles,
  Radar,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  Plus,
  UserPlus,
  FileUp,
  MoreHorizontal,
  ChevronDown,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { parseFile } from "@/lib/parse";
import type { Lead } from "@/lib/types";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  total: number;
  generated: number;
  selectedCount: number;
  generating: boolean;
  enriching: boolean;
  columns: string[];
  onGenerate: () => void;
  onEnrich: () => void;
  onExport: () => void;
  onClear: () => void;
  onAddLead: (lead: Lead, columns: string[]) => void;
  onImportLeads: (leads: Lead[], columns: string[]) => void;
  onRemoveSelected: () => void;
  onDeselectAll: () => void;
  onSelectFirst: (n: number) => void;
  selectableCount: number;
};

export function LeadsToolbar({
  search,
  setSearch,
  total,
  generated,
  selectedCount,
  generating,
  enriching,
  columns,
  onGenerate,
  onEnrich,
  onExport,
  onClear,
  onAddLead,
  onImportLeads,
  onRemoveSelected,
  onDeselectAll,
  onSelectFirst,
  selectableCount,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [customN, setCustomN] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  function selectFirst(n: number) {
    const clamped = Math.min(selectableCount, Math.max(1, Math.floor(n) || 0));
    if (clamped > 0) onSelectFirst(clamped);
    setSelectOpen(false);
  }

  async function handleImport(file: File) {
    try {
      const { leads, columns: cols } = await parseFile(file);
      if (!leads.length) {
        toast.error("No rows found in that file");
        return;
      }
      onImportLeads(leads, cols);
      toast.success(`Added ${leads.length} lead${leads.length === 1 ? "" : "s"}`, {
        description: file.name,
      });
    } catch {
      toast.error("Couldn't parse that file");
    }
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email…"
            className="pl-8"
          />
        </div>

        <Popover open={selectOpen} onOpenChange={setSelectOpen}>
          <PopoverTrigger render={<Button variant="outline" disabled={selectableCount === 0} />}>
            <ListChecks className="size-4" />
            Select
            <ChevronDown className="size-3.5 opacity-60" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="mb-2 text-sm font-medium">Select the first…</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[100, 200, 300, 500].map((n) => (
                <Button
                  key={n}
                  variant="secondary"
                  size="sm"
                  disabled={n > selectableCount}
                  onClick={() => selectFirst(n)}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="col-span-2"
                onClick={() => selectFirst(selectableCount)}
              >
                All ({selectableCount})
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={selectableCount}
                value={customN}
                onChange={(e) => setCustomN(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customN) selectFirst(Number(customN));
                }}
                placeholder="Custom #"
                className="h-8"
              />
              <Button size="sm" disabled={!customN} onClick={() => selectFirst(Number(customN))}>
                Go
              </Button>
            </div>
            {selectedCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-center"
                onClick={() => {
                  onDeselectAll();
                  setSelectOpen(false);
                }}
              >
                Clear selection ({selectedCount})
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>

        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <Button variant="destructive" size="sm" onClick={onRemoveSelected}>
              <Trash2 className="size-3.5" />
              Remove
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeselectAll}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="text-muted-foreground hidden items-center gap-3 text-sm sm:flex">
            <Badge variant="secondary" className="font-normal">
              {total} lead{total === 1 ? "" : "s"}
            </Badge>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              {generated} written
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <Plus className="size-4" />
            Add
            <ChevronDown className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" />
              Add a person
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => importRef.current?.click()}>
              <FileUp className="size-4" />
              Import a file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={onEnrich} disabled={enriching || generating || total === 0}>
          {enriching ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
          Enrich
        </Button>

        <Button onClick={onGenerate} disabled={generating || enriching || total === 0}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate{selectedCount ? ` (${selectedCount})` : ""}
        </Button>

        <Button variant="outline" onClick={onExport} disabled={total === 0}>
          <Download className="size-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More actions" />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              disabled={total === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="size-4" />
              Clear all leads
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden input for "Import a file" */}
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} columns={columns} onAdd={onAddLead} />

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all leads?</DialogTitle>
            <DialogDescription>
              This removes all {total} leads and their generated lines from this browser. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              Clear everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
