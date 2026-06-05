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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          payment_method_preference?: string
          primary_email?: string | null
          primary_phone?: string | null
          updated_at?: string
          venmo_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_log: {
        Row: {
          channel: string
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string | null
          lead_id: string | null
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
          lead_id?: string | null
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
          lead_id?: string | null
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
            foreignKeyName: "communication_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
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
      daily_run_state: {
        Row: {
          active_visit_id: string | null
          confirmed_today: boolean
          created_at: string
          id: string
          metadata: Json
          organization_id: string
          phase: string
          run_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_visit_id?: string | null
          confirmed_today?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          organization_id: string
          phase?: string
          run_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_visit_id?: string | null
          confirmed_today?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string
          phase?: string
          run_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_run_state_active_visit_id_fkey"
            columns: ["active_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_run_state_active_visit_id_fkey"
            columns: ["active_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "daily_run_state_active_visit_id_fkey"
            columns: ["active_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "daily_run_state_active_visit_id_fkey"
            columns: ["active_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "daily_run_state_active_visit_id_fkey"
            columns: ["active_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "daily_run_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          new_state: Json | null
          organization_id: string
          previous_state: Json | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
          new_state?: Json | null
          organization_id: string
          previous_state?: Json | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_state?: Json | null
          organization_id?: string
          previous_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          cash_check_notes_snapshot: string | null
          client_id: string
          created_at: string
          due_at: string | null
          due_date: string
          email_sent_at: string | null
          generated_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          last_reminder_sent_at: string | null
          organization_id: string | null
          paid_at: string | null
          payment_instructions_snapshot: string | null
          property_id: string
          sent_at: string | null
          sent_by: string | null
          sent_preview: string | null
          service_visit_id: string | null
          status: string
          updated_at: string
          venmo_handle_snapshot: string | null
          viewed_at: string | null
        }
        Insert: {
          amount_due: number
          cash_check_notes_snapshot?: string | null
          client_id: string
          created_at?: string
          due_at?: string | null
          due_date: string
          email_sent_at?: string | null
          generated_at?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          last_reminder_sent_at?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payment_instructions_snapshot?: string | null
          property_id: string
          sent_at?: string | null
          sent_by?: string | null
          sent_preview?: string | null
          service_visit_id?: string | null
          status?: string
          updated_at?: string
          venmo_handle_snapshot?: string | null
          viewed_at?: string | null
        }
        Update: {
          amount_due?: number
          cash_check_notes_snapshot?: string | null
          client_id?: string
          created_at?: string
          due_at?: string | null
          due_date?: string
          email_sent_at?: string | null
          generated_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          last_reminder_sent_at?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payment_instructions_snapshot?: string | null
          property_id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_preview?: string | null
          service_visit_id?: string | null
          status?: string
          updated_at?: string
          venmo_handle_snapshot?: string | null
          viewed_at?: string | null
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
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      issues: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          follow_up_required: boolean
          id: string
          organization_id: string
          property_id: string | null
          resolved_at: string | null
          service_visit_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          follow_up_required?: boolean
          id?: string
          organization_id: string
          property_id?: string | null
          resolved_at?: string | null
          service_visit_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          follow_up_required?: boolean
          id?: string
          organization_id?: string
          property_id?: string | null
          resolved_at?: string | null
          service_visit_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "issues_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "issues_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "issues_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "issues_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      lead_contact_preferences: {
        Row: {
          consent_text: string
          consented_at: string | null
          created_at: string
          id: string
          lead_id: string
          phone: string
          sms_opt_in: boolean
          sms_status_updates: boolean
          updated_at: string
        }
        Insert: {
          consent_text: string
          consented_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          phone: string
          sms_opt_in?: boolean
          sms_status_updates?: boolean
          updated_at?: string
        }
        Update: {
          consent_text?: string
          consented_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          phone?: string
          sms_opt_in?: boolean
          sms_status_updates?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contact_preferences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_enrichment: {
        Row: {
          created_at: string
          detail_type: string
          detail_value: string
          id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          detail_type: string
          detail_value: string
          id?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          detail_type?: string
          detail_value?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_enrichment_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          lead_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          lead_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_photos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget_range: string
          converted_at: string | null
          converted_client_id: string | null
          converted_property_id: string | null
          created_at: string
          email: string | null
          id: string
          last_activity_at: string | null
          lost_reason: string | null
          name: string
          organization_id: string | null
          phone: string
          preferred_contact_method: string
          project_description: string
          property_address: string
          services_requested: string[]
          source: string
          status: string
          tenant_slug: string
          timeline: string
          updated_at: string
        }
        Insert: {
          budget_range: string
          converted_at?: string | null
          converted_client_id?: string | null
          converted_property_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_activity_at?: string | null
          lost_reason?: string | null
          name: string
          organization_id?: string | null
          phone: string
          preferred_contact_method: string
          project_description: string
          property_address: string
          services_requested?: string[]
          source?: string
          status?: string
          tenant_slug: string
          timeline: string
          updated_at?: string
        }
        Update: {
          budget_range?: string
          converted_at?: string | null
          converted_client_id?: string | null
          converted_property_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_activity_at?: string | null
          lost_reason?: string | null
          name?: string
          organization_id?: string | null
          phone?: string
          preferred_contact_method?: string
          project_description?: string
          property_address?: string
          services_requested?: string[]
          source?: string
          status?: string
          tenant_slug?: string
          timeline?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "v_properties_missing_next_service"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          captured_at: string | null
          created_at: string
          customer_visible: boolean
          id: string
          issue_id: string | null
          organization_id: string
          photo_type: string
          service_visit_id: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          customer_visible?: boolean
          id?: string
          issue_id?: string | null
          organization_id: string
          photo_type?: string
          service_visit_id?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          customer_visible?: boolean
          id?: string
          issue_id?: string | null
          organization_id?: string
          photo_type?: string
          service_visit_id?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "media_assets_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "media_assets_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "media_assets_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string
          id: string
          import_batch_id: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          import_batch_id?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          import_batch_id?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_onboarding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          organization_id: string | null
          payment_date: string
          payment_method: string
          reference_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          organization_id?: string | null
          payment_date: string
          payment_method: string
          reference_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          organization_id?: string | null
          payment_date?: string
          payment_method?: string
          reference_note?: string | null
          status?: string
          updated_at?: string
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
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_snapshots: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          event_type: string
          id: string
          new_order: Json | null
          organization_id: string
          original_order: Json | null
          route_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_order?: Json | null
          organization_id: string
          original_order?: Json | null
          route_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_order?: Json | null
          organization_id?: string
          original_order?: Json | null
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_snapshots_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          arrived_at: string | null
          completed_at: string | null
          created_at: string
          eta_at: string | null
          id: string
          notes: string | null
          organization_id: string
          route_id: string
          service_visit_id: string | null
          status: string
          stop_order: number
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          eta_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          route_id: string
          service_visit_id?: string | null
          status?: string
          stop_order: number
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          eta_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          route_id?: string
          service_visit_id?: string | null
          status?: string
          stop_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "route_stops_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "route_stops_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "route_stops_service_visit_id_fkey"
            columns: ["service_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
        ]
      }
      routes: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          route_date: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          route_date: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          route_date?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
            foreignKeyName: "service_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          arrived_at: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_timestamp: string | null
          confirmed_at: string | null
          created_at: string
          generated_from_visit_id: string | null
          generation_reason: string | null
          id: string
          invoice_generated_at: string | null
          invoice_status: string
          last_event_at: string | null
          needs_review_at: string | null
          operator_notes: string | null
          organization_id: string
          paid_at: string | null
          paused_at: string | null
          property_id: string
          quoted_price: number
          rain_delay_source_date: string | null
          reactivation_required: boolean
          recurrence_sequence: number
          rescheduled_at: string | null
          rescheduled_from_visit_id: string | null
          route_started_at: string | null
          scheduled_at: string | null
          scheduled_date: string
          scheduled_position: number | null
          service_plan_id: string | null
          service_type_id: string
          skip_reason: string | null
          skipped_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          was_rain_delayed: boolean
          work_started_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_timestamp?: string | null
          confirmed_at?: string | null
          created_at?: string
          generated_from_visit_id?: string | null
          generation_reason?: string | null
          id?: string
          invoice_generated_at?: string | null
          invoice_status?: string
          last_event_at?: string | null
          needs_review_at?: string | null
          operator_notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paused_at?: string | null
          property_id: string
          quoted_price?: number
          rain_delay_source_date?: string | null
          reactivation_required?: boolean
          recurrence_sequence?: number
          rescheduled_at?: string | null
          rescheduled_from_visit_id?: string | null
          route_started_at?: string | null
          scheduled_at?: string | null
          scheduled_date: string
          scheduled_position?: number | null
          service_plan_id?: string | null
          service_type_id: string
          skip_reason?: string | null
          skipped_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          was_rain_delayed?: boolean
          work_started_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_timestamp?: string | null
          confirmed_at?: string | null
          created_at?: string
          generated_from_visit_id?: string | null
          generation_reason?: string | null
          id?: string
          invoice_generated_at?: string | null
          invoice_status?: string
          last_event_at?: string | null
          needs_review_at?: string | null
          operator_notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paused_at?: string | null
          property_id?: string
          quoted_price?: number
          rain_delay_source_date?: string | null
          reactivation_required?: boolean
          recurrence_sequence?: number
          rescheduled_at?: string | null
          rescheduled_from_visit_id?: string | null
          route_started_at?: string | null
          scheduled_at?: string | null
          scheduled_date?: string
          scheduled_position?: number | null
          service_plan_id?: string | null
          service_type_id?: string
          skip_reason?: string | null
          skipped_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          was_rain_delayed?: boolean
          work_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_generated_from_visit_id_fkey"
            columns: ["generated_from_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_generated_from_visit_id_fkey"
            columns: ["generated_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_completed_jobs_missing_invoice"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_generated_from_visit_id_fkey"
            columns: ["generated_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_skipped_visits_pending_reactivation"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_generated_from_visit_id_fkey"
            columns: ["generated_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_today_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_generated_from_visit_id_fkey"
            columns: ["generated_from_visit_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_week_jobs"
            referencedColumns: ["service_visit_id"]
          },
          {
            foreignKeyName: "service_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string | null
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
        Relationships: [
          {
            foreignKeyName: "service_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          organization_id: string | null
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
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          organization_id: string | null
          postal_code: string | null
          primary_email: string | null
          primary_phone: string | null
          property_id: string | null
          property_name: string | null
          state: string | null
          street_1: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_skipped_visits_pending_reactivation: {
        Row: {
          city: string | null
          client_id: string | null
          client_name: string | null
          operator_notes: string | null
          organization_id: string | null
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
        Relationships: [
          {
            foreignKeyName: "service_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
        Relationships: [
          {
            foreignKeyName: "service_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_upcoming_week_jobs: {
        Row: {
          city: string | null
          client_id: string | null
          client_name: string | null
          organization_id: string | null
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
        Relationships: [
          {
            foreignKeyName: "service_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      claim_unowned_lead: {
        Args: {
          p_actor_user_id?: string
          p_lead_id: string
          p_organization_id?: string
        }
        Returns: {
          budget_range: string
          converted_at: string | null
          converted_client_id: string | null
          converted_property_id: string | null
          created_at: string
          email: string | null
          id: string
          last_activity_at: string | null
          lost_reason: string | null
          name: string
          organization_id: string | null
          phone: string
          preferred_contact_method: string
          project_description: string
          property_address: string
          services_requested: string[]
          source: string
          status: string
          tenant_slug: string
          timeline: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_invoice_for_visit: {
        Args: { p_due_days?: number; p_service_visit_id: string }
        Returns: string
      }
      current_user_organization_id: {
        Args: { p_user_id?: string }
        Returns: string
      }
      date_matches_service_plan: {
        Args: {
          p_plan: Database["public"]["Tables"]["service_plans"]["Row"]
          p_target_date: string
        }
        Returns: boolean
      }
      ensure_organization_onboarding: {
        Args: { p_organization_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          current_step: string
          id: string
          import_batch_id: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_onboarding"
          isOneToOne: true
          isSetofReturn: false
        }
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
      get_daily_run_state: {
        Args: {
          p_organization_id: string
          p_run_date: string
          p_user_id: string
        }
        Returns: {
          active_visit_id: string | null
          confirmed_today: boolean
          created_at: string
          id: string
          metadata: Json
          organization_id: string
          phase: string
          run_date: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_run_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_invoice_amount_paid: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      get_invoice_amount_remaining: {
        Args: { p_invoice_id: string }
        Returns: number
      }
      is_org_owner_or_admin: {
        Args: { p_organization_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { p_organization_id: string; p_user_id?: string }
        Returns: boolean
      }
      list_today_visits_with_missed_backlog: {
        Args: { p_status?: string; p_target_date?: string }
        Returns: {
          is_missed_appointment: boolean
          service_visit_id: string
          sort_rank: number
        }[]
      }
      onboard_organization: {
        Args: { p_business_name: string; p_display_name?: string }
        Returns: string
      }
      organization_role: {
        Args: { p_organization_id: string; p_user_id?: string }
        Returns: string
      }
      refresh_invoice_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      storage_path_org_id: { Args: { p_path: string }; Returns: string }
      upsert_daily_run_state: {
        Args: {
          p_active_visit_id?: string
          p_confirmed_today?: boolean
          p_metadata?: Json
          p_organization_id: string
          p_phase: string
          p_run_date: string
          p_user_id: string
        }
        Returns: {
          active_visit_id: string | null
          confirmed_today: boolean
          created_at: string
          id: string
          metadata: Json
          organization_id: string
          phase: string
          run_date: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_run_state"
          isOneToOne: true
          isSetofReturn: false
        }
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
