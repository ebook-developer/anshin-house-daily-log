// app/layout.tsx

// 1. 必要なモジュールをインポートします
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils'; // この行は、もしなければ後で追加するので一旦そのままでOK
import './globals.css';

// 2. Metadataオブジェクトを定義します（ここは変更なし）
export const metadata: Metadata = {
  // titleはご自身のアプリ名に変更することをお勧めします
  title: '安心ハウス日誌', 
  description: '介護記録を管理するアプリケーション',
};

// 3. RootLayoutコンポーネントを修正します
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 4. <html>タグに言語(lang)とフォント変数を渡します
    //    suppressHydrationWarning は、万が一他の原因で軽微なエラーが起きてもUI表示を止めないためのお守りです
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      
      {/* 5. <head>タグは完全に削除します。Next.jsが自動生成するので不要です。 */}
      
      {/* 6. <body>タグに、フォントを適用するための基本クラスを設定します */}
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
        // もし `cn` が未定義でエラーになる場合は、一旦以下の行に置き換えてください
        // "min-h-screen bg-background font-sans antialiased"
      )}>
        {children}
      </body>
    </html>
  );
}