"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Sparkles, Database, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseFile } from "@/lib/parse";
import { loadSample } from "@/lib/sample-data";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  onLeads: (leads: Lead[], columns: string[]) => void;
};

const FEATURES = [
  { icon: Database, title: "Upload any list", body: "Excel or CSV — columns are auto-detected." },
  { icon: Wand2, title: "Generate openers", body: "Concise, specific first lines per lead." },
  { icon: Sparkles, title: "Export to SmartLead", body: "One CSV with a {{personalization}} field." },
];

export function UploadZone({ onLeads }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const { leads, columns } = await parseFile(file);
      if (!leads.length) {
        toast.error("No rows found", { description: "That file looks empty or unreadable." });
        return;
      }
      onLeads(leads, columns);
      toast.success(`Imported ${leads.length} lead${leads.length === 1 ? "" : "s"}`, {
        description: file.name,
      });
    } catch {
      toast.error("Couldn't parse that file", {
        description: "Try a .xlsx or .csv export.",
      });
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Turn a lead list into personalized openers
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm sm:text-base">
          Drop in your leads, generate a sharp first line for each, and export a SmartLead-ready CSV.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "hover:border-primary/50 hover:bg-muted/40 border-border",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="bg-muted text-muted-foreground group-hover:text-foreground mb-4 flex size-12 items-center justify-center rounded-full transition-colors">
          {parsing ? (
            <UploadCloud className="size-6 animate-pulse" />
          ) : (
            <UploadCloud className="size-6" />
          )}
        </div>
        <p className="font-medium">
          {parsing ? "Reading your file…" : "Drag & drop your lead list"}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          or click to browse — <span className="font-medium">.xlsx</span> or{" "}
          <span className="font-medium">.csv</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            disabled={parsing}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <FileSpreadsheet className="size-4" />
            Browse files
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={parsing}
            onClick={(e) => {
              e.stopPropagation();
              const { leads, columns } = loadSample();
              onLeads(leads, columns);
              toast.success("Loaded sample leads", {
                description: "8 example contacts to try the flow.",
              });
            }}
          >
            <Sparkles className="size-4" />
            Try with sample data
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-card/50 rounded-lg border p-4">
            <f.icon className="text-muted-foreground mb-2 size-5" />
            <p className="text-sm font-medium">{f.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
