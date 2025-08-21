"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { CalendarDays, Plus, Settings, Home, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

export default function Header() {
  const pathname = usePathname();
  
  const masterDbUrl = process.env.NEXT_PUBLIC_MASTER_DB_URL || "/";

  const navLinks = [
    // ▼▼▼ 修正: 「記録追加」をプライマリアクションとして variant="default" に変更 ▼▼▼
    { href: "/record", label: "記録追加", icon: Plus, variant: "default" as const },
    { href: "/calendar", label: "カレンダー", icon: CalendarDays, variant: "outline" as const },
    { href: "/settings", label: "各種設定", icon: Settings, variant: "outline" as const },
  ];

  return (
    <div className="mb-8">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {/* ▼▼▼ 修正: Homeアイコンにブランドカラー (青) を適用 ▼▼▼ */}
                <Home className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                <span className="text-lg sm:text-xl">あんしん住宅活動日報</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              
              <Button asChild variant="ghost" size="sm">
                <a href={masterDbUrl} target="_blank" rel="noopener noreferrer">
                  <Database className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">利用者マスター</span>
                </a>
              </Button>

              <Separator orientation="vertical" className="h-6" />
              
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} passHref>
                  <Button
                    variant={link.variant}
                    size="sm"
                    className={cn(
                      pathname === link.href && "ring-2 ring-ring ring-offset-2"
                    )}
                  >
                    <link.icon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </Button>
                </Link>
              ))}

            </div>
          </div>
        </div>
      </header>
    </div>
  )
}