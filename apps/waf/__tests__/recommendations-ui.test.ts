import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  getRecommendationBatchPresentation,
  isTerminalRecommendationHttpStatus,
  recommendationRetryDelayMs,
  RecommendationsDialog,
} from "@/components/recommendations-dialog";
import type { WafRecommendationBatch } from "@/lib/engines/waf-assessment/types";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ptBr from "@/messages/pt-BR.json";

function batch(overrides: Partial<WafRecommendationBatch> = {}): WafRecommendationBatch {
  return {
    assessmentId: "assessment-1",
    status: "running",
    setupStatus: "completed",
    setupError: null,
    total: 8,
    pending: 2,
    running: 1,
    completed: 3,
    failed: 2,
    items: [],
    ...overrides,
  };
}

describe("recommendation UI state", () => {
  it("counts both completed and failed analyses as processed", () => {
    expect(getRecommendationBatchPresentation(batch())).toEqual({
      processed: 5,
      phase: "running",
    });
  });

  it.each([
    [{ status: "completed", completed: 8, failed: 0 }, "completed"],
    [{ status: "partial", completed: 6, failed: 2 }, "partial"],
    [{ status: "failed", completed: 0, failed: 8 }, "failed"],
    [{ status: "not_started", setupStatus: "not_started" }, "not_started"],
    [{ status: "not_started", setupStatus: "running" }, "running"],
    [
      {
        status: "not_started",
        setupStatus: "failed",
        setupError: "Agent provisioning failed",
      },
      "failed",
    ],
  ] as const)("maps batch state %o to the %s presentation", (overrides, phase) => {
    expect(
      getRecommendationBatchPresentation(batch(overrides as Partial<WafRecommendationBatch>)).phase,
    ).toBe(phase);
  });

  it("treats HTTP 401 through 404 as terminal and other failures as retryable", () => {
    for (const status of [401, 402, 403, 404]) {
      expect(isTerminalRecommendationHttpStatus(status)).toBe(true);
    }
    for (const status of [400, 405, 429, 500, 503]) {
      expect(isTerminalRecommendationHttpStatus(status)).toBe(false);
    }
  });

  it("uses bounded exponential retry delays", () => {
    expect(recommendationRetryDelayMs(1)).toBe(2_000);
    expect(recommendationRetryDelayMs(2)).toBe(4_000);
    expect(recommendationRetryDelayMs(3)).toBe(8_000);
    expect(recommendationRetryDelayMs(4)).toBe(15_000);
    expect(recommendationRetryDelayMs(99)).toBe(15_000);
  });

  it("keeps the new accessibility and error-state messages in every locale", () => {
    const locales = [en, ptBr, es];
    for (const messages of locales) {
      expect(messages.assessment.page.open_pdf_title).toBeTruthy();
      expect(messages.assessment.recommendations).toMatchObject({
        batch_partial: expect.any(String),
        batch_failed: expect.any(String),
        refresh_failed: expect.any(String),
        retry: expect.any(String),
        setup_failed: expect.any(String),
        setup_retry_hint: expect.any(String),
        terminal_error: expect.any(String),
      });
    }
  });

  it("announces a partial batch and uses processed = completed + failed", () => {
    const html = renderToStaticMarkup(
      createElement(NextIntlClientProvider, {
        locale: "en",
        messages: en,
        children: createElement(RecommendationsDialog, {
          open: true,
          batch: batch({ status: "partial", completed: 5, failed: 3 }),
          loadState: { kind: "ready" },
          selectedWafId: null,
          genieUrl: null,
          onClose: () => undefined,
          onRetry: () => undefined,
        }),
      }),
    );

    expect(html).toContain("8 of 8 analyses processed");
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("5 of 8 analyses completed; 3 failed.");
  });

  it("renders a durable setup failure instead of the generic empty state", () => {
    const html = renderToStaticMarkup(
      createElement(NextIntlClientProvider, {
        locale: "en",
        messages: en,
        children: createElement(RecommendationsDialog, {
          open: true,
          batch: batch({
            status: "failed",
            setupStatus: "failed",
            setupError: "Agent provisioning failed",
            total: 0,
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
          }),
          loadState: { kind: "ready" },
          selectedWafId: null,
          genieUrl: null,
          onClose: () => undefined,
          onRetry: () => undefined,
        }),
      }),
    );

    expect(html).toContain("Genie Agent setup failed");
    expect(html).toContain("Agent provisioning failed");
    expect(html).toContain("No analyses were started");
    expect(html).not.toContain("No recommendations are available");
  });
});
