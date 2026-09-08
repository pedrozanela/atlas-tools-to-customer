import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Atlas multi-zone: mounted under /maturity by apps/web rewrites.
  basePath: "/maturity",
  assetPrefix: "/maturity",
  output: "standalone",
  transpilePackages: ["@atlas/tour"],
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@databricks/sql"],
};

export default nextConfig;
