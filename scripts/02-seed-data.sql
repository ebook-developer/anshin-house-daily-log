-- サンプルデータの投入

-- スタッフデータ
INSERT INTO staff (name, email) VALUES
('田中 太郎', 'tanaka@example.com'),
('佐藤 花子', 'sato@example.com'),
('鈴木 次郎', 'suzuki@example.com'),
('高橋 美咲', 'takahashi@example.com')
ON CONFLICT (email) DO NOTHING;

-- 活動種別データ
INSERT INTO activity_types (name, color) VALUES
('定期訪問', '#10B981'),
('相談対応', '#3B82F6'),
('緊急対応', '#EF4444'),
('電話連絡', '#8B5CF6'),
('書類手続き', '#F59E0B'),
('医療同行', '#EC4899')
ON CONFLICT DO NOTHING;

-- 利用者データ（サンプル）
INSERT INTO users (name, phone, address, assigned_staff_id) 
SELECT 
  name,
  phone,
  address,
  (SELECT id FROM staff ORDER BY RANDOM() LIMIT 1)
FROM (VALUES
  ('山田 一郎', '090-1234-5678', '東京都渋谷区1-1-1'),
  ('田中 二郎', '090-2345-6789', '東京都新宿区2-2-2'),
  ('佐藤 三郎', '090-3456-7890', '東京都港区3-3-3'),
  ('鈴木 四郎', '090-4567-8901', '東京都品川区4-4-4'),
  ('高橋 五郎', '090-5678-9012', '東京都目黒区5-5-5'),
  ('伊藤 六郎', '090-6789-0123', '東京都世田谷区6-6-6'),
  ('渡辺 七郎', '090-7890-1234', '東京都杉並区7-7-7'),
  ('中村 八郎', '090-8901-2345', '東京都練馬区8-8-8')
) AS sample_users(name, phone, address);

-- 活動記録サンプルデータ
INSERT INTO activity_records (user_id, staff_id, activity_type_id, activity_date, content)
SELECT 
  u.id,
  s.id,
  at.id,
  CURRENT_DATE - (RANDOM() * 180)::INTEGER,
  CASE 
    WHEN at.name = '定期訪問' THEN '定期的な安否確認を実施。健康状態良好。'
    WHEN at.name = '相談対応' THEN '生活に関する相談を受けました。'
    WHEN at.name = '電話連絡' THEN '電話にて近況確認を行いました。'
    ELSE '支援活動を実施しました。'
  END
FROM users u
CROSS JOIN staff s
CROSS JOIN activity_types at
WHERE RANDOM() < 0.3
LIMIT 50;
