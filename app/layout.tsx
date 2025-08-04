// 1. 必要なモジュールをインポートします
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import './globals.css';
import Header from '@/components/Header'; // ★★★ 修正点1: 新しいヘッダーをインポート ★★★

// 2. Metadataオブジェクトを定義します（あなたの要望に合わせて更新）
export const metadata: Metadata = {
  title: 'あんしん住宅活動日報', 
  description: '日々の活動記録を管理するためのアプリケーション',
};

// 3. RootLayoutコンポーネントを修正します
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 4. <html>タグのフォント設定は、あなたの既存のものをそのまま維持します
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      
      {/* 5. <body>タグのフォント設定も、あなたの既存のものをそのまま維持します */}
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
      )}>
        {/* ▼▼▼▼▼▼▼▼▼▼ 修正点2: ここにヘッダーを追加 ▼▼▼▼▼▼▼▼▼▼ */}
        <Header />
        {children}
        {/* ▲▲▲▲▲▲▲▲▲▲ ここまでが修正点 ▲▲▲▲▲▲▲▲▲▲ */}
      </body>
    </html>
  );
}