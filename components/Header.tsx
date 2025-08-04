"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { CalendarDays, Plus, Settings, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/record", label: "記録追加", icon: Plus, variant: "default" as const },
    { href: "/calendar", label: "カレンダーで見る", icon: CalendarDays, variant: "outline" as const },
    { href: "/settings", label: "各種設定", icon: Settings, variant: "outline" as const },
  ];

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              <Home className="h-7 w-7 text-blue-600" />
              <span>あんしん住宅活動日報</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} passHref>
                <Button
                  variant={link.variant}
                  size="sm"
                  className={cn(
                    // 現在のパスと一致する場合に少し強調する（任意）
                    pathname === link.href && "ring-2 ring-ring ring-offset-2"
                  )}
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}