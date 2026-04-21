import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string; testId: string }> };

/**
 * DELETE /api/athletes/[id]/tests/[testId]
 * Deletes one fitness test result row.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id, testId } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "DELETE /api/athletes/[id]/tests/[testId]",
  );
  if (response) return response;

  const { error, count } = await supabase
    .from("fitness_test_results")
    .delete({ count: "exact" })
    .eq("athlete_id", id)
    .eq("id", testId);

  if (error) {
    console.error("[DELETE /api/athletes/[id]/tests/[testId]] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Nie udalo sie usunac wyniku testu." },
      { status: 500 },
    );
  }

  if (count === 0) {
    return NextResponse.json(
      { error: "Nie znaleziono wyniku testu." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
