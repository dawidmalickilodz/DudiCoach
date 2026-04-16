// Auto-generated from Supabase schema. Do not edit by hand.
// Regenerate via `npx supabase gen types typescript --project-id qpsgpfnqlbbrvawjeeaj` or the Supabase MCP tool.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          age: number | null
          coach_id: string
          created_at: string
          current_phase: string | null
          goal: string | null
          height_cm: number | null
          id: string
          name: string
          notes: string | null
          session_minutes: number | null
          share_active: boolean
          share_code: string
          sport: string | null
          training_days_per_week: number | null
          training_start_date: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          coach_id: string
          created_at?: string
          current_phase?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          name: string
          notes?: string | null
          session_minutes?: number | null
          share_active?: boolean
          share_code?: string
          sport?: string | null
          training_days_per_week?: number | null
          training_start_date?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          coach_id?: string
          created_at?: string
          current_phase?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          name?: string
          notes?: string | null
          session_minutes?: number | null
          share_active?: boolean
          share_code?: string
          sport?: string | null
          training_days_per_week?: number | null
          training_start_date?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      injuries: {
        Row: {
          athlete_id: string
          body_location: string
          created_at: string
          id: string
          injury_date: string
          name: string
          notes: string | null
          severity: number
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          body_location: string
          created_at?: string
          id?: string
          injury_date?: string
          name: string
          notes?: string | null
          severity: number
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          body_location?: string
          created_at?: string
          id?: string
          injury_date?: string
          name?: string
          notes?: string | null
          severity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          phase: string | null
          plan_json: Json
          plan_name: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          phase?: string | null
          plan_json: Json
          plan_name: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          phase?: string | null
          plan_json?: Json
          plan_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_share_code: { Args: never; Returns: string }
      get_active_injuries_by_share_code: {
        Args: { p_code: string }
        Returns: {
          athlete_id: string
          body_location: string
          created_at: string
          id: string
          injury_date: string
          name: string
          notes: string | null
          severity: number
          status: string
          updated_at: string
        }[]
      }
      get_athlete_by_share_code: {
        Args: { p_code: string }
        Returns: {
          id: string
          name: string
          age: number | null
          weight_kg: number | null
          height_cm: number | null
          sport: string | null
          training_start_date: string | null
          training_days_per_week: number | null
          session_minutes: number | null
          current_phase: string | null
          goal: string | null
          notes: string | null
          share_code: string
          updated_at: string
        }[]
      }
      reset_share_code: {
        Args: { p_athlete_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
