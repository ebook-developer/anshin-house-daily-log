これまでのリファクタリング（基盤の刷新、セキュリティの要塞化、Next.js 16対応）の内容を反映し、**「現在の最新状態」**を正しく伝えるプロフェッショナルなREADMEに修正しました。

新しく参加するエンジニアが、なぜこの構成になっているのかを即座に理解し、迷わず開発を継続できるように構成しています。

---

# 居住支援記録システム (Anshin House Daily Log)

居住支援事業者向けの、**プロアクティブ（予防的）な利用者ケア**を実現するための、モダンな活動記録・タスク管理システムです。
ITスキルに自信のないスタッフでも直感的に使えるシンプルなUIと、データに基づいた意思決定を支援する高度な機能を両立。

このシステムは、外部の**利用者マスターDB (`anshinhousedb`)**からServer-to-Server通信で名簿を安全に同期して動作するサテライトシステムです。

---

## 🚀 主要機能

### 📊 インテリジェント・ダッシュボード
- **チームのToDoリスト**: 期限の近い未完了タスクを優先表示。
- **活動分析ビュー**: スタッフ別・活動種別ごとの稼働状況を可視化（Recharts採用）。
- **要注意利用者アラート**: 90日以上未接触の利用者を自動ハイライト。

### 📝 記録・タスクの統合管理
- **デュアルモード入力**: 「実施済みの活動」と「未来のタスク」を一括管理。
- **マスター同期**: 新規登録時、外部DBから利用者の氏名とUIDを安全に取得・キャッシュ。

### 📅 多機能カレンダー
- **状態別色分け**: 実績（緑）、タスク（黄）、期限切れ（赤）を直感的に識別。

---

## 🛠️ 技術スタック（2026年2月最新版）

本システムは、2025年末に発覚したNext.jsの脆弱性(CVE-2025-66478)への完全な対策と、10年先も通用する保守性を確保するため、最新世代のスタックを採用しています。

- **フレームワーク**: **Next.js 16.1.1 (Turbopack)**
- **UIライブラリ**: **React 19.0 (React Server Components準拠)**
- **言語**: TypeScript 5.9 (Strict mode)
- **データベース**: Supabase (PostgreSQL + Auth + SSR)
- **バリデーション**: Zod 3.25
- **静的解析**: ESLint 9 (Flat Config)
- **ディレクトリ構造**: `app/` 直下配置 (srcなし構成)

---

## 🔐 セキュリティ・アーキテクチャ

1.  **BFF (Backend For Frontend) パターン**:
    - 外部APIキー (`MASTER_DB_API_KEY`) はサーバーサイドに秘匿。
    - データの同期は Client Component から直接 `fetch` せず、**Server Actions** (`getMasterUsersAction`) を経由します。
2.  **Next.js 16 Proxy**:
    - 認証とリダイレクト制御は `proxy.ts` (旧 middleware.ts) で一元管理。
3.  **多層型防御**:
    - Supabase RLS (Row Level Security) によりDBレベルでアクセス権限を保護。

---

## 📦 セットアップ（開発環境）

### 1. 依存関係
- 同一マシン内の別ポート（通常は`3001`）で **`anshinhousedb`** が起動している必要があります。

### 2. 環境変数の設定 (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Master DB API (重要: NEXT_PUBLICを付けないこと)
MASTER_DB_API_URL=http://localhost:3001
MASTER_DB_API_KEY=your_secret_key
```

### 3. 開発コマンド
```bash
pnpm install
pnpm run dev   # 3000ポートで起動
pnpm lint      # ESLint 9 (Flat Config) による静的解析
pnpm type-check # TypeScript 型チェック
```

---

## 📑 開発・メンテナンス上の留意点

1.  **非同期 API への対応**:
    - Next.js 16の仕様により、`cookies()`, `headers()`, `params`, `searchParams` は Promise です。使用時は必ず `await` または `use()` フックを使用してください。
2.  **ESLint 設定**:
    - `eslint.config.mjs` を採用しています。`.eslintrc.json` は廃止されました。
    - `FlatCompat` を排した純粋な Flat Config 構成のため、プラグインの追加時は `eslint.config.mjs` を直接編集してください。
3.  **外部ライブラリの型解決**:
    - `react-resizable-panels` などのESM専用パッケージの型解決を安定させるため、ルートに `react-resizable-panels.d.ts` を配置し、`tsconfig.json` で `moduleResolution: "bundler"` を指定しています。

---

## 📈 現在のリファクタリング状況とロードマップ

2026年2月、以下の大規模なリファクタリング（Phase 1 & 2）を完了しました。
- [x] Next.js 16 / React 19 への移行と脆弱性パッチ適用
- [x] APIキーのサーバーサイド隠蔽（Server Actions化）
- [x] ESLint 循環参照エラーの解消と構成の近代化
- [x] 外部連携の疎通確認と JSON プロトコルの安定化

**今後の課題 (Phase 3 & 4):**
- [ ] ダッシュボードの Server Component 化（N+1クエリの解消）
- [ ] `date-fns` 導入による時間計算ロジックの堅牢化
- [ ] 詳細ページの Server-side Data Fetching 移行

---
**管理者**: EnChord / さつき
**最終更新**: 2026年2月26日