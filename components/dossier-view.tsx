"use client";

import type { ReactNode } from "react";
import { Briefcase, GraduationCap, ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Dossier, Lead } from "@/lib/types";

const SOURCE_LABEL: Record<Dossier["source"], string> = {
  linkedin: "LinkedIn",
  apollo: "Apollo",
  exa: "Web search",
  serper: "Web search",
  heuristic: "From row data",
};

export function DossierView({ lead, dossier }: { lead: Lead; dossier: Dossier }) {
  const p = dossier.profile;
  const linkedin = p?.linkedinUrl || lead.linkedin;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          />
        }
      >
        <FileText className="size-3.5" />
        View profile
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-7">
            <DialogTitle>{lead.fullName || "Profile"}</DialogTitle>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {SOURCE_LABEL[dossier.source]}
            </Badge>
          </div>
          {p?.headline || lead.title ? (
            <p className="text-muted-foreground text-sm">{p?.headline || lead.title}</p>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {p?.location || lead.location ? <span>{p?.location || lead.location}</span> : null}
            {p?.followerCount ? <span>{p.followerCount.toLocaleString()} followers</span> : null}
            {linkedin ? (
              <a
                href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                <ExternalLink className="size-3" />
                LinkedIn
              </a>
            ) : null}
          </div>

          {dossier.summary ? (
            <Section title="Summary">
              <p className="text-muted-foreground leading-relaxed">{dossier.summary}</p>
            </Section>
          ) : null}

          {p?.about ? (
            <Section title="About / bio">
              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{p.about}</p>
            </Section>
          ) : null}

          {p?.experiences?.length ? (
            <Section title="Experience" icon={<Briefcase className="size-3.5" />}>
              <div className="space-y-3">
                {p.experiences.map((e, i) => (
                  <div key={i} className="border-l-2 pl-3">
                    <p className="font-medium">
                      {e.title}
                      {e.company ? <span className="text-muted-foreground"> · {e.company}</span> : null}
                    </p>
                    {e.dateRange || e.location ? (
                      <p className="text-muted-foreground text-xs">
                        {[e.dateRange, e.location].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}
                    {e.description ? (
                      <p className="text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap text-xs">
                        {e.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {p?.educations?.length ? (
            <Section title="Education" icon={<GraduationCap className="size-3.5" />}>
              <div className="space-y-2">
                {p.educations.map((e, i) => (
                  <div key={i}>
                    <p className="font-medium">{e.school}</p>
                    {e.degree || e.field || e.dateRange ? (
                      <p className="text-muted-foreground text-xs">
                        {[e.degree, e.field, e.dateRange].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {p?.skills?.length ? (
            <Section title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </Section>
          ) : null}

          {!p && dossier.signals?.length ? (
            <Section title="Signals">
              <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                {dossier.signals.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {!p && dossier.pastRoles?.length ? (
            <Section title="Career">
              <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                {dossier.pastRoles.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
