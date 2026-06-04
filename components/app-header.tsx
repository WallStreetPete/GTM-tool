"use client";

import { Send, Sparkles, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ModeToggle } from "@/components/mode-toggle";

type Props = {
  mode: "anthropic" | "gateway" | "mock" | "loading";
  model?: string;
};

export function AppHeader({ mode, model }: Props) {
  const isLive = mode === "anthropic" || mode === "gateway";

  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm">
            <Send className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2 font-semibold tracking-tight">
              OutboundAuto
            </div>
            <p className="text-muted-foreground hidden text-xs sm:block">
              Personalized cold email, at scale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "loading" ? null : isLive ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  />
                }
              >
                <Sparkles className="size-3" />
                Live AI
              </TooltipTrigger>
              <TooltipContent>
                Generating with {model ?? "Claude"} ({mode === "gateway" ? "AI Gateway" : "Anthropic"})
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  />
                }
              >
                <FlaskConical className="size-3" />
                Demo mode
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                No AI key detected — lines are placeholder text. Add ANTHROPIC_API_KEY to{" "}
                <code>.env.local</code> and restart to generate real openers.
              </TooltipContent>
            </Tooltip>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
