"use client";

/**
 * Custom hook for subscribing to real-time athlete updates via Supabase Realtime.
 *
 * Connects to broadcast channel `athlete:{shareCode}` and listens for
 * `athlete_updated` events broadcast by the PATCH /api/athletes/[id] handler.
 *
 * On reconnect, re-fetches latest data from /api/athlete/[shareCode] to catch
 * any updates missed during disconnection.
 *
 * See: docs/design/US-004-design.md §7
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { AthletePublic } from "@/lib/types/athlete-public";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface UseRealtimeAthleteOptions {
  shareCode: string;
  initialData: AthletePublic;
  onInjuriesChanged?: () => void;
}

interface UseRealtimeAthleteReturn {
  athlete: AthletePublic;
  connectionStatus: ConnectionStatus;
}

export function useRealtimeAthlete({
  shareCode,
  initialData,
  onInjuriesChanged,
}: UseRealtimeAthleteOptions): UseRealtimeAthleteReturn {
  const [athlete, setAthlete] = useState<AthletePublic>(initialData);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const supabase = useMemo(() => createClient(), []);
  const onInjuriesChangedRef = useRef(onInjuriesChanged);

  useEffect(() => {
    onInjuriesChangedRef.current = onInjuriesChanged;
  }, [onInjuriesChanged]);

  // Subscribe to broadcast channel
  useEffect(() => {
    const channel = supabase.channel(`athlete:${shareCode}`);

    channel
      .on("broadcast", { event: "athlete_updated" }, (payload) => {
        setAthlete(payload.payload as AthletePublic);
      })
      .on("broadcast", { event: "injuries_changed" }, () => {
        onInjuriesChangedRef.current?.();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          onInjuriesChangedRef.current?.();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("disconnected");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [shareCode, supabase]);

  // Re-fetch on reconnect to catch missed updates during disconnection
  useEffect(() => {
    if (connectionStatus === "connected") {
      fetch(`/api/athlete/${shareCode}`)
        .then((res) => res.json())
        .then((json: { data?: AthletePublic }) => {
          if (json.data) setAthlete(json.data);
        })
        .catch(() => {
          // Silent fail — we already have data from initial load; reconnect will retry
        });
    }
  }, [connectionStatus, shareCode]);

  return { athlete, connectionStatus };
}
