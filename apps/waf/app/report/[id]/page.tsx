"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMessages } from "next-intl";
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  Activity,
  Gauge,
  PiggyBank,
  Plug,
  Scale,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { useL10n } from "@/i18n/format";
import type {
  WafAssessmentDetail,
  WafControl,
  WafPillar,
} from "@/lib/engines/waf-assessment/types";
import { getCrossReference } from "@/lib/engines/waf-assessment/cross-references";

/**
 * Dedicated WAF assessment report view.
 *
 * Renders a print-first technical report (cover, executive summary,
 * per-pillar sections, action plan) that can be saved as PDF via
 * window.print() — landscape A4 with @page rules in globals.css.
 *
 * Route: /waf/report/[id]?print=1 (auto-opens the print dialog after load)
 */

const PILLAR_ORDER: WafPillar[] = [
  "governance",
  "interoperability_usability",
  "operational_excellence",
  "security_compliance_privacy",
  "reliability",
  "performance_efficiency",
  "cost_optimisation",
];

/**
 * Hardcoded PT-BR labels — this report is a customer-facing deliverable
 * that should always render in Portuguese, regardless of the user's UI
 * locale. The Atlas UI follows i18n; the report does not.
 */
const PILLAR_NAME_PT: Record<WafPillar, string> = {
  governance: "Governança de Dados e IA",
  interoperability_usability: "Interoperabilidade e Usabilidade",
  operational_excellence: "Excelência Operacional",
  security_compliance_privacy: "Segurança, Compliance e Privacidade",
  reliability: "Confiabilidade",
  performance_efficiency: "Eficiência de Performance",
  cost_optimisation: "Otimização de Custo",
};

const PILLAR_SHORT_PT: Record<WafPillar, string> = {
  governance: "Governança",
  interoperability_usability: "Interop. & Usab.",
  operational_excellence: "Exc. Operacional",
  security_compliance_privacy: "Segurança",
  reliability: "Confiabilidade",
  performance_efficiency: "Performance",
  cost_optimisation: "Custo",
};

const STATUS_LABEL_PT: Record<StatusKey, string> = {
  mature: "Maduro",
  progressing: "Em progresso",
  at_risk: "Em risco",
  critical: "Crítico",
  none: "—",
};

const PILLAR_ICON: Record<WafPillar, LucideIcon> = {
  governance: Scale,
  interoperability_usability: Plug,
  operational_excellence: Workflow,
  security_compliance_privacy: ShieldCheck,
  reliability: Activity,
  performance_efficiency: Gauge,
  cost_optimisation: PiggyBank,
};

function pillarScore(detail: WafAssessmentDetail, p: WafPillar): number | null {
  switch (p) {
    case "governance":
      return detail.governanceScore;
    case "interoperability_usability":
      return detail.iuScore;
    case "operational_excellence":
      return detail.oeScore;
    case "security_compliance_privacy":
      return detail.scpScore;
    case "reliability":
      return detail.reliabilityScore;
    case "performance_efficiency":
      return detail.performanceScore;
    case "cost_optimisation":
      return detail.costScore;
  }
}

type StatusKey = "mature" | "progressing" | "at_risk" | "critical" | "none";

function statusKey(score: number | null | undefined): StatusKey {
  if (score == null) return "none";
  if (score >= 75) return "mature";
  if (score >= 50) return "progressing";
  if (score >= 25) return "at_risk";
  return "critical";
}

function statusStyle(key: StatusKey): { bar: string; chip: string; text: string } {
  switch (key) {
    case "mature":
      return {
        bar: "bg-emerald-500",
        chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        text: "text-emerald-700",
      };
    case "progressing":
      return {
        bar: "bg-amber-500",
        chip: "bg-amber-50 text-amber-800 border border-amber-200",
        text: "text-amber-700",
      };
    case "at_risk":
      return {
        bar: "bg-orange-500",
        chip: "bg-orange-50 text-orange-800 border border-orange-200",
        text: "text-orange-700",
      };
    case "critical":
      return {
        bar: "bg-rose-500",
        chip: "bg-rose-50 text-rose-700 border border-rose-200",
        text: "text-rose-700",
      };
    case "none":
      return {
        bar: "bg-slate-400",
        chip: "bg-slate-50 text-slate-600 border border-slate-200",
        text: "text-slate-600",
      };
  }
}

function useControlText() {
  const messages = useMessages() as {
    assessment?: { controls?: Record<string, { best_practice?: string; principle?: string }> };
  };
  return useCallback(
    (wafId: string, fallback: { bestPractice: string; principle: string }) => {
      const entry = messages?.assessment?.controls?.[wafId];
      return {
        bestPractice: entry?.best_practice ?? fallback.bestPractice,
        principle: entry?.principle ?? fallback.principle,
      };
    },
    [messages],
  );
}

