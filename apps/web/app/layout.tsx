import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AtlasTour } from "@atlas/tour";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Customer mapping suite for Databricks Field Engineering",
  icons: { icon: "/atlas-logo.svg" },
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
          {children}
          <AtlasTour />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
