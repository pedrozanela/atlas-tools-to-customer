"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SESSIONS } from "@/lib/questionnaire";
import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

interface SectionVersionInfo {
  key: string;
  versionCount: number;
  latestScore: number | null;
}

export function AssessmentSidebar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sectionsStatus, setSectionsStatus] = useState<
    Record<string, SectionVersionInfo>
  >({});

  // Fetch sections status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/maturity/api/sections/status", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const statusMap: Record<string, SectionVersionInfo> = {};
          data.sections.forEach(
            (s: { key: string; versionCount: number; latestScore: number | null }) => {
              statusMap[s.key] = {
                key: s.key,
                versionCount: s.versionCount,
                latestScore: s.latestScore,
              };
            }
          );
          setSectionsStatus(statusMap);
        }
      } catch {
        // Keep default empty status
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [pathname]); // Refetch when route changes

  // Count completed sections
  const completedCount = Object.values(sectionsStatus).filter(
    (s) => s.versionCount > 0
  ).length;

  return (
    <aside
      data-atlas-tour="maturity-navigation"
      className="w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4"
    >
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Assessment
        </div>
        <div className="font-medium">Maturidade Data & AI</div>
        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {loading ? (
            <span className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Carregando...
            </span>
          ) : (
            `${completedCount} de ${SESSIONS.length} seções preenchidas`
          )}
        </div>
      </div>

      <nav className="space-y-1">
        {SESSIONS.map((session, idx) => {
          const status = sectionsStatus[session.key];
          const versionCount = status?.versionCount ?? 0;
          const latestScore = status?.latestScore;
          const hasVersions = versionCount > 0;
          const href = hasVersions
            ? `/assessment/${session.key}/results`
            : `/assessment/${session.key}`;
          const isActive = pathname?.includes(`/assessment/${session.key}`);

          return (
            <Link
              key={session.key}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "hover:bg-[var(--color-muted)]"
              }`}
            >
              <span
                className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  hasVersions
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "border border-[var(--color-border)]"
                } ${isActive && hasVersions ? "bg-white text-[var(--color-primary)]" : ""}`}
              >
                {hasVersions ? (
                  <span className="font-medium">v{versionCount}</span>
                ) : (
                  <span className="text-[var(--color-muted-foreground)]">
                    {idx + 1}
                  </span>
                )}
              </span>
              <span className="truncate flex-1">{session.title}</span>
              {hasVersions && latestScore !== null && (
                <span
                  className={`text-xs ${isActive ? "text-white/80" : "text-[var(--color-muted-foreground)]"}`}
                >
                  {latestScore.toFixed(1)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        <Link
          href="/report"
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            completedCount > 0
              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
              : "border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          }`}
        >
          <FileText size={16} />
          {completedCount > 0 ? "Ver Relatório" : "Relatório"}
        </Link>
      </div>
    </aside>
  );
}
