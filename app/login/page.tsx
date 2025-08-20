// app/login/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // ▼▼▼ チームで共有する固定のメールアドレスをここで定義 ▼▼▼
  // Supabaseに登録した共有アカウントのメールアドレスに書き換えてください
  const TEAM_EMAIL = 'ebookcloud.developer@gmail.com'

  // ▼▼▼ emailのStateは不要になったので削除 ▼▼▼
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      // ▼▼▼ emailには固定のTEAM_EMAILを使用 ▼▼▼
      email: TEAM_EMAIL,
      password,
    })

    if (error) {
      // エラーメッセージをより分かりやすく調整
      if (error.message === 'Invalid login credentials') {
        setError('パスワードが正しくありません。')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    // ログイン成功後、ダッシュボード（ホームページ）に遷移
    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          <CardDescription>
            {/* ▼▼▼ 説明文を修正 ▼▼▼ */}
            チームで共有しているパスワードを入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* ▼▼▼ メールアドレスの入力欄を完全に削除 ▼▼▼ */}
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