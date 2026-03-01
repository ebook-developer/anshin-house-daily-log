-- =================================================================
-- Anshin House Daily Log: Master Baseline Schema
-- Description: これまでの全ての修正履歴を統合した、再現性100%の基準設計
-- =================================================================

-- 1. クリーンアップ（依存関係を考慮した順序での削除）
DROP VIEW IF EXISTS public.user_with_last_activity;
DROP TABLE IF EXISTS public.activity_records;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.staff;
DROP TABLE IF EXISTS public.activity_types;

-- 2. スタッフテーブル
CREATE TABLE public.staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 利用者テーブル (Master DB連携キャッシュ)
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_uid TEXT UNIQUE NOT NULL, -- 外部システム(anshinhousedb)のID
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 活動種別テーブル
CREATE TABLE public.activity_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 活動記録テーブルの定義変更
CREATE TABLE public.activity_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id),
  activity_type_id UUID NOT NULL REFERENCES public.activity_types(id),
  activity_date DATE NOT NULL,
  
  -- 旧カラム：将来的な詳細記録の可能性のためNULL許容で残すが、UIからは廃止
  start_time TIME,
  end_time TIME,
  
  -- 【新設】現場ファーストの分数入力（30分、60分など数値を直接保持）
  duration_minutes INTEGER DEFAULT 0,
  
  task_time TIME, -- タスク用の希望時間は維持
  content TEXT,
  is_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. インデックス設計 (検索・結合の高速化)
CREATE INDEX idx_activity_records_user_date ON public.activity_records(user_id, activity_date DESC);
CREATE INDEX idx_activity_records_date ON public.activity_records(activity_date);
CREATE INDEX idx_activity_records_status ON public.activity_records(is_completed); -- タスク抽出用に追加
CREATE INDEX idx_users_master_uid ON public.users(master_uid);

-- 7. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_staff_update BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_users_update BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER on_activity_records_update BEFORE UPDATE ON public.activity_records FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 8. 行単位セキュリティ (RLS) の設定
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_records ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー（全スタッフ）への権限委譲
CREATE POLICY "Enable all for authenticated users" ON public.staff FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.activity_types FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.activity_records FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 9. 【Viewの更新】集計時に duration_minutes をそのまま使えるようにする
-- （Viewの構造は変わりませんが、内部で不整合が起きないよう再作成します）
CREATE OR REPLACE VIEW public.user_with_last_activity AS
SELECT 
  u.id, u.name, u.master_uid, u.is_active,
  ar.activity_date AS last_activity_date,
  s.name AS last_activity_staff_name,
  COALESCE(CURRENT_DATE - ar.activity_date, 999) AS days_elapsed
FROM public.users u
LEFT JOIN LATERAL (
  SELECT activity_date, staff_id 
  FROM public.activity_records 
  WHERE user_id = u.id AND is_completed = true
  ORDER BY activity_date DESC, created_at DESC
  LIMIT 1
) ar ON true
LEFT JOIN public.staff s ON s.id = ar.staff_id;