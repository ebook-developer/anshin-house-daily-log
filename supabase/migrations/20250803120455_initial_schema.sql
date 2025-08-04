-- =================================================================
-- anshin-house-daily-log: 完全版テーブル定義スキーマ
-- 目的: マスターシステム(anshin-house-db)との連携を前提とした構造
-- =================================================================

-- 念のため、既存のテーブルを依存関係を考慮して削除
DROP TABLE IF EXISTS activity_records;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS activity_types;

-- =================================================================
-- 1. スタッフテーブル (staff)
-- =================================================================
CREATE TABLE public.staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.staff IS 'このシステム内で活動記録を付けるスタッフの情報';

-- =================================================================
-- 2. 利用者テーブル (users)
-- ★ 今回のアーキテクチャ変更の核心となるテーブル
-- =================================================================
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- マスターシステム(anshin-house-db)の利用者UIDを格納する。
  -- この列をキーとして、2つのシステムを連携させる。
  -- UNIQUE制約により、同じマスター利用者が重複して登録されるのを防ぎ、
  -- upsert(onConflict)の対象として機能する。
  master_uid TEXT UNIQUE NOT NULL,

  -- マスターシステムの氏名を同期・キャッシュするための列。
  -- 表示のたびにAPIを叩く必要がなくなり、パフォーマンスが向上する。
  name TEXT NOT NULL,
  
  -- phone, address, notes, assigned_staff_id は活動記録システム独自の
  -- メモや担当者情報として残すことも可能だが、マスターで管理するなら不要。
  -- 今回はシンプルな連携のため、これらは含めない構成とする。
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.users IS 'マスターシステムの利用者の情報を同期・キャッシュするためのテーブル';

-- =================================================================
-- 3. 活動種別テーブル (activity_types)
-- =================================================================
CREATE TABLE public.activity_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.activity_types IS '「定期訪問」「買い物同行」などの活動の種類を定義';

-- =================================================================
-- 4. 活動記録テーブル (activity_records)
-- =================================================================
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

-- =================================================================
-- 5. パフォーマンス向上のためのインデックス作成
-- =================================================================
-- 活動記録を、利用者ごと・日付順で高速に検索するために作成
CREATE INDEX idx_activity_records_user_date ON public.activity_records(user_id, activity_date DESC);
-- 特定の日付の活動記録を高速に検索するために作成
CREATE INDEX idx_activity_records_date ON public.activity_records(activity_date);
-- upsertや検索のパフォーマンス向上のため、master_uidにもインデックスを作成
CREATE INDEX idx_users_master_uid ON public.users(master_uid);

-- =================================================================
-- 6. updated_at を自動更新するためのトリガー設定
-- =================================================================
-- トリガー関数を作成
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを適用
CREATE TRIGGER on_staff_update
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_users_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- =================================================================
-- スキーマ設定完了
-- =================================================================