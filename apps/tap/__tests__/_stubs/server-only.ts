// Empty stub for the `server-only` package during vitest runs. The real
// package throws at import time to prevent it from being bundled into a
// client component; Next.js intercepts and no-ops it on the server side.
// Vitest has no such interceptor, so we alias the import to this file.
export {};
