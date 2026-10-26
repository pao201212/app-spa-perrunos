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
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          tenant_id: string;
          user_id: string | null;
          whatsapp: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      extras: {
        Row: {
          extra_minutes: number;
          id: string;
          is_active: boolean;
          name: string;
          service_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          extra_minutes?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          service_id: string;
          tenant_id: string;
        };
        Update: {
          extra_minutes?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          service_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extras_tenant_id_service_id_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
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
      location_extra_prices: {
        Row: {
          coat: Database["public"]["Enums"]["coat_type"];
          extra_id: string;
          location_id: string;
          price_cop: number;
          size: Database["public"]["Enums"]["pet_size"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          coat: Database["public"]["Enums"]["coat_type"];
          extra_id: string;
          location_id: string;
          price_cop: number;
          size: Database["public"]["Enums"]["pet_size"];
          tenant_id: string;
        };
        Update: {
          coat?: Database["public"]["Enums"]["coat_type"];
          extra_id?: string;
          location_id?: string;
          price_cop?: number;
          size?: Database["public"]["Enums"]["pet_size"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_extra_prices_tenant_id_extra_id_fkey";
            columns: ["tenant_id", "extra_id"];
            isOneToOne: false;
            referencedRelation: "extras";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "location_extra_prices_tenant_id_location_id_fkey";
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
      location_service_prices: {
        Row: {
          coat: Database["public"]["Enums"]["coat_type"];
          location_id: string;
          price_cop: number;
          service_id: string;
          size: Database["public"]["Enums"]["pet_size"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          coat: Database["public"]["Enums"]["coat_type"];
          location_id: string;
          price_cop: number;
          service_id: string;
          size: Database["public"]["Enums"]["pet_size"];
          tenant_id: string;
        };
        Update: {
          coat?: Database["public"]["Enums"]["coat_type"];
          location_id?: string;
          price_cop?: number;
          service_id?: string;
          size?: Database["public"]["Enums"]["pet_size"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_service_prices_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "location_service_prices_tenant_id_service_id_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
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
      pet_group_members: {
        Row: {
          group_id: string;
          pet_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          pet_id: string;
          tenant_id: string;
        };
        Update: {
          group_id?: string;
          pet_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_group_members_tenant_id_group_id_fkey";
            columns: ["tenant_id", "group_id"];
            isOneToOne: false;
            referencedRelation: "pet_groups";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "pet_group_members_tenant_id_pet_id_fkey";
            columns: ["tenant_id", "pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      pet_groups: {
        Row: {
          created_at: string;
          customer_id: string;
          id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          customer_id: string;
          id?: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_groups_tenant_id_customer_id_fkey";
            columns: ["tenant_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      pets: {
        Row: {
          breed_id: string;
          coat: Database["public"]["Enums"]["coat_type"];
          created_at: string;
          customer_id: string;
          gender: Database["public"]["Enums"]["pet_gender"] | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          photo_path: string | null;
          size: Database["public"]["Enums"]["pet_size"];
          size_locked: boolean;
          species: Database["public"]["Enums"]["pet_species"];
          tenant_id: string;
          weight_kg: number | null;
        };
        ComputedFields: never;
        Insert: {
          breed_id: string;
          coat?: Database["public"]["Enums"]["coat_type"];
          created_at?: string;
          customer_id: string;
          gender?: Database["public"]["Enums"]["pet_gender"] | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          photo_path?: string | null;
          size?: Database["public"]["Enums"]["pet_size"];
          size_locked?: boolean;
          species: Database["public"]["Enums"]["pet_species"];
          tenant_id: string;
          weight_kg?: number | null;
        };
        Update: {
          breed_id?: string;
          coat?: Database["public"]["Enums"]["coat_type"];
          created_at?: string;
          customer_id?: string;
          gender?: Database["public"]["Enums"]["pet_gender"] | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          photo_path?: string | null;
          size?: Database["public"]["Enums"]["pet_size"];
          size_locked?: boolean;
          species?: Database["public"]["Enums"]["pet_species"];
          tenant_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pets_tenant_id_breed_id_fkey";
            columns: ["tenant_id", "breed_id"];
            isOneToOne: false;
            referencedRelation: "tenant_breeds";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "pets_tenant_id_customer_id_fkey";
            columns: ["tenant_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["tenant_id", "id"];
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
      service_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          tenant_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_durations: {
        Row: {
          bath_min: number | null;
          coat: Database["public"]["Enums"]["coat_type"];
          cut_min: number | null;
          dry_min: number | null;
          finish_min: number | null;
          service_id: string;
          size: Database["public"]["Enums"]["pet_size"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          bath_min?: number | null;
          coat: Database["public"]["Enums"]["coat_type"];
          cut_min?: number | null;
          dry_min?: number | null;
          finish_min?: number | null;
          service_id: string;
          size: Database["public"]["Enums"]["pet_size"];
          tenant_id: string;
        };
        Update: {
          bath_min?: number | null;
          coat?: Database["public"]["Enums"]["coat_type"];
          cut_min?: number | null;
          dry_min?: number | null;
          finish_min?: number | null;
          service_id?: string;
          size?: Database["public"]["Enums"]["pet_size"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_durations_tenant_id_service_id_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      services: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["service_kind"];
          name: string;
          sort_order: number;
          species: Database["public"]["Enums"]["service_species"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["service_kind"];
          name: string;
          sort_order?: number;
          species?: Database["public"]["Enums"]["service_species"];
          tenant_id: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["service_kind"];
          name?: string;
          sort_order?: number;
          species?: Database["public"]["Enums"]["service_species"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_category_id_fkey";
            columns: ["tenant_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "services_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
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
      staff: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_absences: {
        Row: {
          ends_at: string;
          id: string;
          reason: string | null;
          staff_id: string;
          starts_at: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          reason?: string | null;
          staff_id: string;
          starts_at: string;
          tenant_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          reason?: string | null;
          staff_id?: string;
          starts_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_absences_tenant_id_staff_id_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      staff_shifts: {
        Row: {
          ends_at: string;
          id: string;
          location_id: string;
          staff_id: string;
          starts_at: string;
          tenant_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          location_id: string;
          staff_id: string;
          starts_at: string;
          tenant_id: string;
          weekday: number;
        };
        Update: {
          ends_at?: string;
          id?: string;
          location_id?: string;
          staff_id?: string;
          starts_at?: string;
          tenant_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "staff_shifts_tenant_id_location_id_fkey";
            columns: ["tenant_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "staff_shifts_tenant_id_staff_id_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      staff_skills: {
        Row: {
          skill: Database["public"]["Enums"]["staff_skill"];
          staff_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          skill: Database["public"]["Enums"]["staff_skill"];
          staff_id: string;
          tenant_id: string;
        };
        Update: {
          skill?: Database["public"]["Enums"]["staff_skill"];
          staff_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_skills_tenant_id_staff_id_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["tenant_id", "id"];
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
      claim_customer_profile: { Args: { p_tenant_id: string }; Returns: string };
      create_pet_group: { Args: { p_customer_id: string; p_pet_ids: string[] }; Returns: string };
      ensure_customer_profile: {
        Args: { p_full_name: string; p_tenant_id: string; p_whatsapp: string };
        Returns: string;
      };
      replace_service_durations: {
        Args: { p_rows: Json; p_service_id: string };
        Returns: undefined;
      };
      reset_tenant_breed: { Args: { p_breed_id: string }; Returns: undefined };
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
      pet_gender: "female" | "male";
      pet_size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
      pet_species: "dog" | "cat";
      service_kind: "bath" | "special_cut" | "other";
      service_species: "dog" | "cat" | "both";
      staff_skill: "bath" | "dry" | "finish" | "special_cut";
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
      pet_gender: ["female", "male"],
      pet_size: ["XS", "S", "M", "L", "XL", "XXL"],
      pet_species: ["dog", "cat"],
      service_kind: ["bath", "special_cut", "other"],
      service_species: ["dog", "cat", "both"],
      staff_skill: ["bath", "dry", "finish", "special_cut"],
      station_type: ["bath", "dry", "finish"],
    },
  },
} as const;
