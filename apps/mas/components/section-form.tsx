"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, History, Save, AlertTriangle } from "lucide-react";
import type { Session } from "@/lib/questionnaire";

type SectionAnswers = Record<string, number>;

/** Draft data stored in localStorage */
interface DraftData {
  answers: SectionAnswers;
  notes: string;
  userName: string;
  userEmail: string;
  savedAt: string;
}

/** Get localStorage key for a section draft */
function getDraftKey(sectionKey: string): string {
  return `mas-draft-${sectionKey}`;
}

interface VersionInfo {
  version: number;
  score: number;
  tier_label: string;
  submitted_at: string;
  user_email: string;
}

interface SectionFormProps {
  session: Session;
  defaultEmail: string;
  defaultName: string;
  latestVersion: VersionInfo | null;
  versionCount: number;
}

/** Shuffle array using Fisher-Yates algorithm with a seeded random for consistency */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;

  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Generate a numeric seed from a string */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function SectionForm({
  session,
  defaultEmail,
  defaultName,
  latestVersion,
  versionCount,
}: SectionFormProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState(defaultEmail);
  const [userName, setUserName] = useState(defaultName);
  const [answers, setAnswers] = useState<SectionAnswers>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const nextVersion = versionCount + 1;
  const draftKey = getDraftKey(session.key);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        setAnswers(draft.answers || {});
        setNotes(draft.notes || "");
        if (draft.userName) setUserName(draft.userName);
        if (draft.userEmail) setUserEmail(draft.userEmail);
        setHasDraft(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [draftKey]);

  const canSubmit = useMemo(() => {
    if (!userEmail.includes("@")) return false;
    return session.questions.every((q) => typeof answers[q.id] === "number");
  }, [userEmail, answers, session.questions]);

  const answeredCount = useMemo(() => {
    return session.questions.filter((q) => typeof answers[q.id] === "number").length;
  }, [answers, session.questions]);

  const canSaveDraft = useMemo(() => {
    return answeredCount > 0 || notes.trim().length > 0;
  }, [answeredCount, notes]);

  function setAnswer(questionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
    setDraftSaved(false);
  }

  const handleSaveDraft = useCallback(() => {
    try {
      const draft: DraftData = {
        answers,
        notes,
        userName,
        userEmail,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setDraftSaved(true);
      setHasDraft(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch {
      // Ignore localStorage errors
    }
  }, [answers, notes, userName, userEmail, draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    } catch {
      // Ignore localStorage errors
    }
  }, [draftKey]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/maturity/api/sections/${session.key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_email: userEmail,
            user_name: userName || null,
            answers,
            notes: notes || null,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Clear draft after successful submission
      clearDraft();

      // Redirect to section results
      router.push(`/assessment/${session.key}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  function handleSubmitClick() {
    setShowConfirmModal(true);
  }

  function handleConfirmSubmit() {
    setShowConfirmModal(false);
    handleSubmit();
  }

  return (
    <div data-atlas-tour="maturity-form" className="max-w-3xl mx-auto px-6 py-8">
      {/* Version info banner */}
      {latestVersion && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <History size={20} className="text-blue-600 shrink-0" />
              <div>
                <div className="font-medium text-blue-800">
                  Versão atual: v{latestVersion.version} ({latestVersion.score.toFixed(1)} - {latestVersion.tier_label})
                </div>
                <div className="text-sm text-blue-700">
                  Preenchida por {latestVersion.user_email} em{" "}
                  {new Date(latestVersion.submitted_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
            <Link
              href={`/assessment/${session.key}/results`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shrink-0"
            >
              Ver Resultados
            </Link>
          </div>
          <div className="mt-3 text-sm text-blue-700">
            Preencha o formulário abaixo para criar a versão v{nextVersion}.
          </div>
        </div>
      )}

      {/* Draft loaded notification - at top */}
      {hasDraft && !draftSaved && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 p-4 text-sm flex items-center gap-2">
          <Save size={18} className="shrink-0" />
          <span>
            Rascunho carregado. Você tem {answeredCount} de {session.questions.length} perguntas respondidas.
          </span>
        </div>
      )}

      <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Seção {versionCount > 0 ? `(criando v${nextVersion})` : "(primeira versão)"}
      </div>
      <h1 className="text-2xl font-semibold mt-1">{session.title}</h1>
      <p className="text-[var(--color-muted-foreground)] mt-1 text-sm">
        {session.subtitle}
      </p>

      {/* Identity fields */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Seu nome</span>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Nome completo"
            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">
            Seu e-mail <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="email@empresa.com"
            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </label>
      </div>

      {/* Questions */}
      <div className="mt-8 space-y-5">
        {session.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i + 1}
            question={q}
            value={answers[q.id]}
            onChange={(score) => setAnswer(q.id, score)}
          />
        ))}

        <label className="block">
          <span className="text-sm font-medium">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações qualitativas, ressalvas, contexto…"
            rows={3}
            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </label>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 text-red-900 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Draft saved notification */}
      {draftSaved && (
        <div className="mt-6 rounded-xl border border-green-300 bg-green-50 text-green-800 p-4 text-sm flex items-center gap-2">
          <Check size={18} />
          Rascunho salvo com sucesso!
        </div>
      )}

      <div data-atlas-tour="maturity-form-actions" className="mt-8 flex justify-end gap-3">
        {/* Save Draft Button */}
        <button
          onClick={handleSaveDraft}
          disabled={!canSaveDraft || submitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] font-medium hover:bg-[var(--color-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Save size={18} />
          Salvar rascunho
        </button>

        {/* Submit Button */}
        <button
          onClick={handleSubmitClick}
          disabled={!canSubmit || submitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting
            ? "Enviando…"
            : versionCount > 0
              ? `Criar versão v${nextVersion}`
              : "Enviar seção"}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--color-background)] rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Confirmar envio
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {versionCount > 0
                    ? `Tem certeza que deseja criar a versão v${nextVersion} desta seção?`
                    : "Tem certeza que deseja enviar esta seção?"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Após o envio, você poderá criar novas versões, mas não editar versões anteriores.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] font-medium hover:bg-[var(--color-muted)] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium hover:opacity-90 transition"
              >
                Confirmar envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ShuffledAnchor {
  originalIndex: number;
  score: 1 | 2 | 3 | 4 | 5;
  anchor: string;
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: Session["questions"][number];
  value: number | undefined;
  onChange: (score: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const shuffledAnchors = useMemo(() => {
    const anchorsWithScores: ShuffledAnchor[] = question.anchors.map(
      (anchor, idx) => ({
        originalIndex: idx,
        score: (idx + 1) as 1 | 2 | 3 | 4 | 5,
        anchor,
      }),
    );
    return shuffleWithSeed(anchorsWithScores, stringToSeed(question.id));
  }, [question.id, question.anchors]);

  return (
    <fieldset className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition">
      <legend className="px-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Pergunta {index}
        </span>
      </legend>
      <p className="mt-1 text-base font-medium leading-snug text-[var(--color-card-foreground)]">
        {question.text}
      </p>

      <div className="mt-4 space-y-2" role="radiogroup">
        {shuffledAnchors.map((item, displayIdx) => {
          const selected = value === item.score;
          return (
            <button
              key={displayIdx}
              type="button"
              onClick={() => onChange(item.score)}
              role="radio"
              aria-checked={selected}
              className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]/40 hover:bg-[var(--color-muted)]"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  selected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                    : "border-[var(--color-border)] group-hover:border-[var(--color-muted-foreground)]/60"
                }`}
              >
                {selected && (
                  <Check size={12} strokeWidth={3} className="text-white" />
                )}
              </span>
              <span className="flex-1 text-sm leading-snug text-[var(--color-card-foreground)]">
                {item.anchor}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
