import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import {
  isFitnessTestKeyAllowedForSport,
} from "@/lib/constants/fitness-tests";
import { SPORTS, type Sport } from "@/lib/constants/sports";
import { createClient } from "@/lib/supabase/server";
import { createFitnessTestResultSchema } from "@/lib/validation/fitness-test";

type RouteContext = { params: Promise<{ id: string }> };
type SupabaseErrorLike = { code?: string; message?: string } | null;
type AthleteSummary = { id: string; sport: string | null };

const NOT_FOUND_ERROR_CODE = "PGRST116";
const ATHLETE_NOT_FOUND_ERROR = "Nie znaleziono zawodnika.";

function isNotFoundError(error: SupabaseErrorLike): boolean {
  return error?.code === NOT_FOUND_ERROR_CODE;
}

function normalizeSport(value: string | null): Sport | null {
  if (value === null) return null;
  return (SPORTS as readonly string[]).includes(value)
    ? (value as Sport)
    : null;
}

async function fetchAthleteSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  routeLabel: string,
  internalErrorMessage: string,
): Promise<{ athlete: AthleteSummary; response: null } | { athlete: null; response: NextResponse }> {
  const { data, error } = await supabase
    .from("athletes")
    .select("id, sport")
    .eq("id", athleteId)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return {
        athlete: null,
        response: NextResponse.json(
          { error: ATHLETE_NOT_FOUND_ERROR },
          { status: 404 },
        ),
      };
    }

    console.error(`[${routeLabel}] failed to verify athlete`, {
      code: error.code,
      message: error.message,
    });
    return {
      athlete: null,
      response: NextResponse.json(
        { error: internalErrorMessage },
        { status: 500 },
      ),
    };
  }

  if (!data) {
    return {
      athlete: null,
      response: NextResponse.json(
        { error: ATHLETE_NOT_FOUND_ERROR },
        { status: 404 },
      ),
    };
  }

  return { athlete: data, response: null };
}

/**
 * GET /api/athletes/[id]/tests
 * Returns all fitness test results for one athlete ordered by test_date DESC.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "GET /api/athletes/[id]/tests",
  );
  if (response) return response;

  const athleteLookup = await fetchAthleteSummary(
    supabase,
    id,
    "GET /api/athletes/[id]/tests",
    "Nie udalo sie pobrac wynikow testow.",
  );
  if (athleteLookup.response) return athleteLookup.response;

  const { data, error } = await supabase
    .from("fitness_test_results")
    .select("*")
    .eq("athlete_id", id)
    .order("test_date", { ascending: false });

  if (error) {
    console.error("[GET /api/athletes/[id]/tests] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Nie udalo sie pobrac wynikow testow." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/athletes/[id]/tests
 * Creates one fitness test result row for an athlete owned by authenticated coach.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { response } = await requireAuth(
    supabase,
    "POST /api/athletes/[id]/tests",
  );
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createFitnessTestResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const athleteLookup = await fetchAthleteSummary(
    supabase,
    id,
    "POST /api/athletes/[id]/tests",
    "Nie udalo sie dodac wyniku testu.",
  );
  if (athleteLookup.response) return athleteLookup.response;

  const athleteSport = normalizeSport(athleteLookup.athlete.sport);
  const isAllowed = isFitnessTestKeyAllowedForSport(
    parsed.data.test_key,
    athleteSport,
  );

  if (!isAllowed) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: [
          {
            path: ["test_key"],
            message: "Test is not allowed for athlete sport",
            code: "custom",
          },
        ],
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("fitness_test_results")
    .insert({
      athlete_id: id,
      ...parsed.data,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: ATHLETE_NOT_FOUND_ERROR },
        { status: 404 },
      );
    }

    console.error("[POST /api/athletes/[id]/tests] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Nie udalo sie dodac wyniku testu." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: ATHLETE_NOT_FOUND_ERROR },
      { status: 404 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
