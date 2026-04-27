import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import {
  updateAthleteSchema,
  type UpdateAthleteInput,
} from "@/lib/validation/athlete";

// Next.js 16: params is a Promise — must be awaited.
type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND_ERROR_CODE = "PGRST116";

function isNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === NOT_FOUND_ERROR_CODE;
}

function normalizeEmptyOptionFields(
  input: UpdateAthleteInput,
): UpdateAthleteInput {
  const normalized: UpdateAthleteInput = { ...input };
  for (const key of [
    "goal",
    "current_phase",
    "training_start_date",
  ] as const) {
    if (normalized[key] === "") {
      delete normalized[key];
    }
  }
  return normalized;
}

/**
 * GET /api/athletes/[id]
 * Fetch a single athlete by ID. RLS ensures the coach can only read their own athletes.
 * Returns 200 { data: Athlete }, 404 { error: "Not found" }, or 500 on backend errors.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;

  const supabase = await createClient();
  const { response } = await requireAuth(supabase, "GET /api/athletes/[id]");
  if (response) return response;

  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[GET /api/athletes/[id]] Supabase error", {
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

/**
 * PATCH /api/athletes/[id]
 * Partial update of an athlete. All fields optional (auto-save sends changed fields).
 * RLS ensures the coach can only update their own athletes.
 * Returns 200 { data: Athlete } (full updated row), 404 for missing row, or 500 on backend errors.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;

  const supabase = await createClient();
  const { response } = await requireAuth(supabase, "PATCH /api/athletes/[id]");
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAthleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const normalized = normalizeEmptyOptionFields(parsed.data);

  const { data, error } = await supabase
    .from("athletes")
    .update(normalized)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[PATCH /api/athletes/[id]] Supabase error", {
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

  // ---------------------------------------------------------------------
  // Broadcast the updated row to the athlete panel when sharing is active.
  // Channel name matches useRealtimeAthlete hook: `athlete:{share_code}`.
  // coach_id and created_at are stripped — they are not exposed to the
  // anonymous athlete panel (same shape as get_athlete_by_share_code RPC).
  // Fire-and-forget: broadcast failures must not block the save response.
  // See: docs/design/US-004-design.md §2.3, §3
  // ---------------------------------------------------------------------
  if (data.share_active) {
    try {
      const channel = supabase.channel(`athlete:${data.share_code}`);
      await channel.send({
        type: "broadcast",
        event: "athlete_updated",
        payload: {
          id: data.id,
          name: data.name,
          age: data.age,
          weight_kg: data.weight_kg,
          height_cm: data.height_cm,
          sport: data.sport,
          training_start_date: data.training_start_date,
          training_days_per_week: data.training_days_per_week,
          session_minutes: data.session_minutes,
          current_phase: data.current_phase,
          goal: data.goal,
          notes: data.notes,
          share_code: data.share_code,
          updated_at: data.updated_at,
        },
      });
      await supabase.removeChannel(channel);
    } catch (broadcastErr) {
      console.error("[PATCH /api/athletes/[id]] Broadcast failed (non-fatal)", {
        message:
          broadcastErr instanceof Error
            ? broadcastErr.message
            : String(broadcastErr),
      });
    }
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/athletes/[id]
 * Delete an athlete. RLS ensures the coach can only delete their own athletes.
 * Returns 204 (no body) on success, 404 if not found or not owned.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;

  const supabase = await createClient();
  const { response } = await requireAuth(supabase, "DELETE /api/athletes/[id]");
  if (response) return response;

  // Use count to detect "not found or not owned" (RLS returns 0 rows deleted).
  const { error, count } = await supabase
    .from("athletes")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/athletes/[id]] Supabase error", {
      code: error.code,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
