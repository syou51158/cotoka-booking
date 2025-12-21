export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      attendance_records: {
        Row: {
          break_minutes: number | null;
          clock_in_at: string;
          clock_out_at: string | null;
          created_at: string;
          date: string;
          id: string;
          staff_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          updated_at: string;
          last_break_start_at: string | null;
        };
        Insert: {
          break_minutes?: number | null;
          clock_in_at: string;
          clock_out_at?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          staff_id: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          updated_at?: string;
          last_break_start_at?: string | null;
        };
        Update: {
          break_minutes?: number | null;
          clock_in_at?: string;
          clock_out_at?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          staff_id?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          updated_at?: string;
          last_break_start_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      },
      appointments: {
        Row: {
          appointment_date: string;
          appointment_id: number;
          appointment_type: string;
          confirmation_sent_at: string | null;
          created_at: string;
          customer_id: number;
          end_time: string;
          is_confirmed: boolean | null;
          notes: string | null;
          reminder_sent_at: string | null;
          salon_id: number;
          service_id: number;
          staff_id: number;
          start_time: string;
          status: string | null;
          task_description: string | null;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          appointment_date: string;
          appointment_id?: number;
          appointment_type?: string;
          confirmation_sent_at?: string | null;
          created_at?: string;
          customer_id: number;
          end_time: string;
          is_confirmed?: boolean | null;
          notes?: string | null;
          reminder_sent_at?: string | null;
          salon_id: number;
          service_id: number;
          staff_id: number;
          start_time: string;
          status?: string | null;
          task_description?: string | null;
          tenant_id: number;
          updated_at?: string;
        };
        Update: {
          appointment_date?: string;
          appointment_id?: number;
          appointment_type?: string;
          confirmation_sent_at?: string | null;
          created_at?: string;
          customer_id?: number;
          end_time?: string;
          is_confirmed?: boolean | null;
          notes?: string | null;
          reminder_sent_at?: string | null;
          salon_id?: number;
          service_id?: number;
          staff_id?: number;
          start_time?: string;
          status?: string | null;
          task_description?: string | null;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "appointments_salon_id_fkey";
            columns: ["salon_id"];
            isOneToOne: false;
            referencedRelation: "salons";
            referencedColumns: ["salon_id"];
          },
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services_legacy";
            referencedColumns: ["service_id"];
          },
          {
            foreignKeyName: "appointments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_legacy";
            referencedColumns: ["staff_id"];
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      coupons: {
        Row: {
          active: boolean;
          amount_off_jpy: number | null;
          code: string;
          id: string;
          percent_off: number | null;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          active?: boolean;
          amount_off_jpy?: number | null;
          code: string;
          id?: string;
          percent_off?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          active?: boolean;
          amount_off_jpy?: number | null;
          code?: string;
          id?: string;
          percent_off?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          address: string | null;
          created_at: string;
          customer_id: number;
          date_of_birth: string | null;
          email: string | null;
          first_name: string;
          gender: string | null;
          last_name: string;
          last_visit_date: string | null;
          notes: string | null;
          phone: string | null;
          salon_id: number;
          status: string;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          customer_id?: number;
          date_of_birth?: string | null;
          email?: string | null;
          first_name: string;
          gender?: string | null;
          last_name: string;
          last_visit_date?: string | null;
          notes?: string | null;
          phone?: string | null;
          salon_id: number;
          status?: string;
          tenant_id: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          customer_id?: number;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string;
          gender?: string | null;
          last_name?: string;
          last_visit_date?: string | null;
          notes?: string | null;
          phone?: string | null;
          salon_id?: number;
          status?: string;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_salon_id_fkey";
            columns: ["salon_id"];
            isOneToOne: false;
            referencedRelation: "salons";
            referencedColumns: ["salon_id"];
          },
          {
            foreignKeyName: "customers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      date_overrides: {
        Row: {
          close_at: string | null;
          date: string;
          id: string;
          is_open: boolean;
          note: string | null;
          open_at: string | null;
        };
        Insert: {
          close_at?: string | null;
          date: string;
          id?: string;
          is_open?: boolean;
          note?: string | null;
          open_at?: string | null;
        };
        Update: {
          close_at?: string | null;
          date?: string;
          id?: string;
          is_open?: boolean;
          note?: string | null;
          open_at?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          created_at: string;
          id: number;
          payload: Json;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          payload: Json;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          payload?: Json;
          type?: string;
        };
        Relationships: [];
      };
      login_attempts: {
        Row: {
          attempt_time: string;
          id: number;
          identifier: string;
          ip_address: string;
        };
        Insert: {
          attempt_time?: string;
          id?: number;
          identifier: string;
          ip_address: string;
        };
        Update: {
          attempt_time?: string;
          id?: number;
          identifier?: string;
          ip_address?: string;
        };
        Relationships: [];
      };
      opening_hours: {
        Row: {
          close_at: string;
          id: string;
          is_open: boolean;
          open_at: string;
          weekday: number;
        };
        Insert: {
          close_at: string;
          id?: string;
          is_open?: boolean;
          open_at: string;
          weekday: number;
        };
        Update: {
          close_at?: string;
          id?: string;
          is_open?: boolean;
          open_at?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      remember_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          id: number;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: number;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: number;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reservation_notifications: {
        Row: {
          id: number;
          kind: string;
          reservation_id: string;
          scheduled_at: string | null;
          sent_at: string | null;
        };
        Insert: {
          id?: number;
          kind: string;
          reservation_id: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
        };
        Update: {
          id?: number;
          kind?: string;
          reservation_id?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_notifications_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          amount_total_jpy: number;
          code: string;
          created_at: string;
          customer_email: string | null;
          customer_name: string;
          customer_phone: string | null;
          end_at: string;
          id: string;
          locale: string | null;
          notes: string | null;
          paid_amount_jpy: number;
          payment_collected_at: string | null;
          payment_method: string | null;
          payment_option: string | null;
          pending_expires_at: string | null;
          last_magic_link_jti: string | null;
          email_verified_at: string | null;
          room_id: string | null;
          service_id: string;
          staff_id: string | null;
          start_at: string;
          status: Database["public"]["Enums"]["reservation_status"];
          stripe_checkout_session: string | null;
          stripe_payment_intent: string | null;
          updated_at: string;
        };
        Insert: {
          amount_total_jpy: number;
          code: string;
          created_at?: string;
          customer_email?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          end_at: string;
          id?: string;
          locale?: string | null;
          notes?: string | null;
          paid_amount_jpy?: number;
          payment_collected_at?: string | null;
          payment_method?: string | null;
          payment_option?: string | null;
          pending_expires_at?: string | null;
          last_magic_link_jti?: string | null;
          email_verified_at?: string | null;
          room_id?: string | null;
          service_id: string;
          staff_id?: string | null;
          start_at: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          stripe_checkout_session?: string | null;
          stripe_payment_intent?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_total_jpy?: number;
          code?: string;
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          end_at?: string;
          id?: string;
          locale?: string | null;
          notes?: string | null;
          paid_amount_jpy?: number;
          payment_collected_at?: string | null;
          payment_method?: string | null;
          payment_option?: string | null;
          pending_expires_at?: string | null;
          last_magic_link_jti?: string | null;
          email_verified_at?: string | null;
          room_id?: string | null;
          service_id?: string;
          staff_id?: string | null;
          start_at?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          stripe_checkout_session?: string | null;
          stripe_payment_intent?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          description: string | null;
          role_id: number;
          role_name: string;
        };
        Insert: {
          description?: string | null;
          role_id?: number;
          role_name: string;
        };
        Update: {
          description?: string | null;
          role_id?: number;
          role_name?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          active: boolean;
          capacity: number;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          capacity?: number;
          id?: string;
          name: string;
        };
        Update: {
          active?: boolean;
          capacity?: number;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      salons: {
        Row: {
          address: string | null;
          business_hours: string | null;
          created_at: string;
          description: string | null;
          email: string | null;
          name: string;
          phone: string | null;
          salon_id: number;
          status: string | null;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          business_hours?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          name: string;
          phone?: string | null;
          salon_id?: number;
          status?: string | null;
          tenant_id: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          business_hours?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          name?: string;
          phone?: string | null;
          salon_id?: number;
          status?: string | null;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "salons_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      service_categories: {
        Row: {
          category_id: number;
          created_at: string;
          description: string | null;
          display_order: number | null;
          name: string;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          category_id?: number;
          created_at?: string;
          description?: string | null;
          display_order?: number | null;
          name: string;
          tenant_id: number;
          updated_at?: string;
        };
        Update: {
          category_id?: number;
          created_at?: string;
          description?: string | null;
          display_order?: number | null;
          name?: string;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          buffer_after_min: number;
          buffer_before_min: number;
          created_at: string;
          currency: string;
          description: string | null;
          duration_min: number;
          id: string;
          name: string;
          price_jpy: number;
          requires_prepayment: boolean;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          buffer_after_min?: number;
          buffer_before_min?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_min: number;
          id?: string;
          name: string;
          price_jpy: number;
          requires_prepayment?: boolean;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          buffer_after_min?: number;
          buffer_before_min?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          name?: string;
          price_jpy?: number;
          requires_prepayment?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      services_legacy: {
        Row: {
          category_id: number | null;
          color: string | null;
          created_at: string;
          description: string | null;
          duration: number;
          is_active: boolean;
          name: string;
          price: number;
          service_id: number;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          category_id?: number | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          duration: number;
          is_active?: boolean;
          name: string;
          price: number;
          service_id?: number;
          tenant_id: number;
          updated_at?: string;
        };
        Update: {
          category_id?: number | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          duration?: number;
          is_active?: boolean;
          name?: string;
          price?: number;
          service_id?: number;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_legacy_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["category_id"];
          },
          {
            foreignKeyName: "services_legacy_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          color: string | null;
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string | null;
          commission_rate: number | null;
        };
        Insert: {
          active?: boolean;
          color?: string | null;
          created_at?: string;
          display_name: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string | null;
          commission_rate?: number | null;
        };
        Update: {
          active?: boolean;
          color?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string | null;
          commission_rate?: number | null;
        };
        Relationships: [];
      };
      staff_legacy: {
        Row: {
          created_at: string;
          email: string | null;
          name: string;
          phone: string | null;
          staff_id: number;
          status: string | null;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          name: string;
          phone?: string | null;
          staff_id?: number;
          status?: string | null;
          tenant_id: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          name?: string;
          phone?: string | null;
          staff_id?: number;
          status?: string | null;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          created_at: string;
          domain: string;
          logo_image_url: string | null;
          name: string;
          owner_user_id: string;
          tenant_id: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          domain: string;
          logo_image_url?: string | null;
          name: string;
          owner_user_id: string;
          tenant_id?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          domain?: string;
          logo_image_url?: string | null;
          name?: string;
          owner_user_id?: string;
          tenant_id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      shifts: {
        Row: {
          end_at: string;
          id: string;
          note: string | null;
          staff_id: string;
          start_at: string;
        };
        Insert: {
          end_at: string;
          id?: string;
          note?: string | null;
          staff_id: string;
          start_at: string;
        };
        Update: {
          end_at?: string;
          id?: string;
          note?: string | null;
          staff_id?: string;
          start_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      treatment_rewards: {
        Row: {
          commission_rate: number;
          created_at: string;
          id: string;
          reservation_id: string;
          reward_amount_jpy: number;
          staff_id: string;
          total_sales_jpy: number;
          status: Database["public"]["Enums"]["treatment_reward_status"];
          paid_at: string | null;
          calc_source: Json | null;
          note: string | null;
        };
        Insert: {
          commission_rate: number;
          created_at?: string;
          id?: string;
          reservation_id: string;
          reward_amount_jpy: number;
          staff_id: string;
          total_sales_jpy: number;
          status?: Database["public"]["Enums"]["treatment_reward_status"];
          paid_at?: string | null;
          calc_source?: Json | null;
          note?: string | null;
        };
        Update: {
          commission_rate?: number;
          created_at?: string;
          id?: string;
          reservation_id?: string;
          reward_amount_jpy?: number;
          staff_id?: string;
          total_sales_jpy?: number;
          status?: Database["public"]["Enums"]["treatment_reward_status"];
          paid_at?: string | null;
          calc_source?: Json | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treatment_rewards_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: true;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treatment_rewards_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      },
      commission_rules: {
        Row: {
          id: string;
          staff_id: string | null;
          service_id: string | null;
          rate_type: "percentage" | "fixed";
          rate_value: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id?: string | null;
          service_id?: string | null;
          rate_type: "percentage" | "fixed";
          rate_value: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string | null;
          service_id?: string | null;
          rate_type?: "percentage" | "fixed";
          rate_value?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commission_rules_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_rules_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      },
      user_salons: {
        Row: {
          role_id: number;
          salon_id: number;
          user_id: string;
        };
        Insert: {
          role_id: number;
          salon_id: number;
          user_id: string;
        };
        Update: {
          role_id?: number;
          salon_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_salons_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["role_id"];
          },
          {
            foreignKeyName: "user_salons_salon_id_fkey";
            columns: ["salon_id"];
            isOneToOne: false;
            referencedRelation: "salons";
            referencedColumns: ["salon_id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          name: string;
          phone: string | null;
          tenant_id: number;
          updated_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          name: string;
          phone?: string | null;
          tenant_id: number;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          name?: string;
          phone?: string | null;
          tenant_id?: number;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_entries: {
        Row: {
          id: string;
          staff_id: string;
          date: string;
          sales_amount: number;
          status: Database["public"]["Enums"]["sales_entry_status"];
          note: string | null;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          date: string;
          sales_amount?: number;
          status?: Database["public"]["Enums"]["sales_entry_status"];
          note?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          date?: string;
          sales_amount?: number;
          status?: Database["public"]["Enums"]["sales_entry_status"];
          note?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_entries_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_entry_events: {
        Row: {
          id: string;
          sales_entry_id: string;
          event_type: Database["public"]["Enums"]["sales_entry_event_type"];
          actor_id: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sales_entry_id: string;
          event_type: Database["public"]["Enums"]["sales_entry_event_type"];
          actor_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sales_entry_id?: string;
          event_type?: Database["public"]["Enums"]["sales_entry_event_type"];
          actor_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_entry_events_sales_entry_id_fkey";
            columns: ["sales_entry_id"];
            isOneToOne: false;
            referencedRelation: "sales_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_transactions: {
        Row: {
          id: string;
          staff_id: string;
          date: string;
          service_name: string;
          amount: number;
          customer_gender: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          date: string;
          service_name: string;
          amount: number;
          customer_gender?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          date?: string;
          service_name?: string;
          amount?: number;
          customer_gender?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_transactions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_runs: {
        Row: {
          id: string;
          month: string;
          status: Database["public"]["Enums"]["payroll_run_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          month: string;
          status?: Database["public"]["Enums"]["payroll_run_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          month?: string;
          status?: Database["public"]["Enums"]["payroll_run_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_items: {
        Row: {
          id: string;
          payroll_run_id: string;
          staff_id: string;
          amount: number;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          staff_id: string;
          amount?: number;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payroll_run_id?: string;
          staff_id?: string;
          amount?: number;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey";
            columns: ["payroll_run_id"];
            isOneToOne: false;
            referencedRelation: "payroll_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_items_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_reservations_between: {
        Args: {
          p_from?: string | null;
          p_to?: string | null;
        };
        Returns: Database["public"]["Tables"]["reservations"]["Row"][];
      };
      lookup_reservation: {
        Args: {
          p_code: string;
          p_contact: string;
        };
        Returns: Database["public"]["Tables"]["reservations"]["Row"] | null;
      };
    };
    Enums: {
      reservation_status:
      | "pending"
      | "unpaid"
      | "processing"
      | "paid"
      | "confirmed"
      | "canceled"
      | "no_show"
      | "refunded"
      | "completed";
      app_role: "admin" | "employee" | "contractor";
      attendance_status: "working" | "break" | "clocked_out";
      treatment_reward_status: "draft" | "approved" | "paid";
      user_role: "owner" | "manager" | "staff";
      sales_entry_status: "draft" | "submitted" | "approved" | "rejected" | "paid_locked";
      sales_entry_event_type: "submit" | "approve" | "reject" | "unlock" | "update";
      payroll_run_status: "draft" | "confirmed" | "paid";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
