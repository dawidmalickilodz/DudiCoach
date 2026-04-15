import type { Athlete } from "@/lib/types/athlete";
import type {
  CreateAthleteInput,
  UpdateAthleteInput,
} from "@/lib/validation/athlete";

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const json = (await response.json()) as { error?: string };
      message = json.error ?? message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function listAthletes(): Promise<Athlete[]> {
  const response = await fetch("/api/athletes", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = await parseOrThrow<{ data: Athlete[] }>(response);
  return json.data;
}

export async function getAthlete(id: string): Promise<Athlete> {
  const response = await fetch(`/api/athletes/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = await parseOrThrow<{ data: Athlete }>(response);
  return json.data;
}

export async function createAthlete(
  payload: CreateAthleteInput,
): Promise<Athlete> {
  const response = await fetch("/api/athletes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await parseOrThrow<{ data: Athlete }>(response);
  return json.data;
}

export async function updateAthlete(
  id: string,
  payload: UpdateAthleteInput,
): Promise<Athlete> {
  const response = await fetch(`/api/athletes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await parseOrThrow<{ data: Athlete }>(response);
  return json.data;
}

