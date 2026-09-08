"use client";

import { sanitizeCategory } from "./utils";
import type {
  AppConfigResponse,
  GetSubmissionResponse,
  ListSubmissionsResponse,
  SubmissionDetail,
  SubmissionSummary,
  SubmitToolsRequest,
  SubmitToolsResponse,
} from "./types";

// Next.js basePath is applied to routing but NOT to client-side fetch().
// Read it from the public env (set by next.config.ts via assetPrefix) and
// prefix every API call. Empty string when running standalone.
const BASE_PATH = "/tap";

async function jsonFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const url = `${BASE_PATH}${path}`;
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set("content-type", "application/json");
  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export function getConfig(): Promise<AppConfigResponse> {
  return jsonFetch<AppConfigResponse>("/api/config");
}

export function getToolsForCategory(
  category: string,
): Promise<{ category: string; tools: string[] }> {
  const slug = encodeURIComponent(sanitizeCategory(category));
  return jsonFetch(`/api/config/tools/${slug}`);
}

export function submitTools(
  payload: SubmitToolsRequest,
): Promise<SubmitToolsResponse> {
  return jsonFetch<SubmitToolsResponse>("/api/submit/tools", {
    method: "POST",
    json: payload,
  });
}

export async function listSubmissions(): Promise<SubmissionSummary[]> {
  const res = await jsonFetch<ListSubmissionsResponse>("/api/submissions");
  return res.submissions ?? [];
}

export async function getSubmission(id: string): Promise<SubmissionDetail | null> {
  try {
    const res = await jsonFetch<GetSubmissionResponse>(
      `/api/submissions/${encodeURIComponent(id)}`,
    );
    return res.submission ?? null;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("404")) return null;
    throw e;
  }
}
