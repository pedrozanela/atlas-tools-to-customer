import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ChevronRight } from "lucide-react";

interface CategoryItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  crossZone?: boolean;
  planned?: boolean;
  statusLabel?: string;
}

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
  actionLabel: string;
  items: CategoryItem[];
}

function ModuleEntry({ item }: { item: CategoryItem }) {
  const ItemIcon = item.icon;
  const content = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-primary)_9%,var(--color-card))] text-[color:var(--color-primary)] transition-colors group-hover/module:bg-[color:color-mix(in_srgb,var(--color-primary)_15%,var(--color-card))]">
        <ItemIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 text-sm font-semibold leading-tight text-[color:var(--color-foreground)]">
            {item.title}
          </span>
          {item.statusLabel && (
            <span className="shrink-0 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
              {item.statusLabel}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-[color:var(--color-muted-foreground)]">
          {item.description}
        </span>
      </span>
      {item.external ? (
        <ArrowUpRight
          className="mt-1 h-4 w-4 shrink-0 text-[color:var(--color-muted-foreground)] transition-colors group-hover/module:text-[color:var(--color-primary)]"
          aria-hidden="true"
        />
      ) : (
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-[color:var(--color-muted-foreground)] transition-all group-hover/module:translate-x-0.5 group-hover/module:text-[color:var(--color-primary)]"
          aria-hidden="true"
        />
      )}
    </>
  );
  const className = `group/module flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
    item.planned
      ? "cursor-not-allowed border-transparent bg-[color:var(--color-muted)] opacity-55"
      : "border-[color:var(--color-border)] bg-[color:var(--color-card)] hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--color-primary)_55%,var(--color-border))] hover:shadow-sm"
  }`;

  if (item.planned) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  if (item.crossZone) {
    return (
      <a href={item.href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

export function CategoryCard({
  icon: Icon,
  title,
  subtitle,
  href,
  actionLabel,
  items,
}: CategoryCardProps) {
  return (
    <article className="group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:border-[color:color-mix(in_srgb,var(--color-primary)_38%,var(--color-border))] hover:shadow-[0_18px_48px_rgba(15,23,42,0.09)] sm:p-7">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_20%,transparent))] opacity-0 transition-opacity group-hover/card:opacity-100"
      />

      <header className="flex items-start gap-4">
        <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-primary)_9%,var(--color-card))] text-[color:var(--color-primary)]">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--color-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-lg font-bold leading-tight tracking-tight">{subtitle}</p>
        </div>
      </header>

      <div className="mt-6 flex flex-1 flex-col gap-2.5">
        {items.map((item) => (
          <ModuleEntry key={item.title} item={item} />
        ))}
      </div>

      <Link
        href={href}
        className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[color:var(--color-primary)] transition-colors hover:text-[color:color-mix(in_srgb,var(--color-primary)_78%,black)]"
      >
        {actionLabel}
        <ChevronRight className="h-4 w-4 transition-transform group-hover/card:translate-x-0.5" />
      </Link>
    </article>
  );
}
