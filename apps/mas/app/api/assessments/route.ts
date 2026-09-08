import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { withDb } from "@/lib/db";
import { computeScores, type Answers } from "@/lib/scoring";

interface CreatePayload {
  customer_name: string;
  user_email: string;
  answers: Answers;
  notes?: Record<string, string>;
}

export async function POST(request: Request) {
  let body: CreatePayload;
  try {
    body = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body.customer_name ||
    !body.user_email ||
    !body.answers ||
    typeof body.answers !== "object"
  ) {
    return NextResponse.json(
      {
        error:
          "customer_name, user_email and answers are required",
      },
      { status: 400 },
    );
  }

  const scores = computeScores(body.answers);
  const id = randomUUID();

  try {
    await withDb(async (client) => {
      await client.query(
        `INSERT INTO mas.assessments
           (id, customer_name, user_email, answers, notes, scores, overall_score)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)`,
        [
          id,
          body.customer_name,
          body.user_email,
          JSON.stringify(body.answers),
          JSON.stringify(body.notes ?? {}),
          JSON.stringify(scores),
          scores.overall.toFixed(2),
        ],
      );
    });
  } catch (err) {
    console.error("[mas] insert failed", err);
    return NextResponse.json(
      { error: "Failed to persist assessment" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id, scores }, { status: 201 });
}

export async function GET() {
  try {
    const rows = await withDb(async (client) => {
      const res = await client.query<{
        id: string;
        customer_name: string;
        user_email: string;
        created_at: string;
        overall_score: string;
      }>(
        `SELECT id, customer_name, user_email, created_at, overall_score
           FROM mas.assessments
           ORDER BY created_at DESC
           LIMIT 50`,
      );
      return res.rows;
    });
    return NextResponse.json({ assessments: rows });
  } catch (err) {
    console.error("[mas] list failed", err);
    return NextResponse.json(
      { error: "Failed to list assessments" },
      { status: 500 },
    );
  }
}
