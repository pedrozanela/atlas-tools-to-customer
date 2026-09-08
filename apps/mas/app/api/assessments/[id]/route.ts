import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Basic UUID format gate so we don't pass garbage to Postgres.
  if (!/^[0-9a-f-]{8,}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const row = await withDb(async (client) => {
      const res = await client.query<{
        id: string;
        customer_name: string;
        user_email: string;
        created_at: string;
        answers: unknown;
        notes: unknown;
        scores: unknown;
        overall_score: string;
      }>(
        `SELECT id, customer_name, user_email, created_at,
                answers, notes, scores, overall_score
           FROM mas.assessments
           WHERE id = $1::uuid`,
        [id],
      );
      return res.rows[0] ?? null;
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("[mas] get failed", err);
    return NextResponse.json(
      { error: "Failed to fetch assessment" },
      { status: 500 },
    );
  }
}
