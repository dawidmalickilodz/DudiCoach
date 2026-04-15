import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Next.js 16: params is a Promise — must be awaited.
type RouteContext = { params: Promise<{ id: string }> };
const NOT_FOUND_ERROR_CODE = "PGRST116";

function isNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === NOT_FOUND_ERROR_CODE;
}

// ---------------------------------------------------------------------------
// Body schema
//
// Share management is an explicit action — not a free-form PATCH on the
// athlete row. We narrow the surface to three operations:
//   • activate   — flip share_active=true (code preserved)
//   • deactivate — flip share_active=false (code preserved but inert)
//   • reset      — generate a brand-new code via RPC, keep share_active=true
// ---------------------------------------------------------------------------

const shareActionSchema = z.object({
  action: z.enum(["activate", "deactivate", "reset"]),
});

/**
 * POST /api/athletes/[id]/share
 * Coach action: activate/deactivate sharing or reset the share code.
 *
 * See: docs/design/US-004-design.md §2.1
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse + validate body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = shareActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { action } = parsed.data;

  // --- activate / deactivate: simple UPDATE on share_active ---
  if (action === "activate" || action === "deactivate") {
    const { data, error } = await supabase
      .from("athletes")
      .update({ share_active: action === "activate" })
      .eq("id", id)
      .select("share_code, share_active")
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      console.error("[POST /share activate/deactivate] Supabase error", {
        code: error.code,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  }

  // --- reset: call RPC to generate a new code, then activate ---
  const { data: newCode, error: rpcError } = await supabase.rpc(
    "reset_share_code",
    { p_athlete_id: id },
  );

  if (rpcError || !newCode) {
    // The RPC raises 'Not found or not authorized' when ownership check fails.
    const msg = rpcError?.message ?? "";
    if (msg.includes("Not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[POST /share reset] RPC error", {
      code: rpcError?.code,
      message: msg,
    });
    return NextResponse.json(
      { error: "Nie udało się zresetować kodu." },
      { status: 500 },
    );
  }

  // Ensure share_active is true after reset
  const { data: activated, error: activateError } = await supabase
    .from("athletes")
    .update({ share_active: true })
    .eq("id", id)
    .select("share_code, share_active")
    .single();

  if (activateError || !activated) {
    console.error("[POST /share reset] Post-reset update failed", {
      code: activateError?.code,
    });
    // RPC succeeded but activation flag update failed — return the new code
    // so the client can display it; share_active remains whatever it was.
    return NextResponse.json(
      { data: { share_code: newCode, share_active: false } },
      { status: 200 },
    );
  }

  return NextResponse.json({ data: activated });
}
