import Image from "next/image";
import { useTranslations } from "next-intl";
import { CategoryCard } from "@/components/category-card";
import { SECTIONS } from "@/lib/sections";

export default function LandingPage() {
  const t = useTranslations("platform.landing");

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-8">
      <div data-atlas-tour="atlas-home-header" className="mb-10 flex min-w-0 items-center gap-4">
        <Image
          src="/atlas-logo.svg"
          alt="Atlas"
          width={64}
          height={64}
          className="shrink-0"
          priority
        />
        <div className="min-w-0">
          <h1 className="text-4xl font-bold tracking-tight leading-none">Atlas</h1>
          <p className="mt-1.5 break-words text-base text-[color:var(--color-muted-foreground)]">
            {t("tagline")}
          </p>
        </div>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.key} data-atlas-tour={`atlas-${section.key}`} className="min-w-0">
            <CategoryCard
              icon={section.icon}
              title={t(`sections.${section.key}.title`)}
              subtitle={t(`sections.${section.key}.subtitle`)}
              href={section.href}
              actionLabel={t("actions.explore")}
              items={section.items.map((it) => ({
                title: t(`items.${it.key}.title`),
                description: t(`items.${it.key}.description`),
                href: it.href,
                icon: it.icon,
                external: it.external,
                crossZone: it.crossZone,
                planned: it.planned,
                statusLabel: it.planned
                  ? t("statuses.planned")
                  : it.external
                    ? t("statuses.external")
                    : undefined,
              }))}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
