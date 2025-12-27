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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_attacks: {
        Row: {
          attack_id: string | null
          attack_type: string
          auto_blocked: boolean
          blocked_at: string
          blocked_by: string | null
          id: string
          reason: string | null
          severity: string
          source_ip: string
        }
        Insert: {
          attack_id?: string | null
          attack_type: string
          auto_blocked?: boolean
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          reason?: string | null
          severity?: string
          source_ip: string
        }
        Update: {
          attack_id?: string | null
          attack_type?: string
          auto_blocked?: boolean
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          reason?: string | null
          severity?: string
          source_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_attacks_attack_id_fkey"
            columns: ["attack_id"]
            isOneToOne: false
            referencedRelation: "live_attacks"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_entities: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          id: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          assigned_to: string | null
          attack_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          resolved_at: string | null
          severity: string
          source_ip: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attack_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          source_ip?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attack_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          source_ip?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_attacks: {
        Row: {
          attack_type: string
          confidence: number | null
          description: string | null
          detected_at: string
          id: string
          severity: string
          source_country: string | null
          source_ip: string
          source_lat: number | null
          source_lng: number | null
          target_country: string | null
          target_ip: string | null
          target_lat: number | null
          target_lng: number | null
        }
        Insert: {
          attack_type: string
          confidence?: number | null
          description?: string | null
          detected_at?: string
          id?: string
          severity?: string
          source_country?: string | null
          source_ip: string
          source_lat?: number | null
          source_lng?: number | null
          target_country?: string | null
          target_ip?: string | null
          target_lat?: number | null
          target_lng?: number | null
        }
        Update: {
          attack_type?: string
          confidence?: number | null
          description?: string | null
          detected_at?: string
          id?: string
          severity?: string
          source_country?: string | null
          source_ip?: string
          source_lat?: number | null
          source_lng?: number | null
          target_country?: string | null
          target_ip?: string | null
          target_lat?: number | null
          target_lng?: number | null
        }
        Relationships: []
      }
      monitoring_status: {
        Row: {
          id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      realtime_logs: {
        Row: {
          created_at: string
          id: string
          log_type: string | null
          raw_log: Json
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          log_type?: string | null
          raw_log: Json
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          log_type?: string | null
          raw_log?: Json
          source?: string | null
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          result: Json | null
          scan_type: string
          severity: string | null
          status: string
          target: string
          threats_found: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          result?: Json | null
          scan_type: string
          severity?: string | null
          status?: string
          target: string
          threats_found?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          result?: Json | null
          scan_type?: string
          severity?: string | null
          status?: string
          target?: string
          threats_found?: number | null
        }
        Relationships: []
      }
      threats: {
        Row: {
          attack_type: string | null
          confidence: number | null
          country: string | null
          detected_at: string
          domain: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          raw_data: Json | null
          severity: string
          source_type: string
        }
        Insert: {
          attack_type?: string | null
          confidence?: number | null
          country?: string | null
          detected_at?: string
          domain?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          raw_data?: Json | null
          severity?: string
          source_type: string
        }
        Update: {
          attack_type?: string | null
          confidence?: number | null
          country?: string | null
          detected_at?: string
          domain?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          raw_data?: Json | null
          severity?: string
          source_type?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
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
      app_role: ["admin", "analyst", "viewer"],
    },
  },
} as const
