export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BillSize = 'A4' | 'A5' | 'thermal_80mm' | 'thermal_58mm'

export type DiscountType = 'none' | 'percent' | 'fixed'

export interface BillItem {
  name: string
  qty: number
  price: number
  gst_percent: number
}

export interface ProductEntry {
  name: string
  price: number
  gst_percent: number
}

export interface ExtraCharge {
  label: string
  amount: number
}

// TODO: Auto-generate with: npx supabase gen types typescript --project-id vkigqwpxjvatdtygqbju > src/types/database.ts

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          shop_name: string
          shop_address: string
          gst_number: string
          owner_phone: string
          logo_url: string | null
          bill_size: BillSize
          whatsapp_message_template: string
          whatsapp_api_url: string | null
          whatsapp_api_key: string | null
          whatsapp_instance_id: string | null
          user_id: string
          whatsapp_enabled: boolean
          default_gst: number
          whatsapp_provider: string | null
          whatsapp_webhook_url: string | null
          whatsapp_webhook_payload: string | null
          products: ProductEntry[]
          username: string
          next_billing_date: string
          created_at: string
          whatsapp_automation_enabled: boolean | null
          whatsapp_api_token: string | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          id?: string
          shop_name: string
          shop_address: string
          gst_number: string
          owner_phone: string
          logo_url?: string | null
          bill_size?: BillSize
          whatsapp_message_template?: string
          whatsapp_api_url?: string | null
          whatsapp_api_key?: string | null
          whatsapp_instance_id?: string | null
          user_id?: string
          whatsapp_enabled?: boolean
          default_gst?: number
          whatsapp_provider?: string | null
          whatsapp_webhook_url?: string | null
          whatsapp_webhook_payload?: string | null
          products?: ProductEntry[]
          username?: string
          next_billing_date?: string
          created_at?: string
          whatsapp_automation_enabled?: boolean | null
          whatsapp_api_token?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          id?: string
          shop_name?: string
          shop_address?: string
          gst_number?: string
          owner_phone?: string
          logo_url?: string | null
          bill_size?: BillSize
          whatsapp_message_template?: string
          whatsapp_api_url?: string | null
          whatsapp_api_key?: string | null
          whatsapp_instance_id?: string | null
          user_id?: string
          whatsapp_enabled?: boolean
          default_gst?: number
          whatsapp_provider?: string | null
          whatsapp_webhook_url?: string | null
          whatsapp_webhook_payload?: string | null
          products?: ProductEntry[]
          username?: string
          next_billing_date?: string
          created_at?: string
          whatsapp_automation_enabled?: boolean | null
          whatsapp_api_token?: string | null
          whatsapp_phone_number_id?: string | null
        }
      }
      bills: {
        Row: {
          id: string
          client_id: string
          customer_name: string
          customer_phone: string
          bill_number: string
          bill_date: string
          items: BillItem[]
          subtotal: number
          gst_amount: number
          total: number
          discount_type: DiscountType
          discount_value: number
          discount_amount: number
          extra_charges: ExtraCharge[]
          whatsapp_sent: boolean
          whatsapp_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          customer_name: string
          customer_phone: string
          bill_number?: string
          bill_date?: string
          items: BillItem[]
          subtotal: number
          gst_amount: number
          total: number
          discount_type?: DiscountType
          discount_value?: number
          discount_amount?: number
          extra_charges?: ExtraCharge[]
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          customer_name?: string
          customer_phone?: string
          bill_number?: string
          bill_date?: string
          items?: BillItem[]
          subtotal?: number
          gst_amount?: number
          total?: number
          discount_type?: DiscountType
          discount_value?: number
          discount_amount?: number
          extra_charges?: ExtraCharge[]
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      bill_size: BillSize
    }
  }
}
