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
      automation_rules: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          offset_hours: number | null
          rule_code: string
          template_key: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label: string
          offset_hours?: number | null
          rule_code: string
          template_key: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          offset_hours?: number | null
          rule_code?: string
          template_key?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          billing_notes: string | null
          cash_collection_notes: string | null
          check_drop_location_notes: string | null
          check_payable_to: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          payment_method_preference: string
          primary_email: string | null
          primary_phone: string | null
          updated_at: string
          venmo_handle: string | null
        }
        Insert: {
          billing_notes?: string | null
          cash_collection_notes?: string | null
          check_drop_location_notes?: string | null
          check_payable_to?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          payment_method_preference?: string
          primary_email?: string | null
          primary_phone?: string | null
          updated_at?: string
          venmo_handle?: string | null
        }
        Update: {
          billing_notes?: string | null
          cash_collection_notes?: string | null
          check_drop_location_notes?: string | null
          check_payable_to?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          payment_method_preference?: string
          primary_email?: string | null
          primary_phone?: string | null
          updated_at?: string
          venmo_handle?: string | null
        }
        Relationships: []
      }
      communication_log: {
        Row: {
          channel: string
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string | null
          message_type: string
          property_id: string | null
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          service_visit_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          message_type: string
          property_id?: string | null
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          service_visit_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          message_type?: string
          property_id?: string | null
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          service_visit_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "communication_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "communication_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "communication_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_visit_financials"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "communication_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "communication_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "communication_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "communication_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "communication_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "communication_log_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "communication_log_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "communication_log_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "communication_log_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          cash_check_notes_snapshot: string | null
          client_id: string
          created_at: string
          due_date: string
          email_sent_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          last_reminder_sent_at: string | null
          payment_instructions_snapshot: string | null
          property_id: string
          service_visit_id: string | null
          status: string
          updated_at: string
          venmo_handle_snapshot: string | null
        }
        Insert: {
          amount_due: number
          cash_check_notes_snapshot?: string | null
          client_id: string
          created_at?: string
          due_date: string
          email_sent_at?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          last_reminder_sent_at?: string | null
          payment_instructions_snapshot?: string | null
          property_id: string
          service_visit_id?: string | null
          status?: string
          updated_at?: string
          venmo_handle_snapshot?: string | null
        }
        Update: {
          amount_due?: number
          cash_check_notes_snapshot?: string | null
          client_id?: string
          created_at?: string
          due_date?: string
          email_sent_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          last_reminder_sent_at?: string | null
          payment_instructions_snapshot?: string | null
          property_id?: string
          service_visit_id?: string | null
          status?: string
          updated_at?: string
          venmo_handle_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_date: string
          payment_method: string
          reference_note: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_date: string
          payment_method: string
          reference_note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_date?: string
          payment_method?: string
          reference_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_invoices"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_visit_financials"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      properties: {
        Row: {
          access_notes: string | null
          city: string
          client_id: string
          created_at: string
          gate_notes: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          postal_code: string
          property_name: string | null
          service_notes: string | null
          state: string
          street_1: string
          street_2: string | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          city: string
          client_id: string
          created_at?: string
          gate_notes?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          postal_code: string
          property_name?: string | null
          service_notes?: string | null
          state: string
          street_1: string
          street_2?: string | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          city?: string
          client_id?: string
          created_at?: string
          gate_notes?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          postal_code?: string
          property_name?: string | null
          service_notes?: string | null
          state?: string
          street_1?: string
          street_2?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
        ]
      }
      schedule_shift_logs: {
        Row: {
          affected_visit_count: number
          created_at: string
          id: string
          notes: string | null
          shift_reason: string
          source_date: string
          target_date: string
        }
        Insert: {
          affected_visit_count?: number
          created_at?: string
          id?: string
          notes?: string | null
          shift_reason: string
          source_date: string
          target_date: string
        }
        Update: {
          affected_visit_count?: number
          created_at?: string
          id?: string
          notes?: string | null
          shift_reason?: string
          source_date?: string
          target_date?: string
        }
        Relationships: []
      }
      service_plans: {
        Row: {
          auto_generate_visits: boolean
          billing_mode: string
          created_at: string
          day_of_week: number | null
          description: string | null
          end_date: string | null
          frequency_type: string
          id: string
          interval_count: number | null
          last_generated_through: string | null
          notes: string | null
          plan_name: string
          preferred_service_window: string | null
          property_id: string
          quoted_price: number
          season_end_month: number | null
          season_start_month: number | null
          service_type_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_generate_visits?: boolean
          billing_mode?: string
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          frequency_type: string
          id?: string
          interval_count?: number | null
          last_generated_through?: string | null
          notes?: string | null
          plan_name: string
          preferred_service_window?: string | null
          property_id: string
          quoted_price: number
          season_end_month?: number | null
          season_start_month?: number | null
          service_type_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_generate_visits?: boolean
          billing_mode?: string
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          frequency_type?: string
          id?: string
          interval_count?: number | null
          last_generated_through?: string | null
          notes?: string | null
          plan_name?: string
          preferred_service_window?: string | null
          property_id?: string
          quoted_price?: number
          season_end_month?: number | null
          season_start_month?: number | null
          service_type_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_plans_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_type_id"]
          },
        ]
      }
      service_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_recurring_capable: boolean
          is_seasonal: boolean
          label: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_recurring_capable?: boolean
          is_seasonal?: boolean
          label: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_recurring_capable?: boolean
          is_seasonal?: boolean
          label?: string
        }
        Relationships: []
      }
      service_visits: {
        Row: {
          completion_notes: string | null
          completion_timestamp: string | null
          created_at: string
          id: string
          invoice_status: string
          operator_notes: string | null
          property_id: string
          quoted_price: number
          rain_delay_source_date: string | null
          reactivation_required: boolean
          rescheduled_from_visit_id: string | null
          scheduled_date: string
          scheduled_position: number | null
          service_plan_id: string | null
          service_type_id: string
          skip_reason: string | null
          status: string
          updated_at: string
          was_rain_delayed: boolean
        }
        Insert: {
          completion_notes?: string | null
          completion_timestamp?: string | null
          created_at?: string
          id?: string
          invoice_status?: string
          operator_notes?: string | null
          property_id: string
          quoted_price?: number
          rain_delay_source_date?: string | null
          reactivation_required?: boolean
          rescheduled_from_visit_id?: string | null
          scheduled_date: string
          scheduled_position?: number | null
          service_plan_id?: string | null
          service_type_id: string
          skip_reason?: string | null
          status?: string
          updated_at?: string
          was_rain_delayed?: boolean
        }
        Update: {
          completion_notes?: string | null
          completion_timestamp?: string | null
          created_at?: string
          id?: string
          invoice_status?: string
          operator_notes?: string | null
          property_id?: string
          quoted_price?: number
          rain_delay_source_date?: string | null
          reactivation_required?: boolean
          rescheduled_from_visit_id?: string | null
          scheduled_date?: string
          scheduled_position?: number | null
          service_plan_id?: string | null
          service_type_id?: string
          skip_reason?: string | null
          status?: string
          updated_at?: string
          was_rain_delayed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_visits_rescheduled_from_visit_id_fkey"
            columns: ["rescheduled_from_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_rescheduled_from_visit_id_fkey"
            columns: ["rescheduled_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_rescheduled_from_visit_id_fkey"
            columns: ["rescheduled_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_rescheduled_from_visit_id_fkey"
            columns: ["rescheduled_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_rescheduled_from_visit_id_fkey"
            columns: ["rescheduled_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_service_plan_id_fkey"
            columns: ["service_plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_service_plan_id_fkey"
            columns: ["service_plan_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_plan_id"]
          },
          {
            foreignKeyName: "service_visits_service_plan_id_fkey"
            columns: ["service_plan_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_plan_id"]
          },
          {
            foreignKeyName: "service_visits_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_type_id"]
          },
        ]
      }
      visit_photos: {
        Row: {
          caption: string | null
          id: string
          photo_type: string
          service_visit_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          caption?: string | null
          id?: string
          photo_type: string
          service_visit_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          caption?: string | null
          id?: string
          photo_type?: string
          service_visit_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "visit_photos_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "visit_photos_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "visit_photos_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
    }
    Views: {
      v_completed_jobs_missing_invoice: {
        Row: {
          city: string | null
          client_id: string | null
          client_name: string | null
          completion_timestamp: string | null
          invoice_status: string | null
          plan_name: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          property_id: string | null
          quoted_price: number | null
          scheduled_date: string | null
          service_type_label: string | null
          service_visit_id: string | null
          state: string | null
          street_1: string | null
        }
        Relationships: []
      }
      v_invoice_balances: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          amount_remaining: number | null
          city: string | null
          client_id: string | null
          client_name: string | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: string | null
          postal_code: string | null
          property_id: string | null
          service_visit_id: string | null
          state: string | null
          street_1: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      v_overdue_invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          amount_remaining: number | null
          city: string | null
          client_id: string | null
          client_name: string | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: string | null
          postal_code: string | null
          property_id: string | null
          service_visit_id: string | null
          state: string | null
          street_1: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      v_properties_missing_next_service: {
        Row: {
          city: string | null
          client_id: string | null
          client_name: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          property_id: string | null
          property_name: string | null
          state: string | null
          street_1: string | null
        }
        Relationships: []
      }
      v_skipped_visits_pending_reactivation: {
        Row: {
          city: string | null
          client_id: string | null
          client_name: string | null
          operator_notes: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          property_id: string | null
          reactivation_required: boolean | null
          scheduled_date: string | null
          service_type_label: string | null
          service_visit_id: string | null
          skip_reason: string | null
          state: string | null
          status: string | null
          street_1: string | null
        }
        Relationships: []
      }
      v_today_jobs: {
        Row: {
          access_notes: string | null
          city: string | null
          client_id: string | null
          client_name: string | null
          completion_notes: string | null
          frequency_type: string | null
          gate_notes: string | null
          latitude: number | null
          longitude: number | null
          operator_notes: string | null
          plan_name: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          property_id: string | null
          property_name: string | null
          quoted_price: number | null
          rain_delay_source_date: string | null
          scheduled_date: string | null
          scheduled_position: number | null
          service_notes: string | null
          service_plan_id: string | null
          service_type_code: string | null
          service_type_id: string | null
          service_type_label: string | null
          service_visit_id: string | null
          state: string | null
          street_1: string | null
          street_2: string | null
          visit_status: string | null
          was_rain_delayed: boolean | null
        }
        Relationships: []
      }
      v_upcoming_week_jobs: {
        Row: {
          city: string | null
          client_id: string | null
          client_name: string | null
          plan_name: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          property_id: string | null
          property_name: string | null
          quoted_price: number | null
          scheduled_date: string | null
          scheduled_position: number | null
          service_plan_id: string | null
          service_type_code: string | null
          service_type_label: string | null
          service_visit_id: string | null
          state: string | null
          street_1: string | null
          visit_status: string | null
        }
        Relationships: []
      }
      v_visit_financials: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          amount_remaining: number | null
          client_id: string | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: string | null
          property_id: string | null
          service_visit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "invoices_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: true
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
    }
    Functions: {
      bulk_rain_delay_shift: {
        Args: { p_notes?: string; p_source_date: string }
        Returns: number
      }
      bulk_shift_service_visits: {
        Args: {
          p_notes?: string
          p_shift_reason?: string
          p_source_date: string
          p_target_date: string
        }
        Returns: number
      }
      create_invoice_for_visit: {
        Args: { p_due_days?: number; p_service_visit_id: string }
        Returns: string
      }
      date_matches_service_plan: {
        Args: {
          p_plan: Database["public"]["Tables"]["service_plans"]["Row"]
          p_target_date: string
        }
        Returns: boolean
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_service_visits_for_active_plans: {
        Args: { p_window_end?: string; p_window_start?: string }
        Returns: {
          inserted_count: number
          service_plan_id: string
        }[]
      }
      generate_service_visits_for_plan: {
        Args: {
          p_service_plan_id: string
          p_window_end: string
          p_window_start: string
        }
        Returns: number
      }
      get_invoice_amount_paid: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      get_invoice_amount_remaining: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      list_today_visits_with_missed_backlog: {
        Args: { p_status?: string; p_target_date?: string }
        Returns: {
          is_missed_appointment: boolean
          service_visit_id: string
          sort_rank: number
        }[]
      }
      refresh_invoice_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
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

export type Inserts<T extends keyof Database["public"]["Tables"]> = TablesInsert<T>
export type Updates<T extends keyof Database["public"]["Tables"]> = TablesUpdate<T>
export type Views<T extends keyof Database["public"]["Views"]> = Tables<T>
