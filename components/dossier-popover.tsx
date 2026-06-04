"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Dossier } from "@/lib/types";

const SOURCE_LABEL: Record<Dossier["source"], string> = {
  linkedin: "LinkedIn",
  pdl: "People Data Labs",
  apollo: "Apollo",
  exa: "Web search",
  serper: "Web search",
  heuristic: "From row data",
};

export function DossierPopover({ dossier }: { dossier: Dossier }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          />
        }
      >
        <Info className="size-3.5" />
        Dossier
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Background</p>
            <Badge variant="secondary" className="text-[10px]">
              {SOURCE_LABEL[dossier.source]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">{dossier.summary}</p>
          {dossier.signals?.length ? (
            <div>
              <p className="mb-1 text-xs font-medium">Signals</p>
              <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                {dossier.signals.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {dossier.pastRoles?.length ? (
            <div>
              <p className="mb-1 text-xs font-medium">Career</p>
              <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                {dossier.pastRoles.slice(0, 5).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
