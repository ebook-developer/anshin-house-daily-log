'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react' // アイコンを追加

export default function LoginPage() {
  const supabase = createClient()
  const TEAM_EMAIL = 'ebookcloud.developer@gmail.com'
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ▼▼▼ 環境変数からメンテナンスモードの状態を読み込む ▼▼▼
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: TEAM_EMAIL,
      password,
    })

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('パスワードが正しくありません。')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  // ▼▼▼ メンテナンスモードの場合の表示を定義 ▼▼▼
  if (isMaintenanceMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-yellow-100 rounded-full p-3 w-fit">
              <ShieldAlert className="h-8 w-8 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl font-bold mt-4">システムメンテナンスのお知らせ</CardTitle>
            <CardDescription className="pt-2">
              現在、新機能追加のためのシステムメンテナンスを実施しております。<br />
              ご不便をおかけいたしますが、作業完了まで今しばらくお待ちください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              完了予定: 8月XX日 XX:XX頃
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ▼▼▼ 通常時の表示 ▼▼▼
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          <CardDescription>
            チームで共有しているパスワードを入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}