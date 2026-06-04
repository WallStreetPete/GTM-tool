import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { parseCsvText } from "@/lib/parse";

export const runtime = "nodejs";

// Reads a CSV from the project folder (default: SemisExecs.csv) so the app can
// auto-load it on startup instead of showing an upload screen. Override the
// filename/path with the SEED_CSV env var.
export async function GET() {
  const target = process.env.SEED_CSV || "SemisExecs.csv";
  const full = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
  try {
    const text = await fs.readFile(full, "utf8");
    const { leads, columns } = parseCsvText(text);
    return NextResponse.json({
      leads,
      columns,
      file: path.basename(full),
      count: leads.length,
    });
  } catch {
    return NextResponse.json({ leads: [], columns: [], file: null, count: 0 });
  }
}
