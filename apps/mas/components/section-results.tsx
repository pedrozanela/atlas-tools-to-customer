"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Printer, History, ChevronDown, Plus } from "lucide-react";
import { SESSIONS } from "@/lib/questionnaire";

interface VersionData {
  id: string;
  version: number;
  score: number;
  tier: string;
  tier_label: string;
  notes: string | null;
  user_email: string;
  user_name: string | null;
  submitted_at: string;
  answers: Record<string, number>;
}

interface SectionResultsProps {
  section: {
    key: string;
    title: string;
    subtitle: string;
    weight: number;
    questions: Array<{
      id: string;
      text: string;
      anchors: string[];
    }>;
    recommendations: Array<{
      title: string;
      detail: string;
      links?: Array<{ label: string; href: string }>;
    }>;
  };
  versions: VersionData[];
  versionCount: number;
}

export function SectionResults({
  section,
  versions,
  versionCount,
}: SectionResultsProps) {
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const selectedVersion = versions[selectedVersionIdx];

  // Find next section
  const currentIdx = SESSIONS.findIndex((s) => s.key === section.key);
  const nextSession = currentIdx < SESSIONS.length - 1 ? SESSIONS[currentIdx + 1] : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 print-report">
      {/* Header */}
      <div className="flex items-start justify-between no-print">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Resultado da Seção
          </div>
          <h1 className="text-2xl font-semibold mt-1">{section.title}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            {section.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/assessment/${section.key}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
          >
            <Plus size={16} /> Nova versão
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Version Selector */}
      {versionCount > 1 && (
        <div className="mt-6 no-print">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <History size={16} />
            <span>Exibindo versão v{selectedVersion.version} de {versionCount}</span>
            <ChevronDown size={16} className={`transition ${showHistory ? "rotate-180" : ""}`} />
          </button>

          {showHistory && (
            <div className="mt-3 rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {versions.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVersionIdx(idx);
                    setShowHistory(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-[var(--color-muted)] ${
                    idx === selectedVersionIdx ? "bg-[var(--color-muted)]" : ""
                  }`}
                >
                  <div>
                    <span className="font-medium">v{v.version}</span>
                    <span className="text-[var(--color-muted-foreground)] ml-2">
                      {v.score.toFixed(1)} - {v.tier_label}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {v.user_email} • {new Date(v.submitted_at).toLocaleDateString("pt-BR")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Score Card */}
      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-center gap-2 mb-4 text-sm text-[var(--color-muted-foreground)]">
          <span className="px-2 py-0.5 rounded-full bg-[var(--color-muted)] font-medium">
            v{selectedVersion.version}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-sm uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Score desta dimensão
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <div className="text-5xl font-bold">
                {selectedVersion.score.toFixed(2)}
              </div>
              <div className="text-xl text-[var(--color-muted-foreground)]">
                / 5
              </div>
            </div>
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-medium">
              {selectedVersion.tier_label}
            </div>
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Peso na avaliação geral: {(section.weight * 100).toFixed(0)}%
            </p>
          </div>

          <div>
            <div className="text-sm font-medium mb-3">
              Respostas por pergunta
            </div>
            <div className="space-y-2">
              {section.questions.map((q, i) => {
                const val = selectedVersion.answers[q.id];
                const label = val && q.anchors?.[val - 1] ? q.anchors[val - 1] : "-";
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2"
                  >
                    <div className="text-sm text-[var(--color-muted-foreground)]">
                      {i + 1}. {q.text}
                    </div>
                    <div className="text-sm font-medium text-[var(--color-primary)] mt-1">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedVersion.notes && (
          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <div className="text-sm font-medium mb-2">Notas registradas</div>
            <div className="text-sm text-[var(--color-muted-foreground)] bg-[var(--color-muted)] rounded-lg p-3">
              {selectedVersion.notes}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-[var(--color-muted-foreground)]">
          Preenchido por {selectedVersion.user_email} em{" "}
          {new Date(selectedVersion.submitted_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-10 print-page-break">
        <h2 className="text-xl font-semibold mb-6">
          Recomendações para {section.title}
        </h2>

        <div className="space-y-4">
          {section.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--color-border)] p-5"
            >
              <div className="font-semibold text-lg">{rec.title}</div>
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
                  {/* Print version - shows URLs as text */}
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

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between no-print">
        <Link
          href="/assessment"
          className="text-sm text-[var(--color-muted-foreground)] hover:underline"
        >
          ← Voltar ao menu
        </Link>

        <div className="flex items-center gap-3">
          {nextSession && (
            <Link
              href={`/assessment/${nextSession.key}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
            >
              Próxima seção: {nextSession.title}
              <ArrowRight size={16} />
            </Link>
          )}

          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <FileText size={16} />
            Ver Relatório
          </Link>
        </div>
      </div>
    </div>
  );
}
