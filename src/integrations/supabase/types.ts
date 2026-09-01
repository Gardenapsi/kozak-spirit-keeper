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
      event_items: {
        Row: {
          allocated_qty: number
          created_at: string
          event_id: string
          id: string
          product_id: string
          returned_qty: number
          sold_qty: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          allocated_qty?: number
          created_at?: string
          event_id: string
          id?: string
          product_id: string
          returned_qty?: number
          sold_qty?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          allocated_qty?: number
          created_at?: string
          event_id?: string
          id?: string
          product_id?: string
          returned_qty?: number
          sold_qty?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_name: string
          kind: Database["public"]["Enums"]["movement_kind"]
          product_id: string | null
          quantity: number
          reason: string | null
          supply_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_name: string
          kind: Database["public"]["Enums"]["movement_kind"]
          product_id?: string | null
          quantity: number
          reason?: string | null
          supply_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_name?: string
          kind?: Database["public"]["Enums"]["movement_kind"]
          product_id?: string | null
          quantity?: number
          reason?: string | null
          supply_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_supplies: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty_per_unit: number
          supply_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty_per_unit?: number
          supply_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty_per_unit?: number
          supply_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_supplies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplies_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          id: string
          is_premium: boolean
          launch_date: string | null
          min_stock: number
          name: string
          notes: string | null
          price: number | null
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          stock_qty: number
          updated_at: string
          volume_ml: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          id?: string
          is_premium?: boolean
          launch_date?: string | null
          min_stock?: number
          name: string
          notes?: string | null
          price?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock_qty?: number
          updated_at?: string
          volume_ml?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          id?: string
          is_premium?: boolean
          launch_date?: string | null
          min_stock?: number
          name?: string
          notes?: string | null
          price?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock_qty?: number
          updated_at?: string
          volume_ml?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          event_name: string | null
          id: string
          item_name: string
          product_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          item_name: string
          product_id?: string | null
          quantity: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          item_name?: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          created_at: string
          id: string
          min_stock: number
          name: string
          notes: string | null
          sort_order: number
          stock_qty: number
          type: Database["public"]["Enums"]["supply_type"]
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          notes?: string | null
          sort_order?: number
          stock_qty?: number
          type?: Database["public"]["Enums"]["supply_type"]
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          notes?: string | null
          sort_order?: number
          stock_qty?: number
          type?: Database["public"]["Enums"]["supply_type"]
          unit?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
      event_status: "planejado" | "ativo" | "finalizado"
      movement_kind: "entrada" | "saida" | "ajuste"
      product_category: "cachaca" | "licor" | "vodka" | "edicao_limitada"
      product_status: "ativo" | "em_breve" | "descontinuado"
      supply_type:
        | "garrafa"
        | "tampa"
        | "rotulo"
        | "copo"
        | "caixa_madeira"
        | "outro"
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
      app_role: ["admin", "operador"],
      event_status: ["planejado", "ativo", "finalizado"],
      movement_kind: ["entrada", "saida", "ajuste"],
      product_category: ["cachaca", "licor", "vodka", "edicao_limitada"],
      product_status: ["ativo", "em_breve", "descontinuado"],
      supply_type: [
        "garrafa",
        "tampa",
        "rotulo",
        "copo",
        "caixa_madeira",
        "outro",
      ],
    },
  },
} as const
