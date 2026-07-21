// Generated from Supabase project izbfawwmbilmsrdjaanw on 2026-07-19.
// Regenerate from the verified remote schema; do not maintain table or RPC shapes manually.
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
      activities: {
        Row: {
          activity_date: string | null
          activity_type: string
          company_id: string | null
          completed: boolean | null
          contact_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_type?: string
          company_id?: string | null
          completed?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          company_id?: string | null
          completed?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_pilot_recipients: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          link_id: string
          provider_status: number | null
          recipient_email: string
          recipient_name: string
          sent_at: string | null
          sent_by: string | null
          sequence: number
          status: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          link_id: string
          provider_status?: number | null
          recipient_email: string
          recipient_name: string
          sent_at?: string | null
          sent_by?: string | null
          sequence: number
          status?: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          link_id?: string
          provider_status?: number | null
          recipient_email?: string
          recipient_name?: string
          sent_at?: string | null
          sent_by?: string | null
          sequence?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_pilot_recipients_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "cu_links"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          legal_name: string | null
          name: string
          nit: string | null
          notes: string | null
          phone: string | null
          segment: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          legal_name?: string | null
          name: string
          nit?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          nit?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          company_name: string | null
          confidence: string | null
          contact_type: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_primary: boolean | null
          mobile_phone: string | null
          notes: string | null
          office_phone: string | null
          phone: string | null
          priority: number | null
          role: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          confidence?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_primary?: boolean | null
          mobile_phone?: string | null
          notes?: string | null
          office_phone?: string | null
          phone?: string | null
          priority?: number | null
          role?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          confidence?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_primary?: boolean | null
          mobile_phone?: string | null
          notes?: string | null
          office_phone?: string | null
          phone?: string | null
          priority?: number | null
          role?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cu_links: {
        Row: {
          company_id: string
          created_at: string
          email_to: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          responded_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email_to?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          responded_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email_to?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          responded_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cu_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cu_responses: {
        Row: {
          cargo_contacto_nuevo: string | null
          cargo_pagos_nuevo: string | null
          celular_comercial_nuevo: string | null
          company_id: string
          confirm_no_changes: boolean
          contacto_comercial_nuevo: string | null
          contacto_pagos_nuevo: string | null
          correo_comercial_nuevo: string | null
          correo_facturacion_nuevo: string | null
          correo_tesoreria_nuevo: string | null
          created_at: string
          direccion_nueva: string | null
          id: string
          link_id: string
          nit_nuevo: string | null
          observaciones_cliente: string | null
          payload: Json | null
          razon_social_nueva: string | null
          status: string
          telefono_tesoreria_nuevo: string | null
          token: string
        }
        Insert: {
          cargo_contacto_nuevo?: string | null
          cargo_pagos_nuevo?: string | null
          celular_comercial_nuevo?: string | null
          company_id: string
          confirm_no_changes?: boolean
          contacto_comercial_nuevo?: string | null
          contacto_pagos_nuevo?: string | null
          correo_comercial_nuevo?: string | null
          correo_facturacion_nuevo?: string | null
          correo_tesoreria_nuevo?: string | null
          created_at?: string
          direccion_nueva?: string | null
          id?: string
          link_id: string
          nit_nuevo?: string | null
          observaciones_cliente?: string | null
          payload?: Json | null
          razon_social_nueva?: string | null
          status?: string
          telefono_tesoreria_nuevo?: string | null
          token: string
        }
        Update: {
          cargo_contacto_nuevo?: string | null
          cargo_pagos_nuevo?: string | null
          celular_comercial_nuevo?: string | null
          company_id?: string
          confirm_no_changes?: boolean
          contacto_comercial_nuevo?: string | null
          contacto_pagos_nuevo?: string | null
          correo_comercial_nuevo?: string | null
          correo_facturacion_nuevo?: string | null
          correo_tesoreria_nuevo?: string | null
          created_at?: string
          direccion_nueva?: string | null
          id?: string
          link_id?: string
          nit_nuevo?: string | null
          observaciones_cliente?: string | null
          payload?: Json | null
          razon_social_nueva?: string | null
          status?: string
          telefono_tesoreria_nuevo?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "cu_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cu_responses_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "cu_links"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_activities: {
        Row: {
          activity_date: string | null
          activity_type: string
          completed: boolean
          contact_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          prospect_id: string
        }
        Insert: {
          activity_date?: string | null
          activity_type?: string
          completed?: boolean
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          prospect_id: string
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          completed?: boolean
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          prospect_id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          prospect_id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          prospect_id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_lists: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          segment: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          segment?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          segment?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          confidence_score: number | null
          converted_company_id: string | null
          created_at: string
          id: string
          legal_name: string | null
          list_id: string | null
          nit: string | null
          notes: string | null
          phone: string | null
          priority: string
          segment: string | null
          source: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          confidence_score?: number | null
          converted_company_id?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          list_id?: string | null
          nit?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string
          segment?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          confidence_score?: number | null
          converted_company_id?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          list_id?: string | null
          nit?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string
          segment?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_converted_company_id_fkey"
            columns: ["converted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "prospect_lists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_cu_response: {
        Args: { p_response_id: string }
        Returns: undefined
      }
      claim_campaign_pilot_batch: {
        Args: { p_sent_by: string }
        Returns: {
          claimed_at: string | null
          created_at: string
          id: string
          link_id: string
          provider_status: number | null
          recipient_email: string
          recipient_name: string
          sent_at: string | null
          sent_by: string | null
          sequence: number
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "campaign_pilot_recipients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      convert_prospect_to_company: {
        Args: { p_notes?: string; p_prospect_id: string }
        Returns: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          legal_name: string | null
          name: string
          nit: string | null
          notes: string | null
          phone: string | null
          segment: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_prospect: { Args: { p_prospect_id: string }; Returns: boolean }
      get_cu_form: { Args: { p_token: string }; Returns: Json }
      get_cu_pending_reviews: {
        Args: never
        Returns: {
          cliente: string
          company_id: string
          correo_actual: string
          created_at: string
          direccion_actual: string
          nit_actual: string
          payload: Json
          razon_social_actual: string
          response_id: string
          status: string
          telefono_actual: string
        }[]
      }
      is_crm_authorized: { Args: never; Returns: boolean }
      reject_cu_response: {
        Args: { p_response_id: string }
        Returns: undefined
      }
      submit_cu_form: {
        Args: { p_payload: Json; p_token: string }
        Returns: string
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
