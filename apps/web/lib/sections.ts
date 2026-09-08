import type { LucideIcon } from "lucide-react";
import {
  Compass,
  ShieldCheck,
  Map,
  Gauge,
  ArrowRightLeft,
  GraduationCap,
  Telescope,
  Wrench,
  Sparkles,
  Bot,
  Network,
  Factory,
  Landmark,
} from "lucide-react";

export type SectionKey = "discovery" | "inference" | "acceleration" | "profilers";

export type SectionItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  planned?: boolean;
  // crossZone = the href is served by another standalone Next.js app
  // (forge, waf, tap, …) reached through apps/web rewrites. Must navigate
  // with a full <a> page load — Next's client-side <Link> tries to fetch
  // RSC for a segment the shell doesn't own and hangs the dev router.
  crossZone?: boolean;
};

export type Section = {
  key: SectionKey;
  icon: LucideIcon;
  href: string;
  items: SectionItem[];
};

export const SECTIONS: Section[] = [
  {
    key: "discovery",
    icon: Telescope,
    href: "/discovery",
    items: [
      { key: "tap", href: "/tap", icon: Map, crossZone: true },
      { key: "maturity", href: "/maturity", icon: Gauge, crossZone: true },
      { key: "moma", href: "/moma", icon: Compass, crossZone: true },
    ],
  },
  {
    key: "inference",
    icon: Landmark,
    href: "/inference",
    items: [
      {
        key: "operating_model",
        href: "/operating-model",
        icon: Network,
      },
      { key: "waf", href: "/waf", icon: ShieldCheck, crossZone: true },
      {
        key: "people",
        href: "/people",
        icon: GraduationCap,
        crossZone: true,
      },
    ],
  },
  {
    key: "acceleration",
    icon: Sparkles,
    href: "/acceleration",
    items: [
      { key: "forge", href: "/forge", icon: Compass, crossZone: true },
      // Card-only for now — points to the upstream repo until we evaluate
      // compatibility + adaptations before vendoring it in.
      {
        key: "genie_workbench",
        href: "https://github.com/databricks-solutions/databricks-genie-workbench",
        icon: Bot,
        external: true,
      },
    ],
  },
  {
    key: "profilers",
    icon: Wrench,
    href: "/profilers",
    items: [
      {
        key: "lakebridge",
        href: "https://docs.databricks.com/aws/en/lakebridge",
        icon: ArrowRightLeft,
        external: true,
      },
      {
        key: "microsoft_migration_factory",
        href: "/microsoft-migration-factory",
        icon: Factory,
        planned: true,
      },
    ],
  },
];

export function getSection(key: SectionKey): Section {
  const s = SECTIONS.find((s) => s.key === key);
  if (!s) throw new Error(`Unknown section: ${key}`);
  return s;
}
