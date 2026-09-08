import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AtlasTour } from "@atlas/tour";

export const metadata: Metadata = {
  title: "WAF Assessment — Atlas",
  description: "Databricks Well-Architected Framework assessment",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <TooltipProvider>
              <div className="flex min-h-screen flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                  <div className="flex items-center gap-3">
                    <a
                      href="/inference"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Atlas
                    </a>
                    <div className="h-4 w-px bg-border" />
                    <div className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">WAF Assessment</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                  <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
                </main>
              </div>
              <Toaster />
              <AtlasTour />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
