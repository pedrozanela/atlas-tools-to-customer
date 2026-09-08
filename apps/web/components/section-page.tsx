import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { getSection, type SectionKey } from "@/lib/sections";

interface SectionPageProps {
  sectionKey: SectionKey;
}

export function SectionPage({ sectionKey }: SectionPageProps) {
  const t = useTranslations("platform.landing");
  const section = getSection(sectionKey);
  const Icon = section.icon;

  return (
    <main data-atlas-tour="atlas-section" className="mx-auto flex max-w-7xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:text-[color:var(--color-foreground)]"
        >
          <Image src="/atlas-logo.svg" alt="Atlas" width={32} height={32} />
          <span className="font-semibold">Atlas</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <header className="mb-8 flex items-center gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
            {t(`sections.${sectionKey}.title`)}
          </h2>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            {t(`sections.${sectionKey}.subtitle`)}
          </h1>
        </div>
      </header>

      <div
        data-atlas-tour="atlas-section-grid"
        className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {section.items.map((item) => {
          const ItemIcon = item.icon;
          const card = (
            <ModuleCard
              icon={ItemIcon}
              title={t(`items.${item.key}.title`)}
              description={t(`items.${item.key}.description`)}
              statusLabel={
                item.planned
                  ? t("statuses.planned")
                  : item.external
                    ? t("statuses.external")
                    : undefined
              }
              disabled={item.planned}
            />
          );
          if (item.planned) {
            return (
              <div key={item.key} data-atlas-tour={`atlas-module-${item.key}`} aria-disabled="true">
                {card}
              </div>
            );
          }
          if (item.external) {
            return (
              <a
                key={item.key}
                href={item.href}
                data-atlas-tour={`atlas-module-${item.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {card}
              </a>
            );
          }
          // Cross-zone hrefs go through Next.js rewrites to another
          // standalone app. <Link> client-routes into a segment the shell
          // doesn't own and hangs; use a hard <a> to force a full load.
          if (item.crossZone) {
            return (
              <a
                key={item.key}
                href={item.href}
                data-atlas-tour={`atlas-module-${item.key}`}
                className="block"
              >
                {card}
              </a>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              data-atlas-tour={`atlas-module-${item.key}`}
              className="block"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
