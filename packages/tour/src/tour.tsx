"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ATLAS_TOUR_JOURNEYS, getAtlasTourJourney, type AtlasTourStep } from "./journeys";

const STORAGE_JOURNEY = "atlas_guided_tour_journey";
const STORAGE_STEP = "atlas_guided_tour_step";
const TRANSFER_JOURNEY = "atlas_tour";
const TRANSFER_STEP = "atlas_step";
const OPEN_GUIDE = "atlas_guide";
const ROUTE_CHANGE_EVENT = "atlas-tour-route-change";
const KEY_MESSAGE = "atlas-tour:key";
const ACCENT = "#ff3621";
const TOOLTIP_WIDTH = 390;
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type TourTarget = {
  element: HTMLElement;
  frame: HTMLIFrameElement | null;
};

function sameOriginTourFrames() {
  return Array.from(
    document.querySelectorAll<HTMLIFrameElement>("iframe[data-atlas-tour-frame]"),
  ).filter((frame) => {
    try {
      return Boolean(frame.contentDocument);
    } catch {
      return false;
    }
  });
}

function isVisibleTourElement(element: HTMLElement) {
  if (!element.isConnected || element.getClientRects().length === 0) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display !== "none" && style?.visibility !== "hidden" && style?.opacity !== "0";
}

function findVisibleTourElement(root: ParentNode, selector: string) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).find(isVisibleTourElement) ?? null;
}

function findTourTarget(selector: string): TourTarget | null {
  const localElement = findVisibleTourElement(document, selector);
  if (localElement) return { element: localElement, frame: null };

  for (const frame of sameOriginTourFrames()) {
    if (!isVisibleTourElement(frame)) continue;
    const framedElement = frame.contentDocument
      ? findVisibleTourElement(frame.contentDocument, selector)
      : null;
    if (framedElement) return { element: framedElement, frame };
  }
  return null;
}

function tourTargetRect(target: TourTarget) {
  const rect = target.element.getBoundingClientRect();
  if (!target.frame) return rect;
  const frameRect = target.frame.getBoundingClientRect();
  return new DOMRect(frameRect.left + rect.left, frameRect.top + rect.top, rect.width, rect.height);
}

