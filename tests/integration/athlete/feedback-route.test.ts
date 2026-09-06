/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  return { mockRpc };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    rpc: mockRpc,
  })),
}));

import {
  GET,
  POST,
} from "@/app/api/athlete/[shareCode]/plans/[planId]/feedback/route";

const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";

function routeContext(shareCode: string, planId = PLAN_ID) {
  return { params: Promise.resolve({ shareCode, planId }) };
}

function makePostRequest(body: unknown) {
  return new Request(
    "http://localhost/api/athlete/ABC234/plans/plan/feedback",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeGetRequest(query = "") {
  return new Request(
    `http://localhost/api/athlete/ABC234/plans/${PLAN_ID}/feedback${query}`,
    {
      method: "GET",
    },
  );
}

const FEEDBACK_ROW = {
  id: "3dd7876d-5522-4d67-a7f7-f2a2b62a12f4",
  plan_id: PLAN_ID,
  athlete_id: "1b89fb8d-9b84-4ec0-a37e-d2828d97e661",
  week_number: 2,
  day_number: 3,
  feedback_text: "Czulem zmeczenie, ale plan byl wykonalny.",
  created_at: "2026-05-22T10:00:00.000Z",
  updated_at: "2026-05-22T10:00:00.000Z",
};

const V2_OUTCOME = {
  sessionDate: "2026-05-22",
  sessionStatus: "completed",
  sessionRpe: 7,
  wellbeing: 4,
  painScore: 2,
  painLocation: "knee",
  painSide: "left",
} as const;

const V2_FEEDBACK_ROW = {
  id: FEEDBACK_ROW.id,
  plan_id: FEEDBACK_ROW.plan_id,
  week_number: FEEDBACK_ROW.week_number,
  day_number: FEEDBACK_ROW.day_number,
  feedback_text: null,
  session_date: "2026-05-22",
  session_status: "completed",
  session_rpe: 7,
  wellbeing: 4,
  pain_score: 2,
  pain_location: "knee",
  pain_side: "left",
  created_at: FEEDBACK_ROW.created_at,
  updated_at: FEEDBACK_ROW.updated_at,
};

const V2_RPC_ROW_WITH_EXTRA_FIELDS = {
  ...V2_FEEDBACK_ROW,
  athlete_id: FEEDBACK_ROW.athlete_id,
  coach_id: "b9a56924-d80d-4378-9b18-5ef0111472f4",
  share_code: "ZZZ999",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/athlete/[shareCode]/plans/[planId]/feedback", () => {
  it("returns 404 for invalid share code format", async () => {
    const response = await POST(
      makePostRequest({
        weekNumber: 1,
        dayNumber: 1,
        feedbackText: "ok",
      }) as Parameters<typeof POST>[0],
      routeContext("abc123"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.error).toBe("Not found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    const response = await POST(
      makePostRequest({
        weekNumber: 0,
        dayNumber: 8,
        feedbackText: "",
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.error).toBe("Validation failed");
    expect(json.issues).toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 400 for whitespace-only feedback", async () => {
    const response = await POST(
      makePostRequest({
        weekNumber: 1,
        dayNumber: 2,
        feedbackText: "    \n\t   ",
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 400 for too-long feedback", async () => {
    const response = await POST(
      makePostRequest({
        weekNumber: 1,
        dayNumber: 2,
        feedbackText: "a".repeat(2001),
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 200 for valid feedback and calls RPC with sanitized feedback text", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { ...FEEDBACK_ROW, feedback_text: "Dobry trening.\nWysokie tetno." },
      ],
      error: null,
    });

    const response = await POST(
      makePostRequest({
        weekNumber: 2,
        dayNumber: 3,
        feedbackText: "  Dobry trening.\x01\nWysokie tetno.  ",
      }) as Parameters<typeof POST>[0],
      routeContext("abc234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.data.feedback_text).toBe("Dobry trening.\nWysokie tetno.");
    expect(json.data.athlete_id).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("upsert_plan_session_feedback", {
      p_code: "ABC234",
      p_plan_id: PLAN_ID,
      p_week_number: 2,
      p_day_number: 3,
      p_feedback_text: "Dobry trening.\nWysokie tetno.",
    });
  });

  it("returns 200 for v2 outcome and calls v2 RPC with allowlisted response", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [V2_RPC_ROW_WITH_EXTRA_FIELDS],
      error: null,
    });

    const response = await POST(
      makePostRequest({
        contractVersion: 2,
        weekNumber: 2,
        dayNumber: 3,
        feedbackText: null,
        outcome: V2_OUTCOME,
      }) as Parameters<typeof POST>[0],
      routeContext("abc234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.data).toMatchObject({
      id: V2_FEEDBACK_ROW.id,
      plan_id: PLAN_ID,
      week_number: 2,
      day_number: 3,
      feedback_text: null,
      session_date: "2026-05-22",
      session_status: "completed",
      session_rpe: 7,
      wellbeing: 4,
      pain_score: 2,
      pain_location: "knee",
      pain_side: "left",
    });
    expect(json.data.athlete_id).toBeUndefined();
    expect(json.data.coach_id).toBeUndefined();
    expect(json.data.share_code).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("upsert_plan_session_feedback_v2", {
      p_code: "ABC234",
      p_plan_id: PLAN_ID,
      p_week_number: 2,
      p_day_number: 3,
      p_session_date: "2026-05-22",
      p_session_status: "completed",
      p_wellbeing: 4,
      p_pain_score: 2,
      p_session_rpe: 7,
      p_pain_location: "knee",
      p_pain_side: "left",
      p_feedback_text: null,
    });
  });

  it("returns 400 for v2 body without complete outcome", async () => {
    const response = await POST(
      makePostRequest({
        contractVersion: 2,
        weekNumber: 2,
        dayNumber: 3,
        feedbackText: null,
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.error).toBe("Validation failed");
    expect(json.issues).toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 400 for impossible v2 calendar date before RPC", async () => {
    const response = await POST(
      makePostRequest({
        contractVersion: 2,
        weekNumber: 2,
        dayNumber: 3,
        feedbackText: null,
        outcome: {
          ...V2_OUTCOME,
          sessionDate: "2026-02-31",
        },
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.error).toBe("Validation failed");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps DB rate limit errors to 429 with Retry-After", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PT429", hint: "123", message: "sensitive detail" },
    });

    const response = await POST(
      makePostRequest({
        contractVersion: 2,
        weekNumber: 2,
        dayNumber: 3,
        feedbackText: null,
        outcome: V2_OUTCOME,
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("123");
    expect(json.error).toBe("Rate limit exceeded");
  });

  it("returns 404 for wrong plan/share ownership (no row returned)", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const response = await POST(
      makePostRequest({
        weekNumber: 1,
        dayNumber: 1,
        feedbackText: "Feedback",
      }) as Parameters<typeof POST>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });
});

describe("GET /api/athlete/[shareCode]/plans/[planId]/feedback", () => {
  it("returns 404 for invalid share code format", async () => {
    const response = await GET(
      makeGetRequest("?weekNumber=1&dayNumber=1") as Parameters<typeof GET>[0],
      routeContext("abc123"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.error).toBe("Not found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid query", async () => {
    const response = await GET(
      makeGetRequest("?weekNumber=foo&dayNumber=1") as Parameters<
        typeof GET
      >[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.error).toBe("Validation failed");
    expect(json.issues).toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 200 with row for success", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [FEEDBACK_ROW],
      error: null,
    });

    const response = await GET(
      makeGetRequest("?weekNumber=2&dayNumber=3") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(json.data.id).toBe(FEEDBACK_ROW.id);
    expect(mockRpc).toHaveBeenCalledWith(
      "get_plan_session_feedback_by_share_code",
      {
        p_code: "ABC234",
        p_plan_id: PLAN_ID,
        p_week_number: 2,
        p_day_number: 3,
      },
    );
  });

  it("returns 200 with v2 row and calls v2 RPC when contractVersion=2", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [V2_RPC_ROW_WITH_EXTRA_FIELDS],
      error: null,
    });

    const response = await GET(
      makeGetRequest(
        "?weekNumber=2&dayNumber=3&contractVersion=2",
      ) as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.session_status).toBe("completed");
    expect(json.data.athlete_id).toBeUndefined();
    expect(json.data.coach_id).toBeUndefined();
    expect(json.data.share_code).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith(
      "get_plan_session_feedback_by_share_code_v2",
      {
        p_code: "ABC234",
        p_plan_id: PLAN_ID,
        p_week_number: 2,
        p_day_number: 3,
      },
    );
  });

  it("returns 200 with data:null when feedback row does not exist", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const response = await GET(
      makeGetRequest("?weekNumber=2&dayNumber=3") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toBeNull();
  });
});