export default function WafReportPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const autoprint = search.get("print") === "1";
  // Report uses hardcoded PT-BR labels (customer-facing deliverable).
  const tFullPillar = (p: WafPillar) => PILLAR_NAME_PT[p];
  const tShortPillar = (p: WafPillar) => PILLAR_SHORT_PT[p];
  const tStatus = (k: StatusKey) => STATUS_LABEL_PT[k];
  const controlText = useControlText();
  const l10n = useL10n();

  const [detail, setDetail] = useState<WafAssessmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/waf/api/${params.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load assessment (${res.status})`);
        const json = (await res.json()) as WafAssessmentDetail;
        if (!cancelled) setDetail(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (!autoprint || !detail) return;
    // Give the layout a tick to settle before opening the dialog.
    const id = setTimeout(() => window.print(), 400);
    return () => clearTimeout(id);
  }, [autoprint, detail]);

  const overallPct = useMemo(() => {
    if (!detail || detail.totalControls === 0) return 0;
    return Math.round((detail.metControls / detail.totalControls) * 100);
  }, [detail]);

  const pillarRows = useMemo(() => {
    const map = new Map<WafPillar, WafAssessmentDetail["results"]>();
    for (const p of PILLAR_ORDER) map.set(p, []);
    if (!detail) return map;
    for (const r of detail.results) {
      map.get(r.pillar)?.push(r);
    }
    return map;
  }, [detail]);

  const allFailing = useMemo(() => {
    if (!detail) return [];
    return detail.results.filter((r) => !r.thresholdMet);
  }, [detail]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Carregando relatório…</div>;
  }
  if (error || !detail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Não foi possível carregar o relatório</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Assessment não encontrado."}</p>
        </div>
      </div>
    );
  }

  const overallKey = statusKey(detail.overallScore);
  const overallStyle = statusStyle(overallKey);

  return (
    <div className="report-root mx-auto max-w-[210mm] bg-white text-slate-900">
      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-6 py-3 backdrop-blur">
        <a
          href="/waf"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o assessment
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* COVER */}
      <section className="report-page report-cover px-12 pb-10 pt-16">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
          <ShieldCheck className="h-4 w-4" /> Atlas · Field Engineering
        </div>
        <h1 className="mt-8 text-[40px] font-bold leading-[1.1] tracking-tight text-slate-900">
          Avaliação Técnica
          <br />
          Well-Architected Framework
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Relatório executivo e técnico do nível de aderência da plataforma de dados ao
          Databricks Well-Architected Framework (WAF). Consolida os resultados das consultas
          determinísticas executadas contra as tabelas de sistema (system.*) e dos controles
          qualitativos respondidos pela equipe.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-5">
          <KeyValue label="Cliente / Escopo" value={detail.scope || "Workspace inteiro"} />
          <KeyValue label="Responsável" value={detail.ownerEmail || "—"} />
          <KeyValue
            label="Data da avaliação"
            value={l10n.dateTime(detail.completedAt ?? detail.createdAt)}
          />
          <KeyValue label="Status" value={detail.status === "completed" ? "Concluído" : detail.status} />
        </div>

        <div className={`mt-8 relative overflow-hidden rounded-2xl border-2 ${overallStyle.chip}`}>
          <div className={`absolute inset-x-0 top-0 h-1.5 ${overallStyle.bar}`} />
          <div className="grid grid-cols-3 gap-6 px-6 py-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Score global
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tabular-nums text-slate-900">
                  {detail.overallScore == null ? "—" : l10n.number(detail.overallScore)}
                </span>
                <span className="text-base text-slate-500">/100</span>
              </div>
              <div className={`mt-0.5 text-sm font-semibold ${overallStyle.text}`}>
                {tStatus(overallKey)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Controles atendidos
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tabular-nums text-slate-900">
                  {detail.metControls}
                </span>
                <span className="text-base text-slate-500">/{detail.totalControls}</span>
              </div>
              <div className="mt-0.5 text-sm text-slate-600">{overallPct}% do catálogo</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Pilares avaliados
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tabular-nums text-slate-900">7</span>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-600">
                Governança, IU, Op. Excellence, Sec/Compl., Reliability, Performance e Custo
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-[10px] text-slate-500">
          Documento gerado automaticamente pelo Atlas WAF — Databricks Brazil Field Engineering.
          Distribuição interna ao cliente e ao arquiteto Databricks designado.
        </div>
      </section>

      {/* EXECUTIVE SUMMARY */}
      <section className="report-page px-12 py-12">
        <SectionTitle eyebrow="1." title="Sumário executivo" />
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Visão consolidada do desempenho da plataforma frente aos sete pilares do
          Well-Architected Framework. Cada pilar é avaliado por um conjunto de controles
          automáticos (consultas SQL sobre as tabelas de sistema) e/ou controles qualitativos
          respondidos pelo time. Um controle é considerado atendido quando o seu score atinge ou
          supera o threshold do catálogo Databricks.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {PILLAR_ORDER.map((p) => {
            const score = pillarScore(detail, p);
            const rows = pillarRows.get(p) ?? [];
            const met = rows.filter((r) => r.thresholdMet).length;
            const total = rows.length;
            const sk = statusKey(score);
            const st = statusStyle(sk);
            const Icon = PILLAR_ICON[p];
            const pct = score ?? 0;
            return (
              <div
                key={p}
                className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 ${st.bar}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {tFullPillar(p)}
                  </div>
                  <Icon className={`h-4 w-4 shrink-0 ${st.text}`} />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-slate-900">
                    {score == null ? "—" : l10n.number(score)}
                  </span>
                  <span className="text-xs text-slate-500">/100</span>
                  <span className="ml-auto text-xs text-slate-500">
                    {met}/{total} controles
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${st.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <div className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.chip}`}>
                  {tStatus(sk)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <StatBox
            title="Pontos fortes"
            description="Pilares com maturidade ≥ 75."
            items={PILLAR_ORDER.filter((p) => {
              const s = pillarScore(detail, p);
              return s != null && s >= 75;
            }).map((p) => ({
              label: tFullPillar(p),
              value: l10n.number(pillarScore(detail, p) ?? 0),
            }))}
            empty="Nenhum pilar atingiu maturidade. Recomenda-se priorizar quick wins."
          />
          <StatBox
            title="Pontos de atenção"
            description="Pilares abaixo de 50 — requerem plano de ação."
            items={PILLAR_ORDER.filter((p) => {
              const s = pillarScore(detail, p);
              return s != null && s < 50;
            }).map((p) => ({
              label: tFullPillar(p),
              value: l10n.number(pillarScore(detail, p) ?? 0),
            }))}
            empty="Todos os pilares estão acima do limite crítico."
          />
        </div>
      </section>

      {/* PER-PILLAR DETAIL */}
      {PILLAR_ORDER.map((p) => {
        const rows = pillarRows.get(p) ?? [];
        if (rows.length === 0) return null;
        const score = pillarScore(detail, p);
        const sk = statusKey(score);
        const st = statusStyle(sk);
        const Icon = PILLAR_ICON[p];
        const met = rows.filter((r) => r.thresholdMet).length;
        return (
          <section key={p} className="report-page report-page-landscape px-12 py-12">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <Icon className={`h-4 w-4 ${st.text}`} /> Pilar
                </div>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  {tFullPillar(p)}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold tabular-nums text-slate-900">
                  {score == null ? "—" : l10n.number(score)}
                  <span className="ml-1 text-base text-slate-500">/100</span>
                </div>
                <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.chip}`}>
                  {tStatus(sk)} · {met}/{rows.length} atendidos
                </div>
              </div>
            </div>

            <table
              className="report-table mt-6 w-full border-collapse text-xs"
              style={{ tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: "9%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "33%" }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-2 font-semibold">WAF ID</th>
                  <th className="py-2 pr-2 font-semibold">Best practice</th>
                  <th className="py-2 pr-2 text-right font-semibold">Score</th>
                  <th className="py-2 pr-2 text-right font-semibold">Limite</th>
                  <th className="py-2 pr-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Recomendação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ct = controlText(r.wafId, {
                    bestPractice: r.control.bestPractice,
                    principle: r.control.principle,
                  });
                  const rowOk = r.thresholdMet;
                  return (
                    <tr
                      key={r.wafId}
                      className="border-b border-slate-100 align-top last:border-0"
                    >
                      <td className="py-2 pr-2 font-mono text-[11px] text-slate-600">
                        {r.wafId}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="font-medium text-slate-900">{ct.bestPractice}</div>
                        <div className="text-[11px] text-slate-500">{ct.principle}</div>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {l10n.number(r.scorePercentage)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-slate-500">
                        {r.thresholdPercentage}
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            rowOk
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {rowOk ? "Atendido" : "Não atendido"}
                        </span>
                      </td>
                      <td className="break-words py-2 text-[11px] leading-relaxed text-slate-600">
                        {!rowOk && r.control.recommendationIfNotMet ? (
                          <span>{r.control.recommendationIfNotMet}</span>
                        ) : rowOk ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="text-slate-400">
                            Consulte a documentação do controle.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}

      {/* ACTION PLAN */}
      {allFailing.length > 0 && (
        <section className="report-page report-page-landscape px-12 py-12">
          <SectionTitle eyebrow={`${PILLAR_ORDER.length + 2}.`} title="Plano de ação consolidado" />
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            {allFailing.length} controles não atingiram o limite mínimo. A tabela abaixo
            consolida-os, ordenados por pilar, para servir como ponto de partida do plano de
            remediação a ser discutido com o arquiteto Databricks.
          </p>
          <table
            className="report-table mt-6 w-full border-collapse text-xs"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "16%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-2 font-semibold">Pilar</th>
                <th className="py-2 pr-2 font-semibold">WAF ID</th>
                <th className="py-2 pr-2 font-semibold">Best practice</th>
                <th className="py-2 font-semibold">Recomendação</th>
              </tr>
            </thead>
            <tbody>
              {allFailing
                .sort((a, b) => {
                  const da = PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar);
                  if (da !== 0) return da;
                  return a.scorePercentage - b.scorePercentage;
                })
                .map((r) => {
                  const ct = controlText(r.wafId, {
                    bestPractice: r.control.bestPractice,
                    principle: r.control.principle,
                  });
                  return (
                    <tr key={r.wafId} className="border-b border-slate-100 align-top last:border-0">
                      <td className="py-2 pr-2 text-[11px] text-slate-600">
                        {tShortPillar(r.pillar)}
                      </td>
                      <td className="py-2 pr-2 font-mono text-[11px] text-slate-600">
                        {r.wafId}
                      </td>
                      <td className="py-2 pr-2 font-medium text-slate-900">{ct.bestPractice}</td>
                      <td className="break-words py-2 text-[11px] leading-relaxed text-slate-600">
                        {r.control.recommendationIfNotMet ?? "Consulte a documentação do controle."}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
      )}

      {/* METHODOLOGY */}
      <section className="report-page px-12 py-12">
        <SectionTitle eyebrow="Anexo" title="Metodologia" />
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700">
          <p>
            O Atlas WAF executa o catálogo público do Databricks Well-Architected Framework. Para
            cada controle automatizado, uma consulta SQL determinística é executada no workspace
            do cliente (sobre as tabelas de sistema, lakebase e demais fontes), produzindo um
            score percentual. O controle é considerado atendido quando o score ≥ threshold.
          </p>
          <p>
            Controles qualitativos não derivam de telemetria — exigem resposta manual pelo time
            responsável (sim / parcial / não / N/A). Sua pontuação compõe o score do pilar com
            mesmo peso dos controles automáticos.
          </p>
          <p>
            <strong>Escala de maturidade:</strong>
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong className="text-emerald-700">Mature (≥75):</strong> aderência forte, ajustes
              pontuais.
            </li>
            <li>
              <strong className="text-amber-700">Progressing (50–74):</strong> base sólida com
              oportunidades estruturadas de evolução.
            </li>
            <li>
              <strong className="text-orange-700">At risk (25–49):</strong> lacunas relevantes,
              priorizar plano de ação.
            </li>
            <li>
              <strong className="text-rose-700">Critical (&lt;25):</strong> risco operacional /
              compliance, exige intervenção imediata.
            </li>
          </ul>
          <p>
            <strong>Referências externas:</strong> cada controle do catálogo está mapeado para os
            equivalentes nos frameworks{" "}
            <em>AWS Well-Architected</em> e <em>Microsoft Azure Well-Architected</em> (ver coluna
            de cross-reference no Atlas).
          </p>
          {detail.results.length > 0 && (
            <CrossRefSample wafId={detail.results[0].wafId} pillar={detail.results[0].pillar} />
          )}
        </div>
      </section>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-base font-medium text-slate-900">{value}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
    </div>
  );
}

function StatBox({
  title,
  description,
  items,
  empty,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{description}</div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((it) => (
            <li
              key={it.label}
              className="flex items-baseline justify-between gap-3 text-sm text-slate-700"
            >
              <span>{it.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">{it.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CrossRefSample({ wafId, pillar }: { wafId: string; pillar: WafPillar }) {
  const refs = getCrossReference(wafId, pillar);
  return (
    <p className="text-xs text-slate-500">
      Exemplo para <span className="font-mono">{wafId}</span>: {refs.awsLabel} ·{" "}
      {refs.azureLabel}.
    </p>
  );
}
