"use client";

import { useState } from "react";
import {
  Search,
  Sparkles,
  Radar,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  search: string;
  setSearch: (v: string) => void;
  total: number;
  generated: number;
  selectedCount: number;
  generating: boolean;
  enriching: boolean;
  onGenerate: () => void;
  onEnrich: () => void;
  onExport: () => void;
  onClear: () => void;
};

export function LeadsToolbar({
  search,
  setSearch,
  total,
  generated,
  selectedCount,
  generating,
  enriching,
  onGenerate,
  onEnrich,
  onExport,
  onClear,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const target = selectedCount || total;
  const targetLabel = selectedCount ? `${selectedCount} selected` : "all";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email…"
            className="pl-8"
          />
        </div>
        <div className="text-muted-foreground hidden items-center gap-3 text-sm sm:flex">
          <Badge variant="secondary" className="font-normal">
            {total} lead{total === 1 ? "" : "s"}
          </Badge>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            {generated} written
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onEnrich} disabled={enriching || generating || total === 0}>
          {enriching ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
          Enrich
          <span className="text-muted-foreground hidden sm:inline">· {targetLabel}</span>
        </Button>

        <Button onClick={onGenerate} disabled={generating || enriching || total === 0}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate{target ? ` (${target})` : ""}
        </Button>

        <Button variant="outline" onClick={onExport} disabled={total === 0}>
          <Download className="size-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>

        <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
          <DialogTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Clear all" disabled={total === 0} />
            }
          >
            <Trash2 className="size-4" />
          </DialogTrigger>
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
    </div>
  );
}
