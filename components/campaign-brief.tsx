"use client";

import { ChevronDown, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CampaignBrief() {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const open = useStore((s) => s.briefOpen);
  const setOpen = useStore((s) => s.setBriefOpen);

  return (
    <Card className="overflow-hidden p-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
              <Target className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Campaign brief</p>
              <p className="text-muted-foreground text-xs">
                {config.theme?.trim()
                  ? config.theme
                  : "Tell the AI the angle, who you're targeting, and your voice."}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid gap-4 border-t px-5 py-5 sm:grid-cols-2">
            <Field
              id="theme"
              label="Theme / angle"
              hint="What the campaign is about"
            >
              <Input
                id="theme"
                placeholder="e.g. Helping RevOps teams cut CRM busywork"
                value={config.theme}
                onChange={(e) => setConfig({ theme: e.target.value })}
              />
            </Field>

            <Field id="icp" label="Target ICP" hint="Who you're emailing">
              <Input
                id="icp"
                placeholder="e.g. VP Sales at 50–200 person B2B SaaS"
                value={config.icp}
                onChange={(e) => setConfig({ icp: e.target.value })}
              />
            </Field>

            <Field
              id="offer"
              label="Your offer"
              hint="The value prop / what you're pitching"
            >
              <Textarea
                id="offer"
                rows={2}
                placeholder="e.g. We auto-enrich and personalize cold emails so reply rates go up without more SDR hours."
                value={config.offer}
                onChange={(e) => setConfig({ offer: e.target.value })}
              />
            </Field>

            <Field
              id="style"
              label="Style & tone"
              hint="How the opener should sound"
            >
              <Textarea
                id="style"
                rows={2}
                value={config.style}
                onChange={(e) => setConfig({ style: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field id="opening" label="How to open" hint="What to lead with at the very start">
                <Textarea
                  id="opening"
                  rows={2}
                  placeholder="e.g. Open by referencing something specific from their background, then one genuine, non-cheesy compliment."
                  value={config.opening}
                  onChange={(e) => setConfig({ opening: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex items-center gap-2.5">
                <Label htmlFor="maxChars" className="font-normal">
                  Max characters
                </Label>
                <Input
                  id="maxChars"
                  type="number"
                  min={40}
                  max={1000}
                  step={10}
                  value={config.maxChars}
                  onChange={(e) => setConfig({ maxChars: Number(e.target.value) || 0 })}
                  className="h-8 w-24"
                />
                <span className="text-muted-foreground text-xs">
                  ≈ {Math.max(1, Math.round(config.maxChars / 6))} words
                </span>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5">
                <Switch
                  checked={config.personalityAware}
                  onCheckedChange={(v) => setConfig({ personalityAware: v })}
                />
                <span className="text-sm">
                  Personality-aware
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    (match their style)
                  </span>
                </span>
              </label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-baseline gap-2">
        {label}
        {hint ? <span className="text-muted-foreground text-xs font-normal">{hint}</span> : null}
      </Label>
      {children}
    </div>
  );
}
