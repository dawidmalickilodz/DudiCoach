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
      plan_generation_jobs: {
        Row: {
          athlete_id: string
          attempt_count: number
          claim_expires_at: string | null
          claim_token: string | null
          claimed_at: string | null
          coach_id: string
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          max_attempts: number
          max_tokens: number
          model: string
          plan_id: string | null
          prompt_inputs: Json
          status: Database["public"]["Enums"]["plan_generation_job_status"]
          updated_at: string
        }
        Insert: {
          athlete_id: string
          attempt_count?: number
          claim_expires_at?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          coach_id: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number
          max_tokens: number
          model: string
          plan_id?: string | null
          prompt_inputs: Json
          status?: Database["public"]["Enums"]["plan_generation_job_status"]
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          attempt_count?: number
          claim_expires_at?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          coach_id?: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number
          max_tokens?: number
          model?: string
          plan_id?: string | null
          prompt_inputs?: Json
          status?: Database["public"]["Enums"]["plan_generation_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_generation_jobs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_generation_jobs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_test_results: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          test_date: string
          test_key: string
          value: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          notes?: string | null
          test_date?: string
          test_key: string
          value: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          test_date?: string
          test_key?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fitness_test_results_athlete_id_fkey"
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
      claim_pending_plan_generation_job: {
        Args: { p_lock_seconds?: number }
        Returns: {
          id: string
          athlete_id: string
          coach_id: string
          claim_token: string
          prompt_inputs: Json
          model: string
          max_tokens: number
          attempt_count: number
          max_attempts: number
        }[]
      }
      complete_plan_generation_job: {
        Args: {
          p_job_id: string
          p_claim_token: string
          p_plan_name: string
          p_phase: string
          p_plan_json: Json
        }
        Returns: {
          job_id: string
          plan_id: string
          status: Database["public"]["Enums"]["plan_generation_job_status"]
        }[]
      }
      fail_plan_generation_job: {
        Args: {
          p_job_id: string
          p_claim_token: string
          p_error_code: string
          p_error_message: string
          p_retryable?: boolean
        }
        Returns: {
          job_id: string
          status: Database["public"]["Enums"]["plan_generation_job_status"]
          attempt_count: number
          max_attempts: number
        }[]
      }
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
      get_latest_plan_by_share_code: {
        Args: { p_code: string }
        Returns: {
          id: string
          plan_name: string
          phase: string | null
          plan_json: Json
          created_at: string
        }[]
      }
      reset_share_code: {
        Args: { p_athlete_id: string }
        Returns: string
      }
    }
    Enums: {
      plan_generation_job_status:
        | "queued"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
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
    Enums: {
      plan_generation_job_status: [
        "queued",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
