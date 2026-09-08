"use client";

import { useEffect, useState } from "react";
import { Building2, Calendar, FileText, Plus, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listSubmissions } from "@/lib/api";
import type { SubmissionSummary } from "@/lib/types";

interface Props {
  userName: string;
  onNew: () => void;
  onOpen: (id: string) => void;
}

/**
 * Landing view when the user opens /tap. Lists their previous TAP
 * submissions (newest first) so they can reopen one, or start a new
 * intake. Mirrors the "My TAPs" tab from the tap-map-builder reference.
 */
export default function TapList({ userName, onNew, onOpen }: Props) {
  const [items, setItems] = useState<SubmissionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSubmissions()
      .then((rows) => setItems(rows))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div data-atlas-tour="tap-list" className="mx-auto max-w-[1200px] px-4 md:px-8 py-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-raised pb-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
            TAP · My mappings
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            Your TAP submissions
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Signed in as <span className="font-semibold">{userName}</span>. Pick a
            previous mapping to review, or start a new one.
          </p>
        </div>
        <Button
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2 text-sm font-semibold text-canvas shadow-[0_2px_8px_rgba(255,54,33,0.4)] hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          New TAP
        </Button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load submissions: {error}
        </div>
      )}

      {items === null && !error && (
        <div className="flex items-center justify-center py-16 text-foreground/50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-raised bg-surface px-6 py-16 text-center">
          <FileText className="mx-auto h-8 w-8 text-foreground/30" />
          <h3 className="mt-3 text-base font-semibold">No submissions yet</h3>
          <p className="mt-1 text-sm text-foreground/60">
            Click <strong>New TAP</strong> above to create your first mapping.
          </p>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <ul className="divide-y divide-raised overflow-hidden rounded-lg border border-raised bg-surface shadow-card">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onOpen(it.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-foreground/40" />
                    <span className="truncate text-base font-semibold text-foreground">
                      {it.company_name || "(unnamed)"}
                    </span>
                    {it.company_industry && (
                      <span className="hidden truncate rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-foreground/60 md:inline-block">
                        {it.company_industry}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/60">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {it.user_name || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(it.created_at)}
                    </span>
                    <span className="font-mono text-[11px] text-foreground/40">
                      #{it.id}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand">
                  Open →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(raw: string): string {
  if (!raw) return "—";
  // UC returns timestamps as "YYYY-MM-DD HH:MM:SS" or ISO — try both.
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
