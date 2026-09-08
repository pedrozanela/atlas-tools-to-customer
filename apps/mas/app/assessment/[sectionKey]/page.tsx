import { notFound } from "next/navigation";
import { SectionForm } from "@/components/section-form";
import { findSession } from "@/lib/questionnaire";
import { getUserInfo } from "@/lib/auth/user";
import { headers } from "next/headers";

interface VersionInfo {
  version: number;
  score: number;
  tier_label: string;
  submitted_at: string;
  user_email: string;
}

interface SectionData {
  versionCount: number;
  latestVersion: VersionInfo | null;
}

async function getSectionData(sectionKey: string): Promise<SectionData> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host") ?? "localhost:3004";
    const protocol = host.includes("localhost") ? "http" : "https";

    const res = await fetch(
      `${protocol}://${host}/maturity/api/sections/${sectionKey}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      return { versionCount: 0, latestVersion: null };
    }

    const data = await res.json();

    if (data.versions && data.versions.length > 0) {
      const latest = data.versions[0]; // Already sorted by version DESC
      return {
        versionCount: data.versionCount,
        latestVersion: {
          version: latest.version,
          score: latest.score,
          tier_label: latest.tier_label,
          submitted_at: latest.submitted_at,
          user_email: latest.user_email,
        },
      };
    }

    return { versionCount: 0, latestVersion: null };
  } catch {
    return { versionCount: 0, latestVersion: null };
  }
}

export default async function SectionFormPage({
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

  // Get user info from headers
  const userInfo = await getUserInfo();

  // Get existing versions
  const { versionCount, latestVersion } = await getSectionData(sectionKey);

  return (
    <SectionForm
      session={session}
      defaultEmail={userInfo.email ?? ""}
      defaultName={userInfo.name ?? ""}
      latestVersion={latestVersion}
      versionCount={versionCount}
    />
  );
}
