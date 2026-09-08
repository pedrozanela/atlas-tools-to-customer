/**
 * Browser fetch helpers for the Forge sub-application.
 *
 * Next.js does not automatically apply `basePath` to requests made with the
 * browser Fetch API.  Forge is mounted below `/forge` by the Atlas shell, so
 * root-relative API requests must be rewritten before they leave the browser.
 */

const DEFAULT_FORGE_BASE_PATH = "/forge";
const API_PATH = /^\/api(?:[/?#]|$)/;

export function forgeApiUrl(url: string): string {
  if (!API_PATH.test(url)) return url;

  const basePath =
    process.env.NEXT_PUBLIC_FORGE_BASE_PATH?.replace(/\/$/, "") ?? DEFAULT_FORGE_BASE_PATH;
  return `${basePath}${url}`;
}

export function forgeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(typeof input === "string" ? forgeApiUrl(input) : input, init);
}
