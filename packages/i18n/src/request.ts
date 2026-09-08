import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "./config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Compose messages from per-module JSON files at messages/<locale>/<module>.json.
// This avoids the giant 50KB+ monolithic files of older projects.
const MODULES = ["platform", "forge", "waf", "tap-map"];

function loadMessages(locale: string): Record<string, unknown> {
  const root = process.cwd();
  // apps/web is the cwd when next runs; messages live at workspace root.
  const messagesRoot = join(root, "..", "..", "messages", locale);
  const merged: Record<string, unknown> = {};
  for (const mod of MODULES) {
    try {
      const path = join(messagesRoot, `${mod}.json`);
      const content = JSON.parse(readFileSync(path, "utf8"));
      // Namespace by module name: { platform: {...}, forge: {...}, ... }
      const key = mod.replace("-", "_");
      merged[key] = content;
    } catch {
      // missing file = empty namespace
      const key = mod.replace("-", "_");
      merged[key] = {};
    }
  }
  return merged;
}

export default getRequestConfig(async () => {
  const headerLocale = "en"; // TODO: parse Accept-Language or read cookie
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  return {
    locale,
    messages: loadMessages(locale),
  };
});
