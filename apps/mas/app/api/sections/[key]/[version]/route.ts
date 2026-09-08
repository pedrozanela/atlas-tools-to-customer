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
 * GET /api/sections/[key]/[version]
 * Get a specific version of a section submission.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string; version: string }> }
) {
  const { key: sectionKey, version: versionStr } = await params;
  const version = parseInt(versionStr, 10);

  if (isNaN(version) || version < 1) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

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
         WHERE section_key = $1 AND version = $2`,
        [sectionKey, version]
      );

      if (res.rows.length === 0) {
        return { error: "Version not found", status: 404 };
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
    console.error("[mas] get section version failed", err);
    return NextResponse.json(
      { error: "Failed to fetch section version" },
      { status: 500 }
    );
  }
}
