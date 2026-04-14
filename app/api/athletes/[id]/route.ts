import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { updateAthleteSchema } from "@/lib/validation/athlete";

// Next.js 16: params is a Promise — must be awaited.
type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND_ERROR_CODE = "PGRST116";

function isNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === NOT_FOUND_ERROR_CODE;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { data, error } = await supabase
    .from("athletes")
    .update(parsed.data)
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
