import type { Metadata } from "next";
import { ArrowLeft, Gauge } from "lucide-react";
import { AtlasTour } from "@atlas/tour";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maturity Assessment — Atlas",
  description:
    "Data & AI maturity assessment based on the Databricks Discovery Canvas.",
  icons: { icon: "/atlas-logo.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="no-print flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 md:px-8">
            <div className="flex items-center gap-3">
              <a
                href="/discovery"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Atlas
              </a>
              <div className="h-4 w-px bg-[var(--color-border)]" />
              <div className="inline-flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  MAS — Maturity Assessment
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <AtlasTour />
      </body>
    </html>
  );
}
