import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ArrowLeft, Map } from "lucide-react";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { AtlasTour } from "@atlas/tour";
import "./globals.css";

export const metadata: Metadata = {
  title: "TAP — Atlas",
  description: "AS-IS architecture mapping form",
  icons: { icon: "/atlas-logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-raised bg-surface px-4 md:px-8">
              <div className="flex items-center gap-3">
                <a
                  href="/discovery"
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Atlas
                </a>
                <div className="h-4 w-px bg-raised" />
                <div className="inline-flex items-center gap-2">
                  <Map className="h-4 w-4 text-brand" />
                  <span className="text-sm font-semibold text-foreground">
                    TAP — AS-IS Architecture
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
          <Toaster richColors position="top-right" />
          <AtlasTour />
        </ThemeProvider>
      </body>
    </html>
  );
}
