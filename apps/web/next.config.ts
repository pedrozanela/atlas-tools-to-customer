import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("../../packages/i18n/src/request.ts");

// Multi-zone: each module / tool is a standalone Next.js app behind its own
// basePath. Local dev uses fixed ports; production overrides via env vars.
const FORGE_ORIGIN = process.env.ATLAS_FORGE_ORIGIN ?? "http://localhost:3001";
const WAF_ORIGIN = process.env.ATLAS_WAF_ORIGIN ?? "http://localhost:3002";
const TAP_ORIGIN = process.env.ATLAS_TAP_ORIGIN ?? "http://localhost:3003";
const MATURITY_ORIGIN = process.env.ATLAS_MATURITY_ORIGIN ?? "http://localhost:3004";
const PEOPLE_ORIGIN = process.env.ATLAS_PEOPLE_ORIGIN ?? "http://localhost:3005";
const MOMA_ORIGIN = process.env.ATLAS_MOMA_ORIGIN ?? "http://localhost:3006";

export function getPeopleRewrites(origin = PEOPLE_ORIGIN) {
  return [
    { source: "/people", destination: `${origin}/people` },
    { source: "/people/:path*", destination: `${origin}/people/:path*` },
  ];
}

export const atlasNextConfig: NextConfig = {
  output: "standalone",
  // People/Certifica owns API routes whose canonical paths intentionally end
  // in a slash (for example /people/api/tests/). Let the cross-zone origin
  // receive those paths unchanged instead of redirecting them to a different
  // FastAPI route before rewrites are evaluated.
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@atlas/i18n", "@atlas/tour"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    return [
      // Modules
      { source: "/forge", destination: `${FORGE_ORIGIN}/forge` },
      { source: "/forge/:path*", destination: `${FORGE_ORIGIN}/forge/:path*` },
      { source: "/waf", destination: `${WAF_ORIGIN}/waf` },
      { source: "/waf/:path*", destination: `${WAF_ORIGIN}/waf/:path*` },
      { source: "/tap", destination: `${TAP_ORIGIN}/tap` },
      { source: "/tap/:path*", destination: `${TAP_ORIGIN}/tap/:path*` },
      { source: "/maturity", destination: `${MATURITY_ORIGIN}/maturity` },
      {
        source: "/maturity/:path*",
        destination: `${MATURITY_ORIGIN}/maturity/:path*`,
      },
      // MOMA - Maturity & Operating Model Assessment (FastAPI + SPA, basePath /moma)
      { source: "/moma", destination: `${MOMA_ORIGIN}/moma` },
      { source: "/moma/:path*", destination: `${MOMA_ORIGIN}/moma/:path*` },
      // Certifica is a FastAPI + Vite zone. Keep the /people prefix intact so
      // its API, SPA routes, and base-prefixed assets share the same origin.
      ...getPeopleRewrites(),
    ];
  },
};

export default withNextIntl(atlasNextConfig);
