import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Next.js 16: params is a Promise — must be awaited.
type RouteContext = { params: Promise<{ shareCode: string }> };

// 6 uppercase alphanumeric chars, with ambiguous characters excluded
// (matches generate_share_code() alphabet in US-002 migration).
const SHARE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * GET /api/athlete/[shareCode]
 * Public (no auth). Fetches a sanitized athlete profile via the
 * SECURITY DEFINER RPC `get_athlete_by_share_code`. Returns 404 when:
 *   • share code format is invalid
 *   • no athlete has this code
 *   • the athlete's share_active is false
 *
 * The share code itself is the access credential — see ADR-0003.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { shareCode } = await params;

  const normalized = shareCode.toUpperCase();
  if (!SHARE_CODE_REGEX.test(normalized)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_athlete_by_share_code", {
    p_code: normalized,
  });

  if (error) {
    console.error("[GET /api/athlete/[shareCode]] RPC error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // RPC returns an array (possibly empty) — convert to single row or 404.
  const row = data?.[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: row });
}
