import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Atlas multi-zone: mounted under /tap by apps/web rewrites.
  basePath: "/tap",
  assetPrefix: "/tap",
  output: "standalone",
  transpilePackages: ["@atlas/tour"],
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@databricks/sql"],
};

export default nextConfig;
