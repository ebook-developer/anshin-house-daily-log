-- =================================================================
-- anshin-house-daily-log: 完全セットアップスキーマ (セキュリティ設定込み)
-- 目的: テーブル定義とRLSポリシーを一度に設定し、安全なDBを構築する
-- =================================================================

-- ========= セクション 0: 既存テーブルのクリーンアップ =========
-- 依存関係を考慮して既存のテーブルを削除
DROP TABLE IF EXISTS public.activity_records;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.staff;
DROP TABLE IF EXISTS public.activity_types;


-- ========= セクション 1: スタッフテーブル (staff) =========
CREATE TABLE public.staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.staff IS 'このシステム内で活動記録を付けるスタッフの情報';


-- ========= セクション 2: 利用者テーブル (users) =========
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.users IS 'マスターシステムの利用者の情報を同期・キャッシュするためのテーブル';


-- ========= セクション 3: 活動種別テーブル (activity_types) =========
CREATE TABLE public.activity_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.activity_types IS '「定期訪問」「買い物同行」などの活動の種類を定義';


-- ========= セクション 4: 活動記録テーブル (activity_records) =========
CREATE TABLE public.activity_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  activity_type_id UUID NOT NULL REFERENCES public.activity_types(id),
  activity_date DATE NOT NULL,
  content TEXT NOT NULL,
  has_next_appointment BOOLEAN DEFAULT false,
  next_appointment_date DATE,
  next_appointment_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.activity_records IS '日々の活動記録の本体';


-- ========= セクション 5: パフォーマンス向上のためのインデックス作成 =========
CREATE INDEX idx_activity_records_user_date ON public.activity_records(user_id, activity_date DESC);
CREATE INDEX idx_activity_records_date ON public.activity_records(activity_date);
CREATE INDEX idx_users_master_uid ON public.users(master_uid);


-- ========= セクション 6: updated_at を自動更新するためのトリガー設定 =========
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_staff_update
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_users_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();


-- ========= セクション 7: 行単位セキュリティ(RLS)の有効化 =========
-- これにより、デフォルトで全てのアクセスがブロックされ、安全な状態になります。
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_records ENABLE ROW LEVEL SECURITY;


-- ========= セクション 8: アクセスポリシーの作成 =========
-- アプリケーションがデータにアクセスできるように、ルールを定義します。

-- --- 読み取り (SELECT) ポリシー ---
-- ログインしているユーザーは、全てのデータを読み取れる
CREATE POLICY "Allow authenticated read access" ON public.staff FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.activity_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.activity_records FOR SELECT USING (auth.role() = 'authenticated');

-- --- 書き込み (INSERT) ポリシー ---
-- ログインしているユーザーは、全てのテーブルに新しいデータを追加できる
CREATE POLICY "Allow authenticated insert access" ON public.staff FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.activity_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.activity_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- --- 更新 (UPDATE) ポリシー ---
-- ログインしているユーザーは、全てのテーブルのデータを更新できる
CREATE POLICY "Allow authenticated update access" ON public.staff FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.users FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.activity_types FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.activity_records FOR UPDATE USING (auth.role() = 'authenticated');

-- --- 削除 (DELETE) ポリシー ---
-- ログインしているユーザーは、全てのテーブルのデータを削除できる
CREATE POLICY "Allow authenticated delete access" ON public.staff FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access" ON public.users FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access" ON public.activity_types FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete access" ON public.activity_records FOR DELETE USING (auth.role() = 'authenticated');

-- =================================================================
-- スキーマ設定完了
-- =================================================================