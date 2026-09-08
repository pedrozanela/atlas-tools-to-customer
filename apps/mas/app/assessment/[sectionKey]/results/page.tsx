import { redirect, notFound } from "next/navigation";
import { SectionResults } from "@/components/section-results";
import { findSession } from "@/lib/questionnaire";
import { headers } from "next/headers";

interface VersionData {
  id: string;
  version: number;
  score: number;
  tier: string;
  tier_label: string;
  notes: string | null;
  user_email: string;
  user_name: string | null;
  submitted_at: string;
  answers: Record<string, number>;
}

interface SectionResultsData {
  section: {
    key: string;
    title: string;
    subtitle: string;
    weight: number;
    questions: Array<{
      id: string;
      text: string;
      anchors: string[];
    }>;
    recommendations: Array<{
      title: string;
      detail: string;
      links?: Array<{ label: string; href: string }>;
    }>;
  };
  versions: VersionData[];
  versionCount: number;
}

async function getSectionResults(
  sectionKey: string,
): Promise<SectionResultsData | null> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host") ?? "localhost:3004";
    const protocol = host.includes("localhost") ? "http" : "https";

    const res = await fetch(
      `${protocol}://${host}/maturity/api/sections/${sectionKey}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export default async function SectionResultsPage({
  params,
}: {
  params: Promise<{ sectionKey: string }>;
}) {
  const { sectionKey } = await params;

  // Validate section key
  const session = findSession(sectionKey);
  if (!session) {
    notFound();
  }

  // Get section results
  const results = await getSectionResults(sectionKey);

  if (!results || results.versionCount === 0) {
    // Section not submitted yet, redirect to form
    redirect(`/assessment/${sectionKey}`);
  }

  return (
    <SectionResults
      section={results.section}
      versions={results.versions}
      versionCount={results.versionCount}
    />
  );
}
