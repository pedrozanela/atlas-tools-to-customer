import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { findSession } from "@/lib/questionnaire";
import {
  computeSectionScore,
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

interface SubmitSectionRequest {
  user_email: string;
  user_name?: string;
  answers: SectionAnswers;
  notes?: string;
}

/**
 * POST /api/sections/[key]
 * Create a new version of a section submission.
 */
export async function POST(
  request: Request,
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

  let body: SubmitSectionRequest;
  try {
    body = (await request.json()) as SubmitSectionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.user_email || !body.answers) {
    return NextResponse.json(
      { error: "user_email and answers are required" },
      { status: 400 }
    );
  }

  // Compute section score
  const scoreResult = computeSectionScore(sectionKey, body.answers);
  if (!scoreResult) {
    return NextResponse.json(
      { error: "Failed to compute section score" },
      { status: 500 }
    );
  }

  const tierLabel = tierLabelPt(scoreResult.tier);

  try {
    const result = await withDb(async (client) => {
      // Get next version number
      const versionRes = await client.query<{ next_version: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 as next_version
         FROM mas.section_submissions_v2
         WHERE section_key = $1`,
        [sectionKey]
      );
      const nextVersion = versionRes.rows[0].next_version;

      // Insert new submission
      const insertRes = await client.query<{ id: string; submitted_at: string }>(
        `INSERT INTO mas.section_submissions_v2
           (section_key, version, user_email, user_name, answers, notes, score, tier, tier_label)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
         RETURNING id, submitted_at`,
        [
          sectionKey,
          nextVersion,
          body.user_email,
          body.user_name ?? null,
          JSON.stringify(body.answers),
          body.notes ?? null,
          scoreResult.score.toFixed(2),
          scoreResult.tier,
          tierLabel,
        ]
      );

      return {
        id: insertRes.rows[0].id,
        section_key: sectionKey,
        version: nextVersion,
        score: scoreResult.score,
        tier: scoreResult.tier,
        tier_label: tierLabel,
        submitted_at: insertRes.rows[0].submitted_at,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[mas] submit section failed", err);
    return NextResponse.json(
      { error: "Failed to submit section" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sections/[key]
 * List all versions of a section.
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
         ORDER BY version DESC`,
        [sectionKey]
      );

      return {
        section: {
          key: session.key,
          title: session.title,
          subtitle: session.subtitle,
          weight: session.weight,
          questions: session.questions,
          recommendations: session.recommendations,
        },
        versions: res.rows.map((r) => ({
          id: r.id,
          version: r.version,
          user_email: r.user_email,
          user_name: r.user_name,
          answers: r.answers,
          notes: r.notes,
          score: parseFloat(r.score),
          tier: r.tier,
          tier_label: r.tier_label,
          submitted_at: r.submitted_at,
        })),
        versionCount: res.rows.length,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[mas] get section versions failed", err);
    return NextResponse.json(
      { error: "Failed to fetch section versions" },
      { status: 500 }
    );
  }
}
