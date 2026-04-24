import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { PublicTrainingPlan } from "@/lib/types/plan-public";

type RouteContext = { params: Promise<{ shareCode: string }> };

const SHARE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * GET /api/athlete/[shareCode]/plans
 * Public endpoint used by the athlete panel.
 * Returns the most recent training plan gated via SECURITY DEFINER RPC by share_code.
 * Returns { data: PublicTrainingPlan } when a plan exists, or { data: null } when
 * the code is valid+active but the athlete has no plan yet.
 * Returns 404 for malformed, nonexistent, or inactive share codes.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { shareCode } = await params;
  const normalized = shareCode.toUpperCase();

  if (!SHARE_CODE_REGEX.test(normalized)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_latest_plan_by_share_code",
    { p_code: normalized },
  );

  if (error) {
    console.error("[GET /api/athlete/[shareCode]/plans] RPC error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Supabase codegen types plan_json as Json (not TrainingPlanJson); shape was
  // validated by trainingPlanJsonSchema at write time (US-005). Cast is safe.
  const row = (data as unknown as PublicTrainingPlan[] | null)?.[0] ?? null;
  return NextResponse.json({ data: row });
}
