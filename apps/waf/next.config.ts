import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Atlas multi-zone: mounted under /waf by apps/web rewrites.
  basePath: "/waf",
  assetPrefix: "/waf",
  output: "standalone",
  transpilePackages: ["@atlas/tour"],
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["exceljs", "pdfkit", "pg"],
};

export default withNextIntl(nextConfig);
