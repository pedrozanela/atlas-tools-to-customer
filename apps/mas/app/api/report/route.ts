import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { SESSIONS, findSession } from "@/lib/questionnaire";
import {
  computeOverallFromSections,
  tierLabelPt,
  type SectionAnswers,
} from "@/lib/scoring";

interface SectionSubmissionRow {
  id: string;
  section_key: string;
  version: number;
  user_email: string;
  user_name: string | null;
  answers: SectionAnswers;
  notes: string | null;
  score: string;
  tier: string;
  tier_label: string;
  submitted_at: string;
}

interface VersionSelection {
  section_key: string;
  version: number | "latest";
}

interface ReportRequest {
  selections?: VersionSelection[];
}

/**
 * POST /api/report
 * Generate a report with selected versions (default: latest for each section).
 * Body: { selections?: [{ section_key: string, version: number | "latest" }] }
 */
export async function POST(request: Request) {
  let body: ReportRequest;
  try {
    body = (await request.json()) as ReportRequest;
  } catch {
    body = {};
  }

  try {
    const result = await withDb(async (client) => {
      // Build query based on selections or get latest for all
      let submissions: SectionSubmissionRow[] = [];

      if (body.selections && body.selections.length > 0) {
        // Get specific versions
        for (const sel of body.selections) {
          let res;
          if (sel.version === "latest") {
            res = await client.query<SectionSubmissionRow>(
              `SELECT id, section_key, version, user_email, user_name, answers, notes, score, tier, tier_label, submitted_at
               FROM mas.section_submissions_v2
               WHERE section_key = $1
               ORDER BY version DESC
               LIMIT 1`,
              [sel.section_key]
            );
          } else {
            res = await client.query<SectionSubmissionRow>(
              `SELECT id, section_key, version, user_email, user_name, answers, notes, score, tier, tier_label, submitted_at
               FROM mas.section_submissions_v2
               WHERE section_key = $1 AND version = $2`,
              [sel.section_key, sel.version]
            );
          }
          if (res.rows.length > 0) {
            submissions.push(res.rows[0]);
          }
        }
      } else {
        // Get latest for all sections
        const res = await client.query<SectionSubmissionRow>(
          `SELECT DISTINCT ON (section_key)
             id, section_key, version, user_email, user_name, answers, notes, score, tier, tier_label, submitted_at
           FROM mas.section_submissions_v2
           ORDER BY section_key, version DESC`
        );
        submissions = res.rows;
      }

      // Build report data
      const sectionData = submissions.map((sub) => {
        const session = findSession(sub.section_key);
        return {
          id: sub.id,
          section_key: sub.section_key,
          version: sub.version,
          title: session?.title ?? sub.section_key,
          subtitle: session?.subtitle ?? "",
          weight: session?.weight ?? 0,
          user_email: sub.user_email,
          user_name: sub.user_name,
          answers: sub.answers,
          notes: sub.notes,
          score: parseFloat(sub.score),
          tier: sub.tier,
          tier_label: sub.tier_label,
          submitted_at: sub.submitted_at,
          questions: session?.questions ?? [],
          recommendations: session?.recommendations ?? [],
        };
      });

      // Calculate overall score
      const overall = computeOverallFromSections(
        sectionData.map((s) => ({
          section_key: s.section_key,
          score: s.score,
        }))
      );

      // Build section summary for all sessions (including those without submissions)
      const submissionMap = new Map(sectionData.map((s) => [s.section_key, s]));
      const allSections = SESSIONS.map((session) => {
        const data = submissionMap.get(session.key);
        return {
          key: session.key,
          title: session.title,
          subtitle: session.subtitle,
          weight: session.weight,
          hasSubmission: !!data,
          version: data?.version ?? null,
          score: data?.score ?? null,
          tier: data?.tier ?? null,
          tier_label: data?.tier_label ?? null,
        };
      });

      return {
        overall_score: overall.overall,
        overall_tier: overall.tier,
        overall_tier_label: tierLabelPt(overall.tier),
        total_sections: SESSIONS.length,
        sections_with_data: sectionData.length,
        sections: sectionData,
        all_sections: allSections,
        generated_at: new Date().toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[mas] generate report failed", err);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/report
 * Get report with latest versions (convenience endpoint).
 */
export async function GET() {
  try {
    const result = await withDb(async (client) => {
      // Get latest for all sections
      const res = await client.query<SectionSubmissionRow>(
        `SELECT DISTINCT ON (section_key)
           id, section_key, version, user_email, user_name, answers, notes, score, tier, tier_label, submitted_at
         FROM mas.section_submissions_v2
         ORDER BY section_key, version DESC`
      );

      const submissions = res.rows;

      // Build report data
      const sectionData = submissions.map((sub) => {
        const session = findSession(sub.section_key);
        return {
          id: sub.id,
          section_key: sub.section_key,
          version: sub.version,
          title: session?.title ?? sub.section_key,
          subtitle: session?.subtitle ?? "",
          weight: session?.weight ?? 0,
          user_email: sub.user_email,
          user_name: sub.user_name,
          answers: sub.answers,
          notes: sub.notes,
          score: parseFloat(sub.score),
          tier: sub.tier,
          tier_label: sub.tier_label,
          submitted_at: sub.submitted_at,
          questions: session?.questions ?? [],
          recommendations: session?.recommendations ?? [],
        };
      });

      // Calculate overall score
      const overall = computeOverallFromSections(
        sectionData.map((s) => ({
          section_key: s.section_key,
          score: s.score,
        }))
      );

      // Build section summary for all sessions
      const submissionMap = new Map(sectionData.map((s) => [s.section_key, s]));
      const allSections = SESSIONS.map((session) => {
        const data = submissionMap.get(session.key);
        return {
          key: session.key,
          title: session.title,
          subtitle: session.subtitle,
          weight: session.weight,
          hasSubmission: !!data,
          version: data?.version ?? null,
          score: data?.score ?? null,
          tier: data?.tier ?? null,
          tier_label: data?.tier_label ?? null,
        };
      });

      return {
        overall_score: overall.overall,
        overall_tier: overall.tier,
        overall_tier_label: tierLabelPt(overall.tier),
        total_sections: SESSIONS.length,
        sections_with_data: sectionData.length,
        sections: sectionData,
        all_sections: allSections,
        generated_at: new Date().toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[mas] get report failed", err);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
