/**
 * GET /api/system-load
 *
 * Returns a snapshot of cross-system load for the SystemLoadBanner. Per-user
 * fields (`yourInflight`, `yourQueued`) require an authenticated request.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSystemLoad } from "@/lib/dbx/system-load";
import { requireUser, ForgeAuthError } from "@/lib/auth/route-user";
import { notifyScheduler, refreshQueuedRunOboTokensForOwner } from "@/lib/pipeline/scheduler";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    // The banner polls while the user is active. Use that authenticated
    // request to renew only this owner's queued-run handoffs; the token never
    // leaves process memory. Refresh is best-effort so load visibility still
    // works if this auxiliary lookup fails.
    try {
      const refreshed = await refreshQueuedRunOboTokensForOwner(user.email, user.oboToken);
      if (refreshed > 0) notifyScheduler();
    } catch {
      // A missing refresh leaves runs safely queued until a later poll.
    }
    const snapshot = await getSystemLoad(user.email);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    if (err instanceof ForgeAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load system load" },
      { status: 500 },
    );
  }
}
