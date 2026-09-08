import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav, MobileNav } from "@/components/pipeline/sidebar-nav";
import { HeaderPageTitle } from "@/components/header-title";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SearchBar } from "@/components/search/search-bar";
import { AskForgePanel } from "@/components/assistant/ask-forge-panel";
import { GenieBuildProvider } from "@/components/providers/genie-build-provider";
import { GenieBuildRestore } from "@/components/providers/genie-build-restore";
import { SystemLoadBanner } from "@/components/system-load-banner";
import { ArrowLeft } from "lucide-react";
import { AtlasTour } from "@atlas/tour";

const sans = localFont({
  src: [
    { path: "../public/fonts/PlusJakartaSans-latin.woff2", style: "normal", weight: "300 800" },
    {
      path: "../public/fonts/PlusJakartaSans-italic-latin.woff2",
      style: "italic",
      weight: "300 800",
    },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = localFont({
  src: [{ path: "../public/fonts/JetBrainsMono-latin.woff2", style: "normal", weight: "400 600" }],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Forge",
  description: "Discover AI-powered use cases from your Unity Catalog metadata",
  icons: {
    icon: "/databricks-icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const tA11y = await getTranslations("accessibility");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} h-screen overflow-hidden antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider>
          <TooltipProvider>
            <GenieBuildProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
              >
                {tA11y("skip_to_main")}
              </a>
              <div className="flex h-screen overflow-hidden">
                <SidebarNav />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] backdrop-blur-sm dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.15)] md:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <a
                        href="/acceleration"
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Voltar para a seção AI & Value Acceleration"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Atlas
                      </a>
                      <div className="hidden h-4 w-px bg-border md:block" />
                      <MobileNav />
                      <span className="text-sm font-bold tracking-tight md:hidden">
                        Forge
                      </span>
                      <div className="hidden flex-1 md:block">
                        <HeaderPageTitle />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <SearchBar />
                      <AskForgePanel />
                      <div className="mx-1 h-5 w-px bg-border/60 hidden sm:block" />
                      <LanguageToggle />
                      <ThemeToggle />
                    </div>
                  </header>
                  <SystemLoadBanner />
                  <main
                    id="main-content"
                    data-atlas-tour="forge-main-content"
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                  >
                    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
                  </main>
                </div>
              </div>
              <GenieBuildRestore />
              <Toaster />
              <AtlasTour />
            </GenieBuildProvider>
          </TooltipProvider>
        </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
