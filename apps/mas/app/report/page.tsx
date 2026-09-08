"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
  ChevronDown,
  Check,
  AlertCircle,
  User,
} from "lucide-react";
import { SESSIONS } from "@/lib/questionnaire";
import { RadarChart } from "@/components/radar-chart";

interface VersionInfo {
  id: string;
  version: number;
  score: number;
  tier: string;
  tier_label: string;
  submitted_at: string;
  user_email: string;
}

interface SectionData {
  key: string;
  title: string;
  subtitle: string;
  weight: number;
  questionCount: number;
  versionCount: number;
  versions: VersionInfo[];
}

interface ReportData {
  sections: Array<{
    section_key: string;
    title: string;
    weight: number;
    version: number;
    score: number;
    tier: string;
    tier_label: string;
    submitted_at: string;
    user_email: string;
    answers: Record<string, number>;
    notes: string | null;
    questions: Array<{ id: string; text: string; anchors: string[] }>;
    recommendations: Array<{
      title: string;
      detail: string;
      links?: Array<{ label: string; href: string }>;
    }>;
  }>;
  overall_score: number;
  overall_tier: string;
  overall_tier_label: string;
  generated_at: string;
  total_sections: number;
  sections_with_data: number;
}

function ReportPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionsData, setSectionsData] = useState<SectionData[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<
    Record<string, number>
  >({});
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fetch sections data
  useEffect(() => {
    async function fetchSections() {
      try {
        const res = await fetch("/maturity/api/sections/status");
        if (!res.ok) throw new Error("Erro ao carregar seções");

        const data = await res.json();

        // Fetch versions for each section that has submissions
        const sectionsWithVersions = await Promise.all(
          data.sections.map(async (section: SectionData) => {
            if (section.versionCount > 0) {
              const versionsRes = await fetch(
                `/maturity/api/sections/${section.key}`
              );
              if (versionsRes.ok) {
                const versionsData = await versionsRes.json();
                return { ...section, versions: versionsData.versions || [] };
              }
            }
            return { ...section, versions: [] };
          })
        );

        setSectionsData(sectionsWithVersions);

        // Set default selections (latest version for each)
        const defaults: Record<string, number> = {};
        sectionsWithVersions.forEach((s) => {
          if (s.versions.length > 0) {
            defaults[s.key] = s.versions[0].version; // versions are sorted DESC
          }
        });
        setSelectedVersions(defaults);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchSections();
  }, []);

  // Generate report
  async function generateReport() {
    setGenerating(true);
    setError(null);

    try {
      const selections = Object.entries(selectedVersions).map(
        ([key, version]) => ({
          section_key: key,
          version,
        })
      );

      const res = await fetch("/maturity/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao gerar relatório");
      }

      const data = await res.json();
      setReportData(data);
      // Push a history entry so the browser Back button returns to selection.
      router.push(`${pathname}?view=report`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  // Check if can generate report
  const completedSections = sectionsData.filter((s) => s.versionCount > 0);
  const canGenerate = completedSections.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2
          size={32}
          className="animate-spin text-[var(--color-muted-foreground)]"
        />
      </div>
    );
  }

  // Show the generated report only when the URL says so, so the browser Back
  // button returns to the selection view instead of leaving the page. The data
  // stays in memory; the ?view=report param controls which view renders.
  const showReport = searchParams.get("view") === "report" && reportData !== null;
  if (showReport && reportData) {
    return <ReportView report={reportData} onBack={() => router.back()} />;
  }

  return (
    <div data-atlas-tour="maturity-report" className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline mb-4"
          >
            <ArrowLeft size={16} /> Voltar ao Assessment
          </Link>
          <h1 className="text-2xl font-semibold">Relatório de Maturidade</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Selecione a versão de cada seção para incluir no relatório
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 text-red-900 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{completedSections.length}</span>
            <span className="text-[var(--color-muted-foreground)]">
              {" "}
              de {SESSIONS.length} seções preenchidas
            </span>
          </div>
          {completedSections.length < SESSIONS.length && (
            <Link
              href="/assessment"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Completar seções pendentes
            </Link>
          )}
        </div>
        <div className="mt-2 h-2 rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{
              width: `${(completedSections.length / SESSIONS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Section selectors */}
      <div className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold mb-4">Selecionar versões</h2>

        {sectionsData.map((section) => (
          <div
            key={section.key}
            className="rounded-xl border border-[var(--color-border)] p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{section.title}</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  Peso: {(section.weight * 100).toFixed(0)}%
                </div>
              </div>

              {section.versionCount > 0 ? (
                <div className="relative ml-4">
                  <button
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === section.key ? null : section.key
                      )
                    }
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)] min-w-[140px] justify-between"
                  >
                    <span>
                      v{selectedVersions[section.key]} -{" "}
                      {section.versions
                        .find(
                          (v) => v.version === selectedVersions[section.key]
                        )
                        ?.score?.toFixed(1) ?? "-"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition ${openDropdown === section.key ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdown === section.key && (
                    <div className="absolute right-0 top-full mt-1 z-10 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
                      {section.versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVersions((prev) => ({
                              ...prev,
                              [section.key]: v.version,
                            }));
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-[var(--color-muted)] first:rounded-t-xl last:rounded-b-xl ${
                            v.version === selectedVersions[section.key]
                              ? "bg-[var(--color-muted)]"
                              : ""
                          }`}
                        >
                          <div>
                            <span className="font-medium">v{v.version}</span>
                            <span className="text-[var(--color-muted-foreground)] ml-2">
                              {v.score?.toFixed(1) ?? "-"} - {v.tier_label ?? "N/A"}
                            </span>
                          </div>
                          {v.version === selectedVersions[section.key] && (
                            <Check
                              size={16}
                              className="text-[var(--color-primary)]"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/assessment/${section.key}`}
                  className="text-sm text-[var(--color-primary)] hover:underline ml-4"
                >
                  Preencher
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Generate button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={generateReport}
          disabled={!canGenerate || generating}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-3 font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <FileText size={18} />
              Gerar Relatório
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Report View Component
function ReportView({
  report,
  onBack,
}: {
  report: ReportData;
  onBack: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 print-report">
      {/* Header */}
      <div className="flex items-start justify-between no-print">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline mb-4"
          >
            <ArrowLeft size={16} /> Voltar à seleção
          </button>
          <h1 className="text-2xl font-semibold">
            Relatório de Maturidade Data & AI
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Gerado em{" "}
            {new Date(report.generated_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
        >
          <Printer size={16} /> Imprimir
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold">Relatório de Maturidade Data & AI</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gerado em{" "}
          {new Date(report.generated_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Overall Score + Radar Chart side by side */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 items-center">
        {/* Overall Score */}
        <div className="flex flex-col justify-center">
          <div className="text-sm uppercase tracking-widest text-[var(--color-muted-foreground)]">
            Score Geral
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <div className="text-6xl font-bold">
              {report.overall_score?.toFixed(2) ?? "0.00"}
            </div>
            <div className="text-2xl text-[var(--color-muted-foreground)]">
              / 5
            </div>
          </div>
          <div className="mt-4 inline-block px-4 py-1.5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-medium self-start">
            {report.overall_tier_label ?? "N/A"}
          </div>
          <p className="mt-6 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
            Média ponderada de {report.total_sections} dimensões.
          </p>
        </div>

        {/* Radar Chart */}
        {report.sections.length > 0 && (
          <div className="flex items-center justify-center">
            <RadarChart
              sessions={report.sections.map((s) => ({
                key: s.section_key,
                title: s.title,
                score: s.score ?? 0,
              }))}
              size={480}
            />
          </div>
        )}
      </div>

      {/* Scores by section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Score por Dimensão</h2>
        <div className="grid gap-3">
          {report.sections.map((section) => (
            <div
              key={section.section_key}
              className="rounded-xl border border-[var(--color-border)] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    v{section.version} • Peso: {(section.weight * 100).toFixed(0)}%
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] mt-1">
                    <User size={12} />
                    <span>{section.user_email}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {section.score?.toFixed(2) ?? "0.00"}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {section.tier_label ?? "N/A"}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 rounded-full bg-[var(--color-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${((section.score ?? 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="mt-10 print-page-break">
        <h2 className="text-xl font-semibold mb-6">
          Recomendações por Dimensão
        </h2>

        {report.sections.map((section, sectionIdx) => (
          <div
            key={section.section_key}
            className={sectionIdx > 0 ? "mt-8 print-page-break" : ""}
          >
            <h3 className="text-lg font-semibold mb-4">
              {section.title}
              <span className="text-sm font-normal text-[var(--color-muted-foreground)] ml-2">
                (Score: {section.score?.toFixed(2) ?? "0.00"} - {section.tier_label ?? "N/A"})
              </span>
            </h3>

            <div className="space-y-4">
              {section.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--color-border)] p-4"
                >
                  <div className="font-medium">{rec.title}</div>
                  <div className="text-sm text-[var(--color-muted-foreground)] mt-2">
                    {rec.detail}
                  </div>
                  {rec.links && rec.links.length > 0 && (
                    <>
                      {/* Interactive buttons - hidden on print */}
                      <div className="mt-3 flex flex-wrap gap-2 no-print">
                        {rec.links.map((l) => (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                          >
                            {l.label} ↗
                          </a>
                        ))}
                      </div>
                      {/* Print version */}
                      <div className="mt-3 print-only text-xs text-gray-600">
                        <div className="font-medium mb-1">Referências:</div>
                        {rec.links.map((l) => (
                          <div key={l.href} className="break-all">
                            • {l.label}: {l.href}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-muted-foreground)]">
        <p>
          Relatório gerado automaticamente pelo Assessment de Maturidade Data &
          AI
        </p>
        <p className="mt-1">
          {new Date(report.generated_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  // useSearchParams() requires a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      }
    >
      <ReportPageInner />
    </Suspense>
  );
}
