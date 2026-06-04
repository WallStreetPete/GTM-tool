// Deterministic, no-API fallback so the app is fully usable in "demo mode".
import type { GenerateConfig, Lead } from "./types";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function mockLine(lead: Lead, config: GenerateConfig): string {
  const name = lead.firstName || lead.fullName?.split(" ")[0] || "there";
  const company = lead.company || "your team";
  const title = (lead.title || "operator").toLowerCase();
  const theme = config.theme?.trim();

  const openers = [
    `Saw what ${company} is building — the kind of momentum that makes the ${title} role equal parts exciting and exhausting.`,
    `${company} keeps coming up in conversations I'm having${theme ? ` about ${theme}` : ""}, so figured I'd reach out to ${name} directly.`,
    `Most ${title}s I speak with are stretched thin right now — guessing ${name} at ${company} knows the feeling.`,
    `Been quietly impressed by ${company}'s trajectory; whoever's in the ${title} seat is clearly doing something right.`,
    `Noticed ${company} looks to be in a real growth window — usually means the ${title} is juggling ten priorities at once.`,
  ];

  const line = openers[hash(lead.id + company) % openers.length];
  if (config.lines === 2) {
    const second = theme
      ? ` Reaching out because ${theme} feels especially relevant to where ${company} is headed.`
      : ` Reaching out with something I think is genuinely relevant to where ${company} is headed.`;
    return line + second;
  }
  return line;
}
