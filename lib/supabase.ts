import { createClient } from '@supabase/supabase-js'

// 1. 自動生成された「設計図」をインポートする
import { Database } from './database.types'

// Supabase環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase環境変数が設定されていません。.env.localファイルにNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。",
  )
}

// 2. インポートした型<Database>を適用して、クライアントを作成する
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)