import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const forgeBasePath = "/forge";

const nextConfig: NextConfig = {
  // Atlas multi-zone: mounted under /forge by apps/web rewrites.
  basePath: forgeBasePath,
  assetPrefix: forgeBasePath,
  env: {
    NEXT_PUBLIC_FORGE_BASE_PATH: forgeBasePath,
  },
  output: "standalone",
  transpilePackages: ["@atlas/tour"],
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["exceljs", "pptxgenjs", "pdfkit", "pg"],
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "@radix-ui/react-icons"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-inline still required for Next.js inline scripts;
              // unsafe-eval removed (no eval() usage in the codebase)
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
