import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ shareCode: string }> };

const SHARE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * GET /api/athlete/[shareCode]/injuries
 * Public endpoint used by the athlete panel.
 * Data is gated via SECURITY DEFINER RPC by share_code.
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
    "get_active_injuries_by_share_code",
    { p_code: normalized },
  );

  if (error) {
    console.error("[GET /api/athlete/[shareCode]/injuries] RPC error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
