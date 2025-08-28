//app/layout.tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'あんしん住宅活動日報', 
  description: '日々の活動記録を管理するためのアプリケーション',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
      )}>
        <Header />

        {/* ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ */}
        {/* max-w-7xl を max-w-6xl に変更して、左右の余白を広げます。           */}
        {/* もっと余白が欲しければ、max-w-5xl や max-w-4xl に変更してください。 */}
        {/* ==================================================================== */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

      </body>
    </html>
  );
}