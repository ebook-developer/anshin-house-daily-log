import { createClient } from "@supabase/supabase-js"

// Supabase環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase環境変数が設定されていません。.env.localファイルにNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。",
  )
}

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// データベース型定義
export type Database = {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string
          name: string
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string
          phone: string | null
          address: string | null
          notes: string | null
          assigned_staff_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          assigned_staff_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          assigned_staff_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      activity_types: {
        Row: {
          id: string
          name: string
          color: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          is_active?: boolean
          created_at?: string
        }
      }
      activity_records: {
        Row: {
          id: string
          user_id: string
          staff_id: string
          activity_type_id: string
          activity_date: string
          content: string
          has_next_appointment: boolean
          next_appointment_date: string | null
          next_appointment_content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          staff_id: string
          activity_type_id: string
          activity_date: string
          content: string
          has_next_appointment?: boolean
          next_appointment_date?: string | null
          next_appointment_content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          staff_id?: string
          activity_type_id?: string
          activity_date?: string
          content?: string
          has_next_appointment?: boolean
          next_appointment_date?: string | null
          next_appointment_content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
