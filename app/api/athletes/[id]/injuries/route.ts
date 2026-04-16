import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { createInjurySchema } from "@/lib/validation/injury";

type RouteContext = { params: Promise<{ id: string }> };

function broadcastInjuriesChanged(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
) {
  void (async () => {
    try {
      const { data: athlete, error } = await supabase
        .from("athletes")
        .select("share_active, share_code")
        .eq("id", athleteId)
        .single();

      if (error || !athlete?.share_active) return;

      const channel = supabase.channel(`athlete:${athlete.share_code}`);
      await channel.send({
        type: "broadcast",
        event: "injuries_changed",
        payload: {
          athlete_id: athleteId,
          at: new Date().toISOString(),
        },
      });
      await supabase.removeChannel(channel);
    } catch (error) {
      console.error("[broadcastInjuriesChanged] non-fatal error", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}

/**
 * GET /api/athletes/[id]/injuries
 * Returns injuries for one athlete, ordered by injury_date DESC.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "GET /api/athletes/[id]/injuries",
  );
  if (response) return response;

  const { data, error } = await supabase
    .from("injuries")
    .select("*")
    .eq("athlete_id", id)
    .order("injury_date", { ascending: false });

  if (error) {
    console.error("[GET /api/athletes/[id]/injuries] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Nie udało się pobrać kontuzji." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/athletes/[id]/injuries
 * Creates a new injury for an athlete owned by the authenticated coach.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "POST /api/athletes/[id]/injuries",
  );
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createInjurySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("injuries")
    .insert({
      athlete_id: id,
      ...parsed.data,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[POST /api/athletes/[id]/injuries] Supabase error", {
      code: error?.code,
      message: error?.message,
    });
    return NextResponse.json(
      { error: "Nie udało się dodać kontuzji." },
      { status: 500 },
    );
  }

  broadcastInjuriesChanged(supabase, id);

  return NextResponse.json({ data }, { status: 201 });
}
