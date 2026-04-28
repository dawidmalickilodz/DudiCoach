import { NextRequest, NextResponse } from "next/server";

import {
  PLAN_JOB_STATUS_SELECT,
  UUID_REGEX,
} from "@/lib/api/plan-jobs";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ jobId: string }> };

const NOT_FOUND_ERROR_CODE = "PGRST116";
type SupabaseErrorLike = { code?: string; message?: string } | null;

/**
 * GET /api/coach/plans/jobs/[jobId]
 * Returns sanitized async job status for the authenticated coach.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { jobId } = await params;
  if (!UUID_REGEX.test(jobId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { response } = await requireAuth(
    supabase,
    "GET /api/coach/plans/jobs/[jobId]",
  );
  if (response) return response;

  const { data, error } = await supabase
    .from("plan_generation_jobs")
    .select(PLAN_JOB_STATUS_SELECT)
    .eq("id", jobId)
    .single();
  const lookupError = error as SupabaseErrorLike;

  if (lookupError || !data) {
    if (lookupError?.code === NOT_FOUND_ERROR_CODE || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[GET /api/coach/plans/jobs/[jobId]] Supabase error", {
      code: lookupError?.code,
      message: lookupError?.message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}
