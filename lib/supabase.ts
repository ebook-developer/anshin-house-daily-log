import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
