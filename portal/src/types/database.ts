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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id: string
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crm_sync_jobs: {
        Row: {
          buffered_changes: string[]
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          created_at: string
          direction: string
          entity_name: Database["public"]["Enums"]["crm_entity_name"]
          failure_reason: string | null
          field_changes: Json | null
          hubspot_object_id: string | null
          hubspot_object_type: string | null
          id: string
          last_attempt_at: string | null
          last_successful_sync_at: string | null
          retry_count: number
          state: Database["public"]["Enums"]["crm_sync_state"]
          updated_at: string
        }
        Insert: {
          buffered_changes?: string[]
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          created_at?: string
          direction?: string
          entity_name: Database["public"]["Enums"]["crm_entity_name"]
          failure_reason?: string | null
          field_changes?: Json | null
          hubspot_object_id?: string | null
          hubspot_object_type?: string | null
          id: string
          last_attempt_at?: string | null
          last_successful_sync_at?: string | null
          retry_count?: number
          state?: Database["public"]["Enums"]["crm_sync_state"]
          updated_at?: string
        }
        Update: {
          buffered_changes?: string[]
          case_id?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          created_at?: string
          direction?: string
          entity_name?: Database["public"]["Enums"]["crm_entity_name"]
          failure_reason?: string | null
          field_changes?: Json | null
          hubspot_object_id?: string | null
          hubspot_object_type?: string | null
          id?: string
          last_attempt_at?: string | null
          last_successful_sync_at?: string | null
          retry_count?: number
          state?: Database["public"]["Enums"]["crm_sync_state"]
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          crm_document_id: string | null
          file_name: string
          file_size_label: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          mime_type: string
          notes: string | null
          storage_mode: Database["public"]["Enums"]["document_storage_mode"]
          storage_path: string | null
          uploaded_at: string
          uploaded_by_name: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          crm_document_id?: string | null
          file_name: string
          file_size_label: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          mime_type: string
          notes?: string | null
          storage_mode?: Database["public"]["Enums"]["document_storage_mode"]
          storage_path?: string | null
          uploaded_at: string
          uploaded_by_name: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          case_id?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          crm_document_id?: string | null
          file_name?: string
          file_size_label?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          mime_type?: string
          notes?: string | null
          storage_mode?: Database["public"]["Enums"]["document_storage_mode"]
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by_name?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_batches: {
        Row: {
          assigned_service_partner_id: string | null
          batch_number: string | null
          certificate_uploaded_at: string | null
          created_at: string
          crm_case_id: string | null
          crm_relation_id: string | null
          crm_task_id: string | null
          data_wipe_certificate_url: string | null
          device_count_promised: number
          id: string
          invoice_notified: boolean
          invoiced: boolean
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_contact_email: string
          pickup_contact_name: string
          pickup_date: string | null
          pickup_scheduled_at: string | null
          pickup_window: string | null
          processed_at: string | null
          received_bags: number
          received_chargers: number
          received_headsets: number
          received_laptops: number
          received_mice: number
          received_other: number
          refurbish_ready_count: number | null
          registered_at: string
          rejected_count: number | null
          residual_value_eur: number | null
          shipment_reference: string | null
          sponsor_organization_id: string
          status: Database["public"]["Enums"]["donation_status"]
          thank_you_email_sent: boolean
          total_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          assigned_service_partner_id?: string | null
          batch_number?: string | null
          certificate_uploaded_at?: string | null
          created_at?: string
          crm_case_id?: string | null
          crm_relation_id?: string | null
          crm_task_id?: string | null
          data_wipe_certificate_url?: string | null
          device_count_promised?: number
          id: string
          invoice_notified?: boolean
          invoiced?: boolean
          notes?: string | null
          picked_up_at?: string | null
          pickup_address: string
          pickup_contact_email: string
          pickup_contact_name: string
          pickup_date?: string | null
          pickup_scheduled_at?: string | null
          pickup_window?: string | null
          processed_at?: string | null
          received_bags?: number
          received_chargers?: number
          received_headsets?: number
          received_laptops?: number
          received_mice?: number
          received_other?: number
          refurbish_ready_count?: number | null
          registered_at: string
          rejected_count?: number | null
          residual_value_eur?: number | null
          shipment_reference?: string | null
          sponsor_organization_id: string
          status: Database["public"]["Enums"]["donation_status"]
          thank_you_email_sent?: boolean
          total_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          assigned_service_partner_id?: string | null
          batch_number?: string | null
          certificate_uploaded_at?: string | null
          created_at?: string
          crm_case_id?: string | null
          crm_relation_id?: string | null
          crm_task_id?: string | null
          data_wipe_certificate_url?: string | null
          device_count_promised?: number
          id?: string
          invoice_notified?: boolean
          invoiced?: boolean
          notes?: string | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_contact_email?: string
          pickup_contact_name?: string
          pickup_date?: string | null
          pickup_scheduled_at?: string | null
          pickup_window?: string | null
          processed_at?: string | null
          received_bags?: number
          received_chargers?: number
          received_headsets?: number
          received_laptops?: number
          received_mice?: number
          received_other?: number
          refurbish_ready_count?: number | null
          registered_at?: string
          rejected_count?: number | null
          residual_value_eur?: number | null
          shipment_reference?: string | null
          sponsor_organization_id?: string
          status?: Database["public"]["Enums"]["donation_status"]
          thank_you_email_sent?: boolean
          total_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_batches_assigned_service_partner_id_fkey"
            columns: ["assigned_service_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_batches_sponsor_organization_id_fkey"
            columns: ["sponsor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_snapshots: {
        Row: {
          created_at: string
          data: Json
          generated_at: string
          horizon_months: number
          id: string
        }
        Insert: {
          created_at?: string
          data: Json
          generated_at?: string
          horizon_months?: number
          id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          generated_at?: string
          horizon_months?: number
          id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          assigned_order_id: string | null
          available_quantity: number
          condition: Database["public"]["Enums"]["inventory_condition"]
          created_at: string
          id: string
          incoming_eta: string | null
          incoming_quantity: number
          last_mutation_at: string
          product_id: string
          quantity: number
          serial_number: string | null
          source_donation_batch_id: string | null
          stock_location_id: string | null
          updated_at: string
          warehouse_location: string
        }
        Insert: {
          assigned_order_id?: string | null
          available_quantity?: number
          condition: Database["public"]["Enums"]["inventory_condition"]
          created_at?: string
          id: string
          incoming_eta?: string | null
          incoming_quantity?: number
          last_mutation_at?: string
          product_id: string
          quantity?: number
          serial_number?: string | null
          source_donation_batch_id?: string | null
          stock_location_id?: string | null
          updated_at?: string
          warehouse_location: string
        }
        Update: {
          assigned_order_id?: string | null
          available_quantity?: number
          condition?: Database["public"]["Enums"]["inventory_condition"]
          created_at?: string
          id?: string
          incoming_eta?: string | null
          incoming_quantity?: number
          last_mutation_at?: string
          product_id?: string
          quantity?: number
          serial_number?: string | null
          source_donation_batch_id?: string | null
          stock_location_id?: string | null
          updated_at?: string
          warehouse_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_stock_location_id_fkey"
            columns: ["stock_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_document_ids: string[]
          author_name: string
          author_role: string
          author_user_id: string | null
          body: string
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          created_at: string
          id: string
          internal_only: boolean
          kind: Database["public"]["Enums"]["message_kind"]
        }
        Insert: {
          attachment_document_ids?: string[]
          author_name: string
          author_role: string
          author_user_id?: string | null
          body: string
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          created_at: string
          id: string
          internal_only?: boolean
          kind?: Database["public"]["Enums"]["message_kind"]
        }
        Update: {
          attachment_document_ids?: string[]
          author_name?: string
          author_role?: string
          author_user_id?: string | null
          body?: string
          case_id?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          created_at?: string
          id?: string
          internal_only?: boolean
          kind?: Database["public"]["Enums"]["message_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_role_scope: {
        Row: {
          is_read: boolean
          notification_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          is_read?: boolean
          notification_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          is_read?: boolean
          notification_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_role_scope_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          level: Database["public"]["Enums"]["notification_level"]
          related_case_id: string | null
          related_case_type: Database["public"]["Enums"]["case_type"] | null
          title: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          level: Database["public"]["Enums"]["notification_level"]
          related_case_id?: string | null
          related_case_type?: Database["public"]["Enums"]["case_type"] | null
          title: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["notification_level"]
          related_case_id?: string | null
          related_case_type?: Database["public"]["Enums"]["case_type"] | null
          title?: string
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          connector_type: string | null
          connector_wattage: string | null
          created_at: string
          defect_description: string | null
          defect_photo_urls: string[] | null
          id: string
          line_type: string
          order_id: string
          product_id: string
          quantity: number
          rma_category: string | null
          serial_number: string | null
        }
        Insert: {
          connector_type?: string | null
          connector_wattage?: string | null
          created_at?: string
          defect_description?: string | null
          defect_photo_urls?: string[] | null
          id: string
          line_type?: string
          order_id: string
          product_id: string
          quantity?: number
          rma_category?: string | null
          serial_number?: string | null
        }
        Update: {
          connector_type?: string | null
          connector_wattage?: string | null
          created_at?: string
          defect_description?: string | null
          defect_photo_urls?: string[] | null
          id?: string
          line_type?: string
          order_id?: string
          product_id?: string
          quantity?: number
          rma_category?: string | null
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          approved_at: string | null
          approved_by_user_id: string | null
          assigned_service_partner_id: string | null
          created_at: string
          crm_case_id: string | null
          crm_relation_id: string | null
          crm_task_id: string | null
          delivery_address: string
          id: string
          motivation: string
          ordering_window_ref: string | null
          organization_id: string
          preferred_delivery_date: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          requested_at: string
          requester_user_id: string
          scheduled_delivery_date: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_badge: string
          target_month: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          assigned_service_partner_id?: string | null
          created_at?: string
          crm_case_id?: string | null
          crm_relation_id?: string | null
          crm_task_id?: string | null
          delivery_address: string
          id: string
          motivation: string
          ordering_window_ref?: string | null
          organization_id: string
          preferred_delivery_date?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          requested_at: string
          requester_user_id: string
          scheduled_delivery_date?: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_badge: string
          target_month?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          assigned_service_partner_id?: string | null
          created_at?: string
          crm_case_id?: string | null
          crm_relation_id?: string | null
          crm_task_id?: string | null
          delivery_address?: string
          id?: string
          motivation?: string
          ordering_window_ref?: string | null
          organization_id?: string
          preferred_delivery_date?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          requested_at?: string
          requester_user_id?: string
          scheduled_delivery_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_badge?: string
          target_month?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_service_partner_id_fkey"
            columns: ["assigned_service_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean
          address: string | null
          city: string
          contact_email: string
          contact_name: string
          created_at: string
          crm_hubspot_id: string | null
          crm_relation_id: string | null
          id: string
          name: string
          postal_code: string | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city: string
          contact_email: string
          contact_name: string
          created_at?: string
          crm_hubspot_id?: string | null
          crm_relation_id?: string | null
          id: string
          name: string
          postal_code?: string | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          crm_hubspot_id?: string | null
          crm_relation_id?: string | null
          id?: string
          name?: string
          postal_code?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      portal_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          age_group: string[] | null
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_package: boolean
          name: string
          package_components: Json | null
          sku: string
          specification_summary: string[]
          stock_on_hand: number
          stock_reserved: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_group?: string[] | null
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description: string
          id: string
          image_url?: string | null
          is_package?: boolean
          name: string
          package_components?: Json | null
          sku: string
          specification_summary?: string[]
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_group?: string[] | null
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_package?: boolean
          name?: string
          package_components?: Json | null
          sku?: string
          specification_summary?: string[]
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
        }
        Relationships: []
      }
      repair_cases: {
        Row: {
          assigned_service_partner_id: string | null
          created_at: string
          crm_case_id: string | null
          crm_relation_id: string | null
          crm_task_id: string | null
          id: string
          issue_type: string
          notes: string
          organization_id: string
          photo_placeholder_count: number
          received_at: string
          replacement_offered: boolean | null
          requester_user_id: string
          serial_number: string
          status: Database["public"]["Enums"]["repair_status"]
          subtype: Database["public"]["Enums"]["repair_subtype"]
          updated_at: string
        }
        Insert: {
          assigned_service_partner_id?: string | null
          created_at?: string
          crm_case_id?: string | null
          crm_relation_id?: string | null
          crm_task_id?: string | null
          id: string
          issue_type: string
          notes: string
          organization_id: string
          photo_placeholder_count?: number
          received_at: string
          replacement_offered?: boolean | null
          requester_user_id: string
          serial_number: string
          status: Database["public"]["Enums"]["repair_status"]
          subtype: Database["public"]["Enums"]["repair_subtype"]
          updated_at?: string
        }
        Update: {
          assigned_service_partner_id?: string | null
          created_at?: string
          crm_case_id?: string | null
          crm_relation_id?: string | null
          crm_task_id?: string | null
          id?: string
          issue_type?: string
          notes?: string
          organization_id?: string
          photo_placeholder_count?: number
          received_at?: string
          replacement_offered?: boolean | null
          requester_user_id?: string
          serial_number?: string
          status?: Database["public"]["Enums"]["repair_status"]
          subtype?: Database["public"]["Enums"]["repair_subtype"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_cases_assigned_service_partner_id_fkey"
            columns: ["assigned_service_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_cases_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_logs: {
        Row: {
          cost_per_unit_eur: number | null
          created_at: string
          id: string
          invoiced: boolean
          parts_used: Json | null
          reason_unrepairable: string | null
          repair_case_id: string
          repair_successful: boolean
          technician_notes: string | null
        }
        Insert: {
          cost_per_unit_eur?: number | null
          created_at?: string
          id: string
          invoiced?: boolean
          parts_used?: Json | null
          reason_unrepairable?: string | null
          repair_case_id: string
          repair_successful: boolean
          technician_notes?: string | null
        }
        Update: {
          cost_per_unit_eur?: number | null
          created_at?: string
          id?: string
          invoiced?: boolean
          parts_used?: Json | null
          reason_unrepairable?: string | null
          repair_case_id?: string
          repair_successful?: boolean
          technician_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_logs_repair_case_id_fkey"
            columns: ["repair_case_id"]
            isOneToOne: false
            referencedRelation: "repair_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          auth_user_id: string | null
          avatar_label: string | null
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          title: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_label?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          organization_id: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_label?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          actor_name: string
          actor_role: string
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          created_at: string
          description: string
          id: string
          metadata: Json
          status: string
          title: string
        }
        Insert: {
          actor_name: string
          actor_role: string
          case_id: string
          case_type: Database["public"]["Enums"]["case_type"]
          created_at: string
          description: string
          id: string
          metadata?: Json
          status: string
          title: string
        }
        Update: {
          actor_name?: string
          actor_role?: string
          case_id?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          status?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_organization_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_ordering_window_open: {
        Args: { target_month: string }
        Returns: boolean
      }
      is_staff_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "help_org"
        | "digidromen_staff"
        | "digidromen_admin"
        | "service_partner"
      case_type: "order" | "repair" | "donation"
      crm_entity_name:
        | "organization"
        | "order"
        | "repair"
        | "donation"
        | "document"
        | "task"
      crm_sync_state: "queued" | "synced" | "failed" | "retrying"
      document_kind:
        | "request_attachment"
        | "repair_report"
        | "shipping_note"
        | "pickup_note"
        | "donation_report"
        | "other"
        | "data_wipe_certificate"
        | "connector_photo"
        | "invoice"
      document_storage_mode:
        | "metadata_only"
        | "supabase_storage"
        | "crm_reference"
      donation_status:
        | "TOEGEZEGD"
        | "OPHAALAFSPRAAK_GEPLAND"
        | "OPGEHAALD"
        | "AANGEKOMEN_WAREHOUSE"
        | "IN_VERWERKING"
        | "RAPPORTAGE_GEREED"
        | "OP_VOORRAAD"
      inventory_condition:
        | "new"
        | "refurbished"
        | "damaged"
        | "reserved"
        | "in_repair"
      message_kind: "internal" | "manual" | "system"
      notification_channel: "email" | "portal" | "system"
      notification_level: "info" | "success" | "warning" | "error"
      order_status:
        | "INGEDIEND"
        | "BEOORDEELD"
        | "IN_BEHANDELING"
        | "IN_VOORBEREIDING"
        | "VERZONDEN"
        | "GELEVERD"
        | "AFGESLOTEN"
        | "GEANNULEERD"
      organization_type:
        | "help_org"
        | "digidromen"
        | "service_partner"
        | "sponsor"
      priority_level: "low" | "normal" | "high" | "urgent"
      product_category: "laptop" | "accessory" | "service"
      repair_status:
        | "ONTVANGEN"
        | "DIAGNOSE"
        | "IN_REPARATIE"
        | "TEST"
        | "RETOUR"
        | "IRREPARABEL"
        | "AFGESLOTEN"
      repair_subtype: "GENERAL_REPAIR" | "ACCESSORY_ISSUE"
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
      app_role: [
        "help_org",
        "digidromen_staff",
        "digidromen_admin",
        "service_partner",
      ],
      case_type: ["order", "repair", "donation"],
      crm_entity_name: [
        "organization",
        "order",
        "repair",
        "donation",
        "document",
        "task",
      ],
      crm_sync_state: ["queued", "synced", "failed", "retrying"],
      document_kind: [
        "request_attachment",
        "repair_report",
        "shipping_note",
        "pickup_note",
        "donation_report",
        "other",
        "data_wipe_certificate",
        "connector_photo",
        "invoice",
      ],
      document_storage_mode: [
        "metadata_only",
        "supabase_storage",
        "crm_reference",
      ],
      donation_status: [
        "TOEGEZEGD",
        "OPHAALAFSPRAAK_GEPLAND",
        "OPGEHAALD",
        "AANGEKOMEN_WAREHOUSE",
        "IN_VERWERKING",
        "RAPPORTAGE_GEREED",
        "OP_VOORRAAD",
      ],
      inventory_condition: [
        "new",
        "refurbished",
        "damaged",
        "reserved",
        "in_repair",
      ],
      message_kind: ["internal", "manual", "system"],
      notification_channel: ["email", "portal", "system"],
      notification_level: ["info", "success", "warning", "error"],
      order_status: [
        "INGEDIEND",
        "BEOORDEELD",
        "IN_BEHANDELING",
        "IN_VOORBEREIDING",
        "VERZONDEN",
        "GELEVERD",
        "AFGESLOTEN",
        "GEANNULEERD",
      ],
      organization_type: [
        "help_org",
        "digidromen",
        "service_partner",
        "sponsor",
      ],
      priority_level: ["low", "normal", "high", "urgent"],
      product_category: ["laptop", "accessory", "service"],
      repair_status: [
        "ONTVANGEN",
        "DIAGNOSE",
        "IN_REPARATIE",
        "TEST",
        "RETOUR",
        "IRREPARABEL",
        "AFGESLOTEN",
      ],
      repair_subtype: ["GENERAL_REPAIR", "ACCESSORY_ISSUE"],
    },
  },
} as const
