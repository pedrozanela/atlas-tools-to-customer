"use client";

import Link from "next/link";
import { ChevronRight, FileText, History } from "lucide-react";

interface SectionVersionInfo {
  key: string;
  title: string;
  subtitle: string;
  weight: number;
  questionCount: number;
  versionCount: number;
  latestVersion: number | null;
  latestScore: number | null;
  latestTier: string | null;
  latestTierLabel: string | null;
  latestSubmittedAt: string | null;
}

interface SectionMenuProps {
  sections: SectionVersionInfo[];
  totalSections: number;
  sectionsWithVersions: number;
}

export function SectionMenu({
  sections,
  totalSections,
  sectionsWithVersions,
}: SectionMenuProps) {
  return (
    <div data-atlas-tour="maturity-sections" className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Avaliação de Maturidade</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {sectionsWithVersions} de {totalSections} seções preenchidas
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, idx) => {
          const hasVersions = section.versionCount > 0;
          const href = `/assessment/${section.key}`;

          return (
            <Link
              key={section.key}
              href={href}
              className={`group relative rounded-xl border p-4 transition hover:shadow-md ${
                hasVersions
                  ? "border-green-500/50"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)]/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    hasVersions
                      ? "bg-green-500 text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {hasVersions ? `v${section.latestVersion}` : idx + 1}
                </span>
                <ChevronRight
                  size={18}
                  className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]"
                />
              </div>

              <h3 className="mt-3 font-medium leading-snug">{section.title}</h3>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)] line-clamp-2">
                {section.subtitle}
              </p>

              {hasVersions && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <History size={12} />
                    {section.versionCount} versão(ões)
                  </div>
                  <div className="text-xs font-medium text-[var(--color-primary)]">
                    {section.latestScore?.toFixed(1)} - {section.latestTierLabel}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center">
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-3 font-medium hover:opacity-90"
        >
          <FileText size={18} />
          {sectionsWithVersions > 0
            ? "Ver Relatório"
            : "Ver Relatório (sem dados ainda)"}
        </Link>
      </div>
    </div>
  );
}
