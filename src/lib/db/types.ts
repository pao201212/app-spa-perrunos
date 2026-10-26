export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      global_breeds: {
        Row: {
          created_at: string;
          default_coat: Database["public"]["Enums"]["coat_type"];
          default_size: Database["public"]["Enums"]["pet_size"];
          id: string;
          is_mixed: boolean;
          name: string;
          species: Database["public"]["Enums"]["pet_species"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_coat: Database["public"]["Enums"]["coat_type"];
          default_size: Database["public"]["Enums"]["pet_size"];
          id?: string;
          is_mixed?: boolean;
          name: string;
          species: Database["public"]["Enums"]["pet_species"];
        };
        Update: {
          created_at?: string;
          default_coat?: Database["public"]["Enums"]["coat_type"];
          default_size?: Database["public"]["Enums"]["pet_size"];
          id?: string;
          is_mixed?: boolean;
          name?: string;
          species?: Database["public"]["Enums"]["pet_species"];
        };
        Relationships: [];
      };
      location_closures: {
        Row: {
          date: string;
          id: string;
          location_id: string;
          reason: string | null;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          date: string;
          id?: string;
          location_id: string;
          reason?: string | null;
          tenant_id: string;
        };
        Update: {
          date?: string;
          id?: string;
          location_id?: string;
          reason?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_closures_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      location_hours: {
        Row: {
          closes_at: string;
          id: string;
          location_id: string;
          opens_at: string;
          tenant_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          closes_at: string;
          id?: string;
          location_id: string;
          opens_at: string;
          tenant_id: string;
          weekday: number;
        };
        Update: {
          closes_at?: string;
          id?: string;
          location_id?: string;
          opens_at?: string;
          tenant_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "location_hours_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      location_stations: {
        Row: {
          count: number;
          location_id: string;
          station: Database["public"]["Enums"]["station_type"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          count: number;
          location_id: string;
          station: Database["public"]["Enums"]["station_type"];
          tenant_id: string;
        };
        Update: {
          count?: number;
          location_id?: string;
          station?: Database["public"]["Enums"]["station_type"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_stations_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          bather_continues_drying: boolean;
          cancel_window_hours: number;
          capacity_mode: Database["public"]["Enums"]["capacity_mode"];
          confirmation_mode: Database["public"]["Enums"]["confirmation_mode"];
          created_at: string;
          id: string;
          is_active: boolean;
          max_days_ahead: number;
          name: string;
          slot_step_min: number;
          tenant_id: string;
          whatsapp: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          bather_continues_drying?: boolean;
          cancel_window_hours?: number;
          capacity_mode?: Database["public"]["Enums"]["capacity_mode"];
          confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_days_ahead?: number;
          name: string;
          slot_step_min?: number;
          tenant_id: string;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          bather_continues_drying?: boolean;
          cancel_window_hours?: number;
          capacity_mode?: Database["public"]["Enums"]["capacity_mode"];
          confirmation_mode?: Database["public"]["Enums"]["confirmation_mode"];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_days_ahead?: number;
          name?: string;
          slot_step_min?: number;
          tenant_id?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["membership_role"];
          tenant_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      size_thresholds: {
        Row: {
          max_kg: number;
          size: Database["public"]["Enums"]["pet_size"];
          species: Database["public"]["Enums"]["pet_species"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          max_kg: number;
          size: Database["public"]["Enums"]["pet_size"];
          species: Database["public"]["Enums"]["pet_species"];
          tenant_id: string;
        };
        Update: {
          max_kg?: number;
          size?: Database["public"]["Enums"]["pet_size"];
          species?: Database["public"]["Enums"]["pet_species"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "size_thresholds_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_breeds: {
        Row: {
          coat: Database["public"]["Enums"]["coat_type"];
          created_at: string;
          global_breed_id: string | null;
          id: string;
          is_active: boolean;
          is_customized: boolean;
          is_mixed: boolean;
          name: string;
          size: Database["public"]["Enums"]["pet_size"];
          species: Database["public"]["Enums"]["pet_species"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          coat: Database["public"]["Enums"]["coat_type"];
          created_at?: string;
          global_breed_id?: string | null;
          id?: string;
          is_active?: boolean;
          is_customized?: boolean;
          is_mixed?: boolean;
          name: string;
          size: Database["public"]["Enums"]["pet_size"];
          species: Database["public"]["Enums"]["pet_species"];
          tenant_id: string;
        };
        Update: {
          coat?: Database["public"]["Enums"]["coat_type"];
          created_at?: string;
          global_breed_id?: string | null;
          id?: string;
          is_active?: boolean;
          is_customized?: boolean;
          is_mixed?: boolean;
          name?: string;
          size?: Database["public"]["Enums"]["pet_size"];
          species?: Database["public"]["Enums"]["pet_species"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_breeds_global_breed_id_fkey";
            columns: ["global_breed_id"];
            isOneToOne: false;
            referencedRelation: "global_breeds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_breeds_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_invites: {
        Row: {
          created_at: string;
          email: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["membership_role"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["membership_role"];
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["membership_role"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          timezone?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          timezone?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_location_settings: {
        Args: { p_sections: string[]; p_source_location_id: string };
        Returns: number;
      };
      assign_tenant_admin: { Args: { p_email: string; p_tenant_id: string }; Returns: string };
      resolve_pet_size: {
        Args: { p_breed_id: string; p_weight_kg?: number };
        Returns: Database["public"]["Enums"]["pet_size"];
      };
      tenant_staff: {
        Args: { p_tenant_id: string };
        Returns: {
          email: string;
          role: Database["public"]["Enums"]["membership_role"];
          status: string;
        }[];
      };
    };
    Enums: {
      capacity_mode: "detailed" | "daily_quota";
      coat_type: "short" | "medium" | "long";
      confirmation_mode: "auto" | "manual";
      membership_role: "owner" | "admin" | "reception";
      pet_size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
      pet_species: "dog" | "cat";
      station_type: "bath" | "dry" | "finish";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      capacity_mode: ["detailed", "daily_quota"],
      coat_type: ["short", "medium", "long"],
      confirmation_mode: ["auto", "manual"],
      membership_role: ["owner", "admin", "reception"],
      pet_size: ["XS", "S", "M", "L", "XL", "XXL"],
      pet_species: ["dog", "cat"],
      station_type: ["bath", "dry", "finish"],
    },
  },
} as const;
