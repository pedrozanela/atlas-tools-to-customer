"use client";

import { useEffect, useState } from "react";
import { SectionMenu } from "@/components/section-menu";
import { Loader2 } from "lucide-react";

interface SectionVersionInfo {
  key: string;
  title: string;
  subtitle: string;
  weight: number;
  questionCount: number;
  versionCount: number;
  latestVersion: number | null;
  latestScore: number | null;
  latestTier: string | null;
  latestTierLabel: string | null;
  latestSubmittedAt: string | null;
}

interface SectionsStatusResponse {
  sections: SectionVersionInfo[];
  totalSections: number;
  sectionsWithVersions: number;
}

export function AssessmentMenuContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SectionsStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/maturity/api/sections/status", {
          cache: "no-store",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 p-4">
          <div className="font-medium">Erro ao carregar assessment</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <SectionMenu
      sections={data.sections}
      totalSections={data.totalSections}
      sectionsWithVersions={data.sectionsWithVersions}
    />
  );
}
