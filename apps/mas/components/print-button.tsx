"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-muted)] text-sm"
    >
      <Printer size={16} /> Baixar PDF
    </button>
  );
}
