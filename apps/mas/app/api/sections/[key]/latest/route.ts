import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { findSession } from "@/lib/questionnaire";
import type { SectionAnswers } from "@/lib/scoring";

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

/**
 * GET /api/sections/[key]/latest
 * Get the latest version of a section submission.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: sectionKey } = await params;

  // Validate section key
  const session = findSession(sectionKey);
  if (!session) {
    return NextResponse.json(
      { error: `Invalid section key: ${sectionKey}` },
      { status: 400 }
    );
  }

  try {
    const result = await withDb(async (client) => {
      const res = await client.query<SectionSubmissionRow>(
        `SELECT id, section_key, version, user_email, user_name, answers, notes, score, tier, tier_label, submitted_at
         FROM mas.section_submissions_v2
         WHERE section_key = $1
         ORDER BY version DESC
         LIMIT 1`,
        [sectionKey]
      );

      if (res.rows.length === 0) {
        return { error: "No submissions found for this section", status: 404 };
      }

      const submission = res.rows[0];
      return {
        id: submission.id,
        section_key: submission.section_key,
        version: submission.version,
        user_email: submission.user_email,
        user_name: submission.user_name,
        answers: submission.answers,
        notes: submission.notes,
        score: parseFloat(submission.score),
        tier: submission.tier,
        tier_label: submission.tier_label,
        submitted_at: submission.submitted_at,
        session: {
          key: session.key,
          title: session.title,
          subtitle: session.subtitle,
          weight: session.weight,
          questions: session.questions,
          recommendations: session.recommendations,
        },
      };
    });

    if ("error" in result && "status" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[mas] get latest section failed", err);
    return NextResponse.json(
      { error: "Failed to fetch latest section" },
      { status: 500 }
    );
  }
}
