import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sanitizeCategory } from "@/lib/config";

export const dynamic = "force-dynamic";

// Discovers tools per category from filenames under public/static/data_tools/.
// Returns the deduplicated, title-cased list. Mirrors backend/routers/config.py.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ category: string }> },
) {
  const { category: raw } = await ctx.params;
  const category = sanitizeCategory(decodeURIComponent(raw));
  const dir = path.join(process.cwd(), "public", "static", "data_tools", category);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return NextResponse.json({ category, tools: [] });
  }

  const tools = new Set<string>();
  for (const file of entries) {
    // Skip hidden / AppleDouble metadata files. macOS BSD tar can ship
    // `._foo.png` companion files for HFS xattrs; if those leak into the
    // container they show up here as bogus `. Foo` entries.
    if (file.startsWith(".") || file.startsWith("_")) continue;
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".svg" && ext !== ".png") continue;
    const stem = file.slice(0, -ext.length);
    // Filenames are lower_snake_case (e.g. "sql_server.png"); display label is
    // title-cased and re-spaced ("Sql Server").
    const label = stem
      .split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    tools.add(label);
  }

  return NextResponse.json({
    category,
    tools: Array.from(tools).sort(),
  });
}
