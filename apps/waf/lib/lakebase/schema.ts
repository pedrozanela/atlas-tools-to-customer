/**
 * Lakebase schema management.
 *
 * Empty Lakebase schemas are bootstrapped from the pre-generated Prisma SQL
 * by the serverless deployment notebook. Existing schemas are deliberately
 * not replaced, so additive runtime migrations live here.
 */

import { withPrisma } from "@/lib/prisma";

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrated(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = withPrisma(async (prisma) => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "waf"."assessments"
      ADD COLUMN IF NOT EXISTS "recommendation_setup_status" TEXT NOT NULL DEFAULT 'not_started'
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "waf"."assessments"
      ADD COLUMN IF NOT EXISTS "recommendation_setup_error" TEXT
    `);

    // Static SQL only. This table is also present in the generated bootstrap
    // SQL for new installations; CREATE IF NOT EXISTS upgrades existing WAF
    // schemas created by earlier Atlas releases.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "waf"."genie_recommendations" (
        "id" TEXT NOT NULL,
        "assessment_id" TEXT NOT NULL,
        "waf_id" TEXT NOT NULL,
        "agent_id" TEXT NOT NULL,
        "locale" TEXT NOT NULL DEFAULT 'en',
        "status" TEXT NOT NULL DEFAULT 'pending',
        "conversation_id" TEXT,
        "response_id" TEXT,
        "prompt_text" TEXT NOT NULL,
        "report_markdown" TEXT,
        "citations_json" TEXT,
        "documentation_json" TEXT,
        "evidence_json" TEXT,
        "query_count" INTEGER NOT NULL DEFAULT 0,
        "error_code" TEXT,
        "error_message" TEXT,
        "started_at" TIMESTAMP(3),
        "completed_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "genie_recommendations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "genie_recommendations_assessment_id_fkey"
          FOREIGN KEY ("assessment_id") REFERENCES "waf"."assessments"("assessment_id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "genie_recommendations_waf_id_fkey"
          FOREIGN KEY ("waf_id") REFERENCES "waf"."controls"("waf_id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "genie_recommendations_assessment_id_waf_id_key"
      ON "waf"."genie_recommendations"("assessment_id", "waf_id")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "genie_recommendations_assessment_id_status_idx"
      ON "waf"."genie_recommendations"("assessment_id", "status")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "genie_recommendations_waf_id_idx"
      ON "waf"."genie_recommendations"("waf_id")
    `);
  }).catch((error) => {
    migrationPromise = null;
    throw error;
  });

  return migrationPromise;
}

export async function runMigrations(): Promise<void> {
  return ensureMigrated();
}
