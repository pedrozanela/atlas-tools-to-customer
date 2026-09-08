"use client";

import { Globe } from "lucide-react";

// Placeholder — TAP is English-only today. When next-intl is wired (matching
// apps/forge and apps/waf), this will switch the active locale. Kept here so
// the standardised header has the same shape across modules.
export function LanguageToggle() {
  return (
    <button
      type="button"
      aria-label="Language (English)"
      title="Language: English"
      disabled
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 cursor-not-allowed"
    >
      <Globe className="h-4 w-4" />
    </button>
  );
}
