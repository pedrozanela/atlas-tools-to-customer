import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { SESSIONS } from "@/lib/questionnaire";

interface SectionVersionInfo {
  section_key: string;
  version_count: number;
  latest_version: number;
  latest_score: number;
  latest_tier: string;
  latest_tier_label: string;
  latest_submitted_at: string;
}

/**
 * GET /api/sections/status
 * Returns status of all sections with their version counts.
 */
export async function GET() {
  try {
    const result = await withDb(async (client) => {
      // Get latest version info for each section
      const res = await client.query<SectionVersionInfo>(`
        WITH latest_versions AS (
          SELECT DISTINCT ON (section_key)
            section_key,
            version,
            score,
            tier,
            tier_label,
            submitted_at
          FROM mas.section_submissions_v2
          ORDER BY section_key, version DESC
        ),
        version_counts AS (
          SELECT section_key, COUNT(*)::int as version_count, MAX(version) as max_version
          FROM mas.section_submissions_v2
          GROUP BY section_key
        )
        SELECT
          vc.section_key,
          vc.version_count,
          vc.max_version as latest_version,
          lv.score as latest_score,
          lv.tier as latest_tier,
          lv.tier_label as latest_tier_label,
          lv.submitted_at as latest_submitted_at
        FROM version_counts vc
        JOIN latest_versions lv ON vc.section_key = lv.section_key
      `);

      // Build response with all sections
      const sectionMap = new Map(
        res.rows.map((r) => [r.section_key, r])
      );

      const sections = SESSIONS.map((session) => {
        const info = sectionMap.get(session.key);
        return {
          key: session.key,
          title: session.title,
          subtitle: session.subtitle,
          weight: session.weight,
          questionCount: session.questions.length,
          versionCount: info?.version_count ?? 0,
          latestVersion: info?.latest_version ?? null,
          latestScore: info ? parseFloat(String(info.latest_score)) : null,
          latestTier: info?.latest_tier ?? null,
          latestTierLabel: info?.latest_tier_label ?? null,
          latestSubmittedAt: info?.latest_submitted_at ?? null,
        };
      });

      return {
        sections,
        totalSections: SESSIONS.length,
        sectionsWithVersions: res.rows.length,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[mas] get sections status failed", err);
    return NextResponse.json(
      { error: "Failed to fetch sections status" },
      { status: 500 }
    );
  }
}
