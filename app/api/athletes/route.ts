import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import {
  createAthleteSchema,
} from "@/lib/validation/athlete";

/**
 * POST /api/athletes
 * Create a new athlete for the authenticated coach.
 * Returns 201 { data: Athlete } on success.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { user, response } = await requireAuth(supabase, "POST /api/athletes");
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAthleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("athletes")
    .insert({ ...parsed.data, coach_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/athletes] Supabase error", {
      code: error.code,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * GET /api/athletes
 * List all athletes owned by the authenticated coach, sorted by updated_at DESC.
 * Returns 200 { data: Athlete[] } on success.
 */
export async function GET() {
  const supabase = await createClient();

  const { response } = await requireAuth(supabase, "GET /api/athletes");
  if (response) return response;

  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[GET /api/athletes] Supabase error", {
      code: error.code,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}
