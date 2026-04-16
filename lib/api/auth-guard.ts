import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const UNAUTHORIZED_ERROR_MESSAGE = "Brak autoryzacji.";

interface SupabaseAuthClient {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null };
      error: { message?: string; code?: string } | null;
    }>;
  };
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: UNAUTHORIZED_ERROR_MESSAGE },
    { status: 401 },
  );
}

/**
 * Central auth guard for protected Route Handlers.
 * Returns JSON 401 both when the session is missing and when Supabase auth
 * returns an error, so callers don't accidentally leak 500s for unauth flows.
 */
export async function requireAuth(
  supabase: SupabaseAuthClient,
  routeLabel: string,
): Promise<{ user: User; response: null } | { user: null; response: NextResponse }> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      if (error) {
        console.error(`[${routeLabel}] auth.getUser() error`, {
          code: error.code,
          message: error.message,
        });
      }
      return { user: null, response: unauthorizedResponse() };
    }

    return { user: data.user, response: null };
  } catch (error) {
    console.error(`[${routeLabel}] auth.getUser() threw`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return { user: null, response: unauthorizedResponse() };
  }
}
