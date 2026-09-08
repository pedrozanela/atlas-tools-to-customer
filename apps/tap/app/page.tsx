"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import CloudProviderField from "@/components/shared/CloudProviderField";
import SectionBlock from "@/components/asis/SectionBlock";
import SubmittedSummary from "@/components/asis/SubmittedSummary";
import { useAppStore } from "@/lib/store";
import { getConfig, getSubmission, getToolsForCategory, submitTools } from "@/lib/api";
import type { AppConfigResponse, SubmissionDetail } from "@/lib/types";
import { CANVAS_SECTIONS, COLUMN_TITLES, MAX_ROW } from "@/lib/canvas-layout";
import CriteriaForm from "@/components/criteria/CriteriaForm";
import TapList from "@/components/list/TapList";

type View = "list" | "creating" | "viewing";
type Step = "criteria" | "asis";

function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-foreground/60">{label}</div>
  );
}

function AsIsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<AppConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cloud_provider = useAppStore((s) => s.cloud_provider);
  const tools = useAppStore((s) => s.tools);
  const criteria = useAppStore((s) => s.criteria);
  const submittedAt = useAppStore((s) => s._submittedAt);
  const markSubmitted = useAppStore((s) => s.markSubmitted);
  const startNewMapping = useAppStore((s) => s.startNewMapping);
  const resetAll = useAppStore((s) => s.resetAll);

  const [categoryTools, setCategoryTools] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  // Derived from the persisted store so a refresh after submit lands on the summary.
  const submitted = submittedAt !== null;

  // Navigation lives in the URL (not React/Zustand) so the browser Back/Forward
  // buttons traverse the flow. ?view = list | creating | viewing ; ?step =
  // criteria | asis (within "creating") ; ?id = submission id (within "viewing").
  const viewParam = searchParams.get("view") as View | null;
  const view: View = viewParam ?? (submitted ? "creating" : "list");
  const step: Step = searchParams.get("step") === "asis" ? "asis" : "criteria";
  const viewingId = searchParams.get("id");
  const tourJourney = searchParams.get("atlas_tour");

  // Push a new history entry by changing the URL query. Relative to the TAP
  // app root ("/" → /tap under basePath); Next prepends the basePath.
  const navigate = useCallback(
    (params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      router.push(qs ? `/?${qs}` : "/");
    },
    [router],
  );

  const [viewingSubmission, setViewingSubmission] = useState<SubmissionDetail | null>(null);
  const [viewingError, setViewingError] = useState<string | null>(null);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // A completed TAP remains in the local store so refreshes can show its
    // summary. Starting the detailed guided journey is an explicit request to
    // walk through a fresh mapping, so clear only that completed snapshot.
    // Saved submissions remain available in the backend list.
    if (tourJourney === "tap" && view === "creating" && submitted) {
      startNewMapping();
    }
  }, [startNewMapping, submitted, tourJourney, view]);

  useEffect(() => {
    if (!config) return;
    const categories = CANVAS_SECTIONS.map((s) => s.category);
    Promise.all(
      categories.map((cat) => getToolsForCategory(cat).then((res) => ({ cat, tools: res.tools }))),
    ).then((results) => {
      const map: Record<string, string[]> = {};
      results.forEach(({ cat, tools: t }) => {
        map[cat] = t;
      });
      setCategoryTools(map);
    });
  }, [config]);

  // Fetch the submission whenever we land on a "viewing" URL — covers opening
  // from the list AND arriving via the browser Back/Forward buttons or a refresh.
  useEffect(() => {
    if (view !== "viewing" || !viewingId) return;
    let alive = true;
    setViewingError(null);
    setViewingSubmission(null);
    getSubmission(viewingId)
      .then((sub) => {
        if (!alive) return;
        if (!sub) setViewingError("Submission not found.");
        else setViewingSubmission(sub);
      })
      .catch((e) => {
        if (alive) setViewingError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [view, viewingId]);

  async function handleSubmit() {
    if (cloud_provider.length === 0) {
      toast.error("Please select at least one cloud provider.");
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading("Saving…");
    try {
      const result = await submitTools({ cloud_provider, tools, criteria });
      if (result.ok) {
        toast.dismiss(toastId);
        markSubmitted();
      } else {
        toast.error("Save failed.", { id: toastId });
      }
    } catch (e) {
      toast.error(`Error: ${String(e)}`, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;

  if (error || !config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Couldn&apos;t load configuration</h1>
          <p className="text-foreground/60 text-sm">
            {error ?? "The server returned an empty configuration."}
          </p>
        </div>
      </div>
    );
  }

  // Read-only view of a previously saved submission.
  if (view === "viewing") {
    if (viewingError) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Couldn&apos;t open submission</h1>
          <p className="mt-2 text-sm text-foreground/60">{viewingError}</p>
          <button
            type="button"
            onClick={() => navigate({ view: "list" })}
            className="mt-6 text-sm text-brand hover:underline"
          >
            ← Back to list
          </button>
        </div>
      );
    }
    if (!viewingSubmission) return <Loading label="Loading submission…" />;
    return (
      <SubmittedSummary
        cloudProviders={viewingSubmission.cloud_provider}
        tools={viewingSubmission.tools}
        criteria={viewingSubmission.criteria}
        companyName={viewingSubmission.company_name}
        userName={viewingSubmission.user_name}
        onReset={() => navigate({ view: "list" })}
      />
    );
  }

  // Landing — list of the user's previous TAP submissions.
  if (view === "list") {
    return (
      <TapList
        userName={config.user_name}
        onNew={() => {
          startNewMapping();
          navigate({ view: "creating", step: "criteria" });
        }}
        onOpen={(id) => navigate({ view: "viewing", id })}
      />
    );
  }

  // In-progress draft: view === "creating"
  if (submitted) {
    return (
      <SubmittedSummary
        cloudProviders={cloud_provider}
        tools={tools}
        criteria={criteria}
        companyName={config.company_name}
        userName={config.user_name}
        onReset={() => {
          startNewMapping();
          navigate({ view: "list" });
        }}
      />
    );
  }

  // Step 1 — strategic criteria questionnaire
  if (step === "criteria") {
    return <CriteriaForm onNext={() => navigate({ view: "creating", step: "asis" })} />;
  }

  // Step 2 — AS-IS architecture canvas
  return (
    <div data-atlas-tour="tap-canvas" className="mx-auto max-w-[1600px] px-4 md:px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
            Step 2 of 2 · Canvas
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">AS-IS Architecture</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate({ view: "creating", step: "criteria" })}
          className="inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          ← Back to Guiding Criteria
        </button>
      </div>

      <CloudProviderField cloudProviders={config.cloud_providers} />

      <div className="mt-6">
        {/* Wide viewports: 7 cols × MAX_ROW grid, sections placed by (col, row)
            so the second/third section of every column aligns horizontally. */}
        <div
          className="hidden xl:grid gap-4"
          style={{
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gridTemplateRows: `auto repeat(${MAX_ROW}, minmax(0, 1fr))`,
          }}
        >
          {COLUMN_TITLES.map((title, i) => (
            <div
              key={title}
              className="text-[11px] font-bold tracking-widest uppercase text-foreground/50 text-center pb-1 border-b border-foreground/10"
              style={{ gridColumn: i + 1, gridRow: 1 }}
            >
              {title}
            </div>
          ))}
          {CANVAS_SECTIONS.map((s) => (
            <div key={s.category} style={{ gridColumn: s.col, gridRow: s.row + 1 }}>
              <SectionBlock
                category={s.category}
                availableTools={categoryTools[s.category] ?? []}
              />
            </div>
          ))}
        </div>

        {/* Narrower viewports: stack by column, drop horizontal row alignment. */}
        <div className="xl:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {COLUMN_TITLES.map((title, i) => {
            const col = i + 1;
            const sections = CANVAS_SECTIONS.filter((s) => s.col === col);
            return (
              <div key={title} className="flex flex-col gap-3">
                <div className="text-[11px] font-bold tracking-widest uppercase text-foreground/50 text-center pb-1 border-b border-foreground/10">
                  {title}
                </div>
                {sections.map((s) => (
                  <SectionBlock
                    key={s.category}
                    category={s.category}
                    availableTools={categoryTools[s.category] ?? []}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div
        data-atlas-tour="tap-submit"
        className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-raised"
      >
        {config.is_development ? (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        ) : (
          <span />
        )}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2 rounded-md text-sm font-semibold bg-brand hover:bg-brand-hover text-canvas shadow-[0_2px_8px_rgba(255,54,33,0.4)] disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? "Saving…" : "Submit AS-IS →"}
        </Button>
      </div>
    </div>
  );
}

export default function AsIsPage() {
  // useSearchParams() requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<Loading />}>
      <AsIsPageInner />
    </Suspense>
  );
}
