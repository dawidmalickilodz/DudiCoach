import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { updateInjurySchema } from "@/lib/validation/injury";

type RouteContext = { params: Promise<{ id: string; injuryId: string }> };

const NOT_FOUND_ERROR_CODE = "PGRST116";

function isNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === NOT_FOUND_ERROR_CODE;
}

/**
 * PATCH /api/athletes/[id]/injuries/[injuryId]
 * Partial update of one injury row.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id, injuryId } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "PATCH /api/athletes/[id]/injuries/[injuryId]",
  );
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateInjurySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("injuries")
    .update(parsed.data)
    .eq("athlete_id", id)
    .eq("id", injuryId)
    .select("*")
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json(
        { error: "Nie znaleziono kontuzji." },
        { status: 404 },
      );
    }

    console.error("[PATCH /api/athletes/[id]/injuries/[injuryId]] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Nie udało się zaktualizować kontuzji." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Nie znaleziono kontuzji." },
      { status: 404 },
    );
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/athletes/[id]/injuries/[injuryId]
 * Deletes one injury row.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id, injuryId } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "DELETE /api/athletes/[id]/injuries/[injuryId]",
  );
  if (response) return response;

  const { error, count } = await supabase
    .from("injuries")
    .delete({ count: "exact" })
    .eq("athlete_id", id)
    .eq("id", injuryId);

  if (error) {
    console.error("[DELETE /api/athletes/[id]/injuries/[injuryId]] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Nie udało się usunąć kontuzji." },
      { status: 500 },
    );
  }

  if (count === 0) {
    return NextResponse.json(
      { error: "Nie znaleziono kontuzji." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