function scrollTourTargetIntoView(target: TourTarget) {
  target.frame?.scrollIntoView({ block: "nearest", inline: "nearest" });
  target.element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

function readStoredTour(): { journeyId: string; step: number } | null {
  const journeyId = sessionStorage.getItem(STORAGE_JOURNEY);
  const rawStep = sessionStorage.getItem(STORAGE_STEP);
  const journey = journeyId ? getAtlasTourJourney(journeyId) : undefined;
  const step = rawStep === null ? Number.NaN : Number(rawStep);
  if (!journey || !Number.isInteger(step) || step < 0 || step >= journey.steps.length) {
    return null;
  }
  return { journeyId: journey.id, step };
}

function cleanGuideParams() {
  const url = new URL(window.location.href);
  const hadGuideParams =
    url.searchParams.has(TRANSFER_JOURNEY) ||
    url.searchParams.has(TRANSFER_STEP) ||
    url.searchParams.has(OPEN_GUIDE);
  if (!hadGuideParams) return;
  url.searchParams.delete(TRANSFER_JOURNEY);
  url.searchParams.delete(TRANSFER_STEP);
  url.searchParams.delete(OPEN_GUIDE);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function routeMatches(expected: URL) {
  if (window.location.pathname !== expected.pathname) return false;
  const currentParams = new URLSearchParams(window.location.search);
  for (const [key, value] of expected.searchParams) {
    if (currentParams.get(key) !== value) return false;
  }
  return true;
}

function navigateToRoute(route: string, journeyId: string, step: number) {
  const expected = new URL(route, window.location.origin);
  if (routeMatches(expected)) {
    if (window.location.hash !== expected.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}${expected.hash}`,
      );
      window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
    }
    return false;
  }

  expected.searchParams.set(TRANSFER_JOURNEY, journeyId);
  expected.searchParams.set(TRANSFER_STEP, String(step));
  window.location.assign(`${expected.pathname}${expected.search}${expected.hash}`);
  return true;
}

export function AtlasTour() {
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [tooltipHeight, setTooltipHeight] = useState(300);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const journey = useMemo(
    () => (journeyId ? getAtlasTourJourney(journeyId) : undefined),
    [journeyId],
  );
  const step = journey?.steps[stepIndex] ?? null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transferredJourney = params.get(TRANSFER_JOURNEY);
    const transferredStep = Number(params.get(TRANSFER_STEP));
    const transferred = transferredJourney ? getAtlasTourJourney(transferredJourney) : undefined;

    if (
      transferred &&
      Number.isInteger(transferredStep) &&
      transferredStep >= 0 &&
      transferredStep < transferred.steps.length
    ) {
      sessionStorage.setItem(STORAGE_JOURNEY, transferredJourney!);
      sessionStorage.setItem(STORAGE_STEP, String(transferredStep));
      setJourneyId(transferredJourney);
      setStepIndex(transferredStep);
    } else {
      const stored = readStoredTour();
      if (stored) {
        setJourneyId(stored.journeyId);
        setStepIndex(stored.step);
      }
    }

    if (params.get(OPEN_GUIDE) === "1") setSelectorOpen(true);
    cleanGuideParams();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.shiftKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setSelectorOpen(true);
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data?.type === KEY_MESSAGE &&
        event.data.shiftKey === true &&
        String(event.data.key).toLowerCase() === "g"
      ) {
        setSelectorOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const closeTour = useCallback(() => {
    sessionStorage.removeItem(STORAGE_JOURNEY);
    sessionStorage.removeItem(STORAGE_STEP);
    setJourneyId(null);
    setStepIndex(0);
    setTargetRect(null);
    setTargetMissing(false);
  }, []);

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (!journey || nextIndex < 0 || nextIndex >= journey.steps.length) return;
      sessionStorage.setItem(STORAGE_JOURNEY, journey.id);
      sessionStorage.setItem(STORAGE_STEP, String(nextIndex));
      setStepIndex(nextIndex);
      setTargetRect(null);
      setTargetMissing(false);
      navigateToRoute(journey.steps[nextIndex].route, journey.id, nextIndex);
    },
    [journey],
  );

  const startJourney = useCallback((selectedJourneyId: string) => {
    const selected = getAtlasTourJourney(selectedJourneyId);
    if (!selected) return;
    sessionStorage.setItem(STORAGE_JOURNEY, selected.id);
    sessionStorage.setItem(STORAGE_STEP, "0");
    setSelectorOpen(false);
    setJourneyId(selected.id);
    setStepIndex(0);
    setTargetRect(null);
    setTargetMissing(false);
    navigateToRoute(selected.steps[0].route, selected.id, 0);
  }, []);

  useEffect(() => {
    if (!step) return;
    setTargetRect(null);
    setTargetMissing(false);
    if (!step.target) return;

    let cancelled = false;
    let attempts = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const selector = `[data-atlas-tour="${step.target}"]`;

    const findTarget = () => {
      if (cancelled) return;
      const target = findTourTarget(selector);
      if (!target) {
        attempts += 1;
        if (attempts <= 30) {
          window.setTimeout(findTarget, 200);
        } else {
          setTargetMissing(true);
        }
        return;
      }

      scrollTourTargetIntoView(target);
      settleTimer = setTimeout(() => {
        if (!cancelled) setTargetRect(tourTargetRect(target));
      }, 360);
    };

    const firstTimer = window.setTimeout(findTarget, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(firstTimer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [step]);

  useEffect(() => {
    if (!step?.target || !targetRect) return;
    const selector = `[data-atlas-tour="${step.target}"]`;
    const updateRect = () => {
      const target = findTourTarget(selector);
      if (target) {
        setTargetMissing(false);
        setTargetRect(tourTargetRect(target));
      } else {
        setTargetRect(null);
        setTargetMissing(true);
      }
    };
    const frames = sameOriginTourFrames();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    frames.forEach((frame) => frame.contentWindow?.addEventListener("scroll", updateRect, true));
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      frames.forEach((frame) =>
        frame.contentWindow?.removeEventListener("scroll", updateRect, true),
      );
    };
  }, [step, targetRect]);

  useEffect(() => {
    if (!journey || selectorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowRight" && stepIndex < journey.steps.length - 1) {
        event.preventDefault();
        goToStep(stepIndex + 1);
      }
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        goToStep(stepIndex - 1);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeTour();
      }
    };
    const frames = sameOriginTourFrames();
    window.addEventListener("keydown", onKeyDown);
    frames.forEach((frame) => frame.contentWindow?.addEventListener("keydown", onKeyDown));
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      frames.forEach((frame) => frame.contentWindow?.removeEventListener("keydown", onKeyDown));
    };
  }, [closeTour, goToStep, journey, selectorOpen, stepIndex]);

  useEffect(() => {
    if (!journey) return;
    const height = tooltipRef.current?.getBoundingClientRect().height;
    if (height) setTooltipHeight(height);
  }, [journey, stepIndex, targetRect, targetMissing]);

  const finishTour = useCallback(() => {
    if (journey) localStorage.setItem(`atlas_guided_tour_completed_${journey.id}`, "true");
    closeTour();
  }, [closeTour, journey]);

  return (
    <>
      {!journey && (
        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          style={floatingButtonStyle}
          data-atlas-tour-trigger
          aria-label="Abrir Guia Atlas"
          title="Guia Atlas (Shift+G)"
        >
          <CompassIcon />
          <span>Guia Atlas</span>
        </button>
      )}

      {selectorOpen && (
        <JourneySelector
          activeJourneyId={journey?.id ?? null}
          onClose={() => setSelectorOpen(false)}
          onSelect={startJourney}
        />
      )}

      {journey && step && (
        <TourStepOverlay
          journeyTitle={journey.title}
          step={step}
          stepIndex={stepIndex}
          stepCount={journey.steps.length}
          targetRect={targetRect}
          targetMissing={targetMissing}
          tooltipHeight={tooltipHeight}
          tooltipRef={tooltipRef}
          onBack={() => goToStep(stepIndex - 1)}
          onNext={() => goToStep(stepIndex + 1)}
          onFinish={finishTour}
          onClose={closeTour}
          onChooseJourney={() => setSelectorOpen(true)}
        />
      )}
    </>
  );
}

function JourneySelector({
  activeJourneyId,
  onClose,
  onSelect,
}: {
  activeJourneyId: string | null;
  onClose: () => void;
  onSelect: (journeyId: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (previouslyFocused?.isConnected && previouslyFocused !== document.body) {
        previouslyFocused.focus();
        return;
      }
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[data-atlas-tour-trigger]")?.focus();
      });
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div style={selectorBackdropStyle}>
      <div
        ref={dialogRef}
        style={selectorPanelStyle}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atlas-tour-selector-title"
        aria-describedby="atlas-tour-selector-description"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={eyebrowStyle}>GUIA INTERATIVO</div>
            <h2
              id="atlas-tour-selector-title"
              style={{ margin: "5px 0 0", fontSize: 24, lineHeight: 1.2, color: "#111827" }}
            >
              O que você quer conhecer?
            </h2>
            <p
              id="atlas-tour-selector-description"
              style={{ margin: "8px 0 0", color: "#667085", fontSize: 14, lineHeight: 1.5 }}
            >
              Faça a visão geral ou aprofunde um módulo. Seu progresso continua mesmo quando a
              jornada troca de aplicação.
            </p>
          </div>
          <IconButton label="Fechar seletor" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {(["Visão geral", "Discovery", "Governança & Valor"] as const).map((group) => (
          <section key={group} style={{ marginTop: 22 }}>
            <h3
              style={{
                margin: "0 0 9px",
                color: "#667085",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              {group}
            </h3>
            <div style={journeyGridStyle}>
              {ATLAS_TOUR_JOURNEYS.filter((journey) => journey.group === group).map((journey) => (
                <button
                  key={journey.id}
                  type="button"
                  onClick={() => onSelect(journey.id)}
                  style={{
                    ...journeyCardStyle,
                    borderColor: activeJourneyId === journey.id ? ACCENT : "#e4e7ec",
                    boxShadow: activeJourneyId === journey.id ? `0 0 0 1px ${ACCENT}` : "none",
                  }}
                >
                  <span
                    style={{ display: "block", color: "#111827", fontSize: 14, fontWeight: 700 }}
                  >
                    {journey.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 5,
                      color: "#667085",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {journey.description}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 9,
                      color: ACCENT,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {journey.steps.length} passos →
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <p style={{ margin: "20px 0 0", color: "#98a2b3", fontSize: 11, textAlign: "center" }}>
          Atalho: Shift+G · O guia não altera nem envia dados.
        </p>
      </div>
    </div>
  );
}

function TourStepOverlay({
  journeyTitle,
  step,
  stepIndex,
  stepCount,
  targetRect,
  targetMissing,
  tooltipHeight,
  tooltipRef,
  onBack,
  onNext,
  onFinish,
  onClose,
  onChooseJourney,
}: {
  journeyTitle: string;
  step: AtlasTourStep;
  stepIndex: number;
  stepCount: number;
  targetRect: DOMRect | null;
  targetMissing: boolean;
  tooltipHeight: number;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onClose: () => void;
  onChooseJourney: () => void;
}) {
  const lastStep = stepIndex === stepCount - 1;
  const visibleRect = clipToViewport(targetRect);
  const tooltipStyle = positionTooltip(visibleRect, tooltipHeight);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = tooltipRef.current;
      const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? dialog)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (previouslyFocused?.isConnected && previouslyFocused !== document.body) {
        previouslyFocused.focus();
        return;
      }
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[data-atlas-tour-trigger]")?.focus();
      });
    };
  }, [tooltipRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = tooltipRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {visibleRect ? (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            zIndex: 2147483642,
            pointerEvents: "none",
            borderRadius: 12,
            top: Math.max(0, visibleRect.top - 6),
            left: Math.max(0, visibleRect.left - 6),
            width:
              Math.min(window.innerWidth, visibleRect.right + 6) -
              Math.max(0, visibleRect.left - 6),
            height:
              Math.min(window.innerHeight, visibleRect.bottom + 6) -
              Math.max(0, visibleRect.top - 6),
            boxShadow: `0 0 0 3px ${ACCENT}, 0 0 0 9999px rgba(15, 23, 42, .52)`,
            transition: "all 220ms ease",
          }}
        />
      ) : (
        <div aria-hidden="true" style={tourBackdropStyle} />
      )}

      <div
        ref={tooltipRef}
        style={{ ...tooltipPanelStyle, ...tooltipStyle }}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={`Guia Atlas — passo ${stepIndex + 1} de ${stepCount}`}
      >
        <div style={{ height: 3, borderRadius: 999, overflow: "hidden", background: "#f0f2f5" }}>
          <div
            style={{
              width: `${((stepIndex + 1) / stepCount) * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: ACCENT,
              transition: "width 180ms ease",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={eyebrowStyle}>
              {journeyTitle} · {stepIndex + 1}/{stepCount}
            </div>
            <h2 style={{ margin: "5px 0 0", color: "#111827", fontSize: 17, lineHeight: 1.3 }}>
              {step.title}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <IconButton label="Escolher outra jornada" onClick={onChooseJourney}>
              <GridIcon />
            </IconButton>
            <IconButton label="Encerrar guia" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        <div style={{ overflowY: "auto", minHeight: 0 }}>
          {targetMissing && step.target && (
            <div
              style={{
                ...hintStyle,
                marginTop: 10,
                borderColor: "#fedf89",
                background: "#fffaeb",
                color: "#7a2e0e",
              }}
            >
              Este elemento não está visível nesta tela. Você pode continuar normalmente.
            </div>
          )}
          <p style={{ margin: "10px 0 0", color: "#475467", fontSize: 13, lineHeight: 1.6 }}>
            {step.body}
          </p>
          {step.hint && (
            <div style={hintStyle}>
              <strong style={{ color: "#344054" }}>Dica: </strong>
              {step.hint}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 18,
          }}
        >
          <span style={{ color: "#98a2b3", fontSize: 10 }}>← → navega · Esc encerra</span>
          <div style={{ display: "flex", gap: 7 }}>
            {stepIndex > 0 && (
              <button type="button" onClick={onBack} style={secondaryButtonStyle}>
                Voltar
              </button>
            )}
            <button type="button" onClick={lastStep ? onFinish : onNext} style={primaryButtonStyle}>
              {lastStep ? "Concluir" : "Próximo"}
              {!lastStep && <ArrowRightIcon />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

type VisibleRect = { top: number; right: number; bottom: number; left: number };

function clipToViewport(rect: DOMRect | null): VisibleRect | null {
  if (!rect) return null;
  const visible = {
    top: Math.max(rect.top, 0),
    right: Math.min(rect.right, window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight),
    left: Math.max(rect.left, 0),
  };
  if (visible.right <= visible.left || visible.bottom <= visible.top) return null;
  return visible;
}

function positionTooltip(rect: VisibleRect | null, measuredHeight: number): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(TOOLTIP_WIDTH, viewportWidth - 24);
  const height = Math.min(measuredHeight, viewportHeight - 24);
  if (!rect) {
    return {
      width,
      maxHeight: height,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const gap = 16;
  const clampX = (value: number) =>
    Math.min(Math.max(value, 12), Math.max(12, viewportWidth - width - 12));
  const clampY = (value: number) =>
    Math.min(Math.max(value, 12), Math.max(12, viewportHeight - height - 12));
  const overlap = (x: number, y: number) =>
    Math.max(0, Math.min(x + width, rect.right) - Math.max(x, rect.left)) *
    Math.max(0, Math.min(y + height, rect.bottom) - Math.max(y, rect.top));

  const candidates = [
    { x: clampX(rect.left), y: rect.bottom + gap },
    { x: clampX(rect.left), y: rect.top - height - gap },
    { x: rect.right + gap, y: clampY(rect.top) },
    { x: rect.left - width - gap, y: clampY(rect.top) },
    { x: 12, y: 12 },
    { x: viewportWidth - width - 12, y: 12 },
    { x: 12, y: viewportHeight - height - 12 },
    { x: viewportWidth - width - 12, y: viewportHeight - height - 12 },
  ];

  const best = candidates
    .map((candidate) => ({
      ...candidate,
      outside:
        candidate.x < 0 ||
        candidate.y < 0 ||
        candidate.x + width > viewportWidth ||
        candidate.y + height > viewportHeight,
      overlap: overlap(candidate.x, candidate.y),
    }))
    .sort((a, b) => Number(a.outside) - Number(b.outside) || a.overlap - b.overlap)[0];

  return { width, maxHeight: height, left: best.x, top: best.y };
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={iconButtonStyle}
    >
      {children}
    </button>
  );
}

function CompassIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m16 8-3 8-5-5 8-3Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const floatingButtonStyle: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  zIndex: 2147483600,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: 0,
  borderRadius: 999,
  padding: "10px 15px",
  background: "#111827",
  color: "#fff",
  boxShadow: "0 10px 30px rgba(15,23,42,.25)",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const selectorBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483646,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(15, 23, 42, .62)",
  backdropFilter: "blur(3px)",
};

const selectorPanelStyle: CSSProperties = {
  width: "min(820px, 100%)",
  maxHeight: "min(88vh, 850px)",
  overflowY: "auto",
  border: "1px solid #e4e7ec",
  borderRadius: 18,
  padding: "22px",
  background: "#fff",
  boxShadow: "0 30px 90px rgba(15,23,42,.35)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const journeyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const journeyCardStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #e4e7ec",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
  textAlign: "left",
  fontFamily: "inherit",
  cursor: "pointer",
};

const eyebrowStyle: CSSProperties = {
  color: ACCENT,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".09em",
  textTransform: "uppercase",
};

const tourBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483642,
  pointerEvents: "none",
  background: "rgba(15, 23, 42, .52)",
};

const tooltipPanelStyle: CSSProperties = {
  position: "fixed",
  zIndex: 2147483644,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid #e4e7ec",
  borderRadius: 15,
  padding: 16,
  background: "#fff",
  boxShadow: "0 24px 70px rgba(15,23,42,.32)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const hintStyle: CSSProperties = {
  marginTop: 12,
  border: "1px solid #d0d5dd",
  borderRadius: 9,
  padding: "9px 10px",
  background: "#f9fafb",
  color: "#667085",
  fontSize: 11,
  lineHeight: 1.5,
};

const iconButtonStyle: CSSProperties = {
  display: "inline-flex",
  width: 30,
  height: 30,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "1px solid transparent",
  borderRadius: 8,
  background: "transparent",
  color: "#667085",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #d0d5dd",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#fff",
  color: "#344054",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: 0,
  borderRadius: 8,
  padding: "8px 13px",
  background: ACCENT,
  color: "#fff",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};
