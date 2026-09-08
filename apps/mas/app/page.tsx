"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { TOTAL_QUESTIONS, SESSION_COUNT } from "@/lib/questionnaire";

export default function LandingPage() {
  return (
    <section data-atlas-tour="maturity-home" className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Avaliação de maturidade Data &amp; AI
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted-foreground)]">
        Diagnóstico de maturidade em dados e IA.{" "}
        {SESSION_COUNT} dimensões, {TOTAL_QUESTIONS} perguntas, score ponderado
        e recomendações concretas.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Dimensões" value={String(SESSION_COUNT)} />
        <Stat label="Perguntas" value={String(TOTAL_QUESTIONS)} />
        <Stat label="Versionamento" value="Por seção" />
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)] p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles size={18} /> O que você recebe ao final
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted-foreground)]">
          <li>• Score geral + score por dimensão (radar)</li>
          <li>• Múltiplas versões por seção (v1, v2, v3...)</li>
          <li>• Recomendações priorizadas por dimensão</li>
          <li>• Relatório PDF com versões selecionadas</li>
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <RefreshCw size={18} /> Como funciona o versionamento
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted-foreground)]">
          <li>• Cada seção pode ter múltiplas submissões</li>
          <li>• Errou uma resposta? Crie uma nova versão</li>
          <li>• No relatório, escolha qual versão de cada seção usar</li>
          <li>• Histórico completo de todas as versões</li>
        </ul>
      </div>

      <div className="mt-10 flex gap-4">
        <Link
          href="/assessment"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-3 font-medium hover:opacity-90"
        >
          <ArrowRight size={18} />
          Iniciar Assessment
        </Link>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-6 py-3 font-medium hover:bg-[var(--color-muted)]"
        >
          Ver Relatório
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </div>
    </div>
  );
}
