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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_id: number
          appointment_type: string
          confirmation_sent_at: string | null
          created_at: string
          customer_id: number
          end_time: string
          is_confirmed: boolean | null
          notes: string | null
          reminder_sent_at: string | null
          salon_id: number
          service_id: number
          staff_id: number
          start_time: string
          status: string | null
          task_description: string | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_id?: number
          appointment_type?: string
          confirmation_sent_at?: string | null
          created_at?: string
          customer_id: number
          end_time: string
          is_confirmed?: boolean | null
          notes?: string | null
          reminder_sent_at?: string | null
          salon_id: number
          service_id: number
          staff_id: number
          start_time: string
          status?: string | null
          task_description?: string | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_id?: number
          appointment_type?: string
          confirmation_sent_at?: string | null
          created_at?: string
          customer_id?: number
          end_time?: string
          is_confirmed?: boolean | null
          notes?: string | null
          reminder_sent_at?: string | null
          salon_id?: number
          service_id?: number
          staff_id?: number
          start_time?: string
          status?: string | null
          task_description?: string | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["salon_id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_legacy"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_legacy"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_off_jpy: number | null
          code: string
          id: string
          percent_off: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          amount_off_jpy?: number | null
          code: string
          id?: string
          percent_off?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          amount_off_jpy?: number | null
          code?: string
          id?: string
          percent_off?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          customer_id: number
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          last_name: string
          last_visit_date: string | null
          notes: string | null
          phone: string | null
          salon_id: number
          status: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id?: number
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          last_name: string
          last_visit_date?: string | null
          notes?: string | null
          phone?: string | null
          salon_id: number
          status?: string
          tenant_id: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: number
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          last_name?: string
          last_visit_date?: string | null
          notes?: string | null
          phone?: string | null
          salon_id?: number
          status?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["salon_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      date_overrides: {
        Row: {
          close_at: string | null
          date: string
          id: string
          is_open: boolean
          note: string | null
          open_at: string | null
        }
        Insert: {
          close_at?: string | null
          date: string
          id?: string
          is_open?: boolean
          note?: string | null
          open_at?: string | null
        }
        Update: {
          close_at?: string | null
          date?: string
          id?: string
          is_open?: boolean
          note?: string | null
          open_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: number
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string
          id?: number
          payload: Json
          type: string
        }
        Update: {
          created_at?: string
          id?: number
          payload?: Json
          type?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_time: string
          id: number
          identifier: string
          ip_address: string
        }
        Insert: {
          attempt_time?: string
          id?: number
          identifier: string
          ip_address: string
        }
        Update: {
          attempt_time?: string
          id?: number
          identifier?: string
          ip_address?: string
        }
        Relationships: []
      }
      opening_hours: {
        Row: {
          close_at: string
          id: string
          is_open: boolean
          open_at: string
          weekday: number
        }
        Insert: {
          close_at: string
          id?: string
          is_open?: boolean
          open_at: string
          weekday: number
        }
        Update: {
          close_at?: string
          id?: string
          is_open?: boolean
          open_at?: string
          weekday?: number
        }
        Relationships: []
      }
      remember_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: number
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: number
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: number
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      reservation_notifications: {
        Row: {
          id: number
          kind: string
          reservation_id: string
          scheduled_at: string | null
          sent_at: string | null
        }
        Insert: {
          id?: number
          kind: string
          reservation_id: string
          scheduled_at?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: number
          kind?: string
          reservation_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_notifications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          amount_total_jpy: number
          code: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_at: string
          id: string
          locale: string | null
          notes: string | null
          paid_amount_jpy: number
          payment_collected_at: string | null
          payment_method: string | null
          payment_option: string | null
          room_id: string | null
          service_id: string
          staff_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["reservation_status"]
          stripe_checkout_session: string | null
          stripe_payment_intent: string | null
          updated_at: string
        }
        Insert: {
          amount_total_jpy: number
          code: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_at: string
          id?: string
          locale?: string | null
          notes?: string | null
          paid_amount_jpy?: number
          payment_collected_at?: string | null
          payment_method?: string | null
          payment_option?: string | null
          room_id?: string | null
          service_id: string
          staff_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_checkout_session?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string
        }
        Update: {
          amount_total_jpy?: number
          code?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_at?: string
          id?: string
          locale?: string | null
          notes?: string | null
          paid_amount_jpy?: number
          payment_collected_at?: string | null
          payment_method?: string | null
          payment_option?: string | null
          room_id?: string | null
          service_id?: string
          staff_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_checkout_session?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          role_id: number
          role_name: string
        }
        Insert: {
          description?: string | null
          role_id?: number
          role_name: string
        }
        Update: {
          description?: string | null
          role_id?: number
          role_name?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          active: boolean
          capacity: number
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          capacity?: number
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          capacity?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      salons: {
        Row: {
          address: string | null
          business_hours: string | null
          created_at: string
          description: string | null
          email: string | null
          name: string
          phone: string | null
          salon_id: number
          status: string | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          name: string
          phone?: string | null
          salon_id?: number
          status?: string | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          name?: string
          phone?: string | null
          salon_id?: number
          status?: string | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      service_categories: {
        Row: {
          category_id: number
          created_at: string
          description: string | null
          display_order: number | null
          name: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          category_id?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          name: string
          tenant_id: number
          updated_at?: string
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          name?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          currency: string
          description: string | null
          duration_min: number
          id: string
          name: string
          price_jpy: number
          requires_prepayment: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          currency?: string
          description?: string | null
          duration_min: number
          id?: string
          name: string
          price_jpy: number
          requires_prepayment?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          currency?: string
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          price_jpy?: number
          requires_prepayment?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      services_legacy: {
        Row: {
          category_id: number | null
          color: string | null
          created_at: string
          description: string | null
          duration: number
          is_active: boolean
          name: string
          price: number
          service_id: number
          tenant_id: number
          updated_at: string
        }
        Insert: {
          category_id?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration: number
          is_active?: boolean
          name: string
          price: number
          service_id?: number
          tenant_id: number
          updated_at?: string
        }
        Update: {
          category_id?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          is_active?: boolean
          name?: string
          price?: number
          service_id?: number
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_legacy_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "services_legacy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_legacy: {
        Row: {
          created_at: string
          email: string | null
          name: string
          phone: string | null
          staff_id: number
          status: string | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          name: string
          phone?: string | null
          staff_id?: number
          status?: string | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          name?: string
          phone?: string | null
          staff_id?: number
          status?: string | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          domain: string
          logo_image_url: string | null
          name: string
          owner_user_id: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          logo_image_url?: string | null
          name: string
          owner_user_id: string
          tenant_id?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          logo_image_url?: string | null
          name?: string
          owner_user_id?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_salons: {
        Row: {
          role_id: number
          salon_id: number
          user_id: string
        }
        Insert: {
          role_id: number
          salon_id: number
          user_id: string
        }
        Update: {
          role_id?: number
          salon_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_salons_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "user_salons_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["salon_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          name: string
          phone: string | null
          tenant_id: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          name: string
          phone?: string | null
          tenant_id: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          name?: string
          phone?: string | null
          tenant_id?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_reservations_between: {
        Args: {
          p_from?: string | null
          p_to?: string | null
        }
        Returns: Database["public"]["Tables"]["reservations"]["Row"][]
      }
      lookup_reservation: {
        Args: {
          p_code: string
          p_contact: string
        }
        Returns: Database["public"]["Tables"]["reservations"]["Row"] | null
      }
    }
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
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
