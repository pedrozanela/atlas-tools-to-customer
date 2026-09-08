"use client";

import { useCallback, useEffect, useRef } from "react";

const FRAME_PATH = "/operating-model-reference/index.html";
const HASH_MESSAGE = "atlas-operating-model:hash";
const NAVIGATE_MESSAGE = "atlas-operating-model:navigate";
const TOUR_ROUTE_EVENT = "atlas-tour-route-change";

function currentHash() {
  return window.location.hash;
}

export function OperatingModelPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const syncFrameToRoute = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: NAVIGATE_MESSAGE, hash: currentHash() },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    const handleFrameMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        event.data?.type !== HASH_MESSAGE ||
        typeof event.data.hash !== "string"
      ) {
        return;
      }

      const nextHash = event.data.hash;
      // The iframe reports an empty hash on its first load. Preserve a deep
      // link from the parent until onLoad sends that route into the document.
      if (!nextHash) return;
      if (nextHash === currentHash()) return;
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}${nextHash}`,
      );
    };

    window.addEventListener("message", handleFrameMessage);
    window.addEventListener("hashchange", syncFrameToRoute);
    window.addEventListener(TOUR_ROUTE_EVENT, syncFrameToRoute);
    syncFrameToRoute();
    const retrySync = window.setTimeout(syncFrameToRoute, 250);
    return () => {
      window.clearTimeout(retrySync);
      window.removeEventListener("message", handleFrameMessage);
      window.removeEventListener("hashchange", syncFrameToRoute);
      window.removeEventListener(TOUR_ROUTE_EVENT, syncFrameToRoute);
    };
  }, [syncFrameToRoute]);

  return (
    <main className="h-[100dvh] min-h-[520px] overflow-hidden bg-[#f4f6f8]">
      <iframe
        ref={frameRef}
        src={FRAME_PATH}
        title="Modelo de Gestão da Plataforma Databricks"
        data-atlas-tour-frame="operating-model"
        onLoad={syncFrameToRoute}
        className="block h-full w-full border-0 bg-[#f4f6f8]"
      />
    </main>
  );
}
