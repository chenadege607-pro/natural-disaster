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
      alerts: {
        Row: {
          body: string
          confidence_pct: number
          expected_onset_at: string | null
          expected_peak_at: string | null
          expires_at: string | null
          hazard: string
          id: string
          is_active: boolean
          issued_at: string
          locality_id: string | null
          region_slug: string
          severity: string
          title: string
        }
        Insert: {
          body: string
          confidence_pct?: number
          expected_onset_at?: string | null
          expected_peak_at?: string | null
          expires_at?: string | null
          hazard: string
          id?: string
          is_active?: boolean
          issued_at?: string
          locality_id?: string | null
          region_slug: string
          severity: string
          title: string
        }
        Update: {
          body?: string
          confidence_pct?: number
          expected_onset_at?: string | null
          expected_peak_at?: string | null
          expires_at?: string | null
          hazard?: string
          id?: string
          is_active?: boolean
          issued_at?: string
          locality_id?: string | null
          region_slug?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          description: string
          hazard: string
          id: string
          locality: string | null
          locality_id: string | null
          photo_url: string | null
          region_slug: string
          reporter_name: string | null
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          hazard: string
          id?: string
          locality?: string | null
          locality_id?: string | null
          photo_url?: string | null
          region_slug: string
          reporter_name?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          hazard?: string
          id?: string
          locality?: string | null
          locality_id?: string | null
          photo_url?: string | null
          region_slug?: string
          reporter_name?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      disaster_events: {
        Row: {
          description: string
          hazard: string
          id: string
          occurred_on: string
          people_affected: number
          region_slug: string
          severity: string
        }
        Insert: {
          description: string
          hazard: string
          id?: string
          occurred_on: string
          people_affected?: number
          region_slug: string
          severity: string
        }
        Update: {
          description?: string
          hazard?: string
          id?: string
          occurred_on?: string
          people_affected?: number
          region_slug?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "disaster_events_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      environmental_readings: {
        Row: {
          id: string
          rainfall_mm: number
          recorded_on: string
          region_slug: string
          river_level_m: number
          soil_saturation_pct: number
        }
        Insert: {
          id?: string
          rainfall_mm: number
          recorded_on: string
          region_slug: string
          river_level_m: number
          soil_saturation_pct: number
        }
        Update: {
          id?: string
          rainfall_mm?: number
          recorded_on?: string
          region_slug?: string
          river_level_m?: number
          soil_saturation_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "environmental_readings_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      localities: {
        Row: {
          created_at: string
          elevation_m: number
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          population: number
          region_slug: string
          slope_index: number
          slug: string
          terrain_note: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          elevation_m?: number
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          population?: number
          region_slug: string
          slope_index?: number
          slug: string
          terrain_note?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          elevation_m?: number
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          population?: number
          region_slug?: string
          slope_index?: number
          slug?: string
          terrain_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "localities_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      locality_forecasts: {
        Row: {
          confidence_pct: number
          fetched_at: string | null
          flood_level: string
          landslide_level: string
          lead_hazard: string
          locality_id: string
          onset_end: string
          onset_start: string
          peak_at: string | null
          rainfall_mm_24h: number
          rainfall_mm_72h: number | null
          river_discharge: number | null
          soil_saturation_pct: number
          source: string
          summary: string
          updated_at: string
        }
        Insert: {
          confidence_pct?: number
          fetched_at?: string | null
          flood_level?: string
          landslide_level?: string
          lead_hazard?: string
          locality_id: string
          onset_end?: string
          onset_start?: string
          peak_at?: string | null
          rainfall_mm_24h?: number
          rainfall_mm_72h?: number | null
          river_discharge?: number | null
          soil_saturation_pct?: number
          source?: string
          summary?: string
          updated_at?: string
        }
        Update: {
          confidence_pct?: number
          fetched_at?: string | null
          flood_level?: string
          landslide_level?: string
          lead_hazard?: string
          locality_id?: string
          onset_end?: string
          onset_start?: string
          peak_at?: string | null
          rainfall_mm_24h?: number
          rainfall_mm_72h?: number | null
          river_discharge?: number | null
          soil_saturation_pct?: number
          source?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locality_forecasts_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: true
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          locality_id: string | null
          phone: string | null
          region_slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          locality_id?: string | null
          phone?: string | null
          region_slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          locality_id?: string | null
          phone?: string | null
          region_slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      region_risk: {
        Row: {
          flood_level: string
          forecast_summary: string
          landslide_level: string
          rainfall_mm_7d: number
          region_slug: string
          river_level_m: number
          soil_saturation_pct: number
          updated_at: string
        }
        Insert: {
          flood_level: string
          forecast_summary: string
          landslide_level: string
          rainfall_mm_7d: number
          region_slug: string
          river_level_m: number
          soil_saturation_pct: number
          updated_at?: string
        }
        Update: {
          flood_level?: string
          forecast_summary?: string
          landslide_level?: string
          rainfall_mm_7d?: number
          region_slug?: string
          river_level_m?: number
          soil_saturation_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_risk_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: true
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      regions: {
        Row: {
          area_km2: number
          capital: string
          created_at: string
          name: string
          population: number
          slug: string
          terrain: string
        }
        Insert: {
          area_km2: number
          capital: string
          created_at?: string
          name: string
          population: number
          slug: string
          terrain: string
        }
        Update: {
          area_km2?: number
          capital?: string
          created_at?: string
          name?: string
          population?: number
          slug?: string
          terrain?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          locality_id: string | null
          phone: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          locality_id?: string | null
          phone: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          locality_id?: string | null
          phone?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_subscriptions: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          locality_id: string | null
          min_severity: string
          phone: string
          region_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          locality_id?: string | null
          min_severity?: string
          phone: string
          region_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          locality_id?: string | null
          min_severity?: string
          phone?: string
          region_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_subscriptions_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_subscriptions_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "official" | "citizen"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "official", "citizen"],
    },
  },
} as const
