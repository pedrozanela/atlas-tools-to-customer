import type { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  statusLabel?: string;
  disabled?: boolean;
}

export function ModuleCard({
  icon: Icon,
  title,
  description,
  statusLabel,
  disabled = false,
}: ModuleCardProps) {
  return (
    <div
      className={`group h-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 transition-all ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-[color:var(--color-primary)] hover:shadow-md"
      }`}
    >
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {statusLabel && (
          <span className="shrink-0 rounded-full bg-[color:var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-muted-foreground)]">
            {statusLabel}
          </span>
        )}
      </div>
      <p className="text-xs leading-snug text-[color:var(--color-muted-foreground)]">
        {description}
      </p>
    </div>
  );
}
