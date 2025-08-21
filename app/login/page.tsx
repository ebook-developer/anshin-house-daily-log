'use client'

import { useState } from 'react'
// ▼▼▼ 修正: useRouter をインポート文から削除 ▼▼▼
// import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  // ▼▼▼ 修正: 未使用の router の定義を削除 ▼▼▼
  // const router = useRouter()
  const supabase = createClient()

  // Supabaseに登録した共有アカウントのメールアドレス
  const TEAM_EMAIL = 'ebookcloud.developer@gmail.com'

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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