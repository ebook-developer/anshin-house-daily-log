import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ▼▼▼▼▼▼▼▼▼▼ ここからが重要な追加箇所です ▼▼▼▼▼▼▼▼▼▼
  
  // ユーザーのセッション情報を取得
  const { data: { user } } = await supabase.auth.getUser()

  // ログインしていない、かつ、アクセス先がログインページでない場合
  if (!user && request.nextUrl.pathname !== '/login') {
    // ログインページへリダイレクト
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // ログイン済み、かつ、アクセス先がログインページの場合
  if (user && request.nextUrl.pathname === '/login') {
    // ダッシュボード（ホームページ）へリダイレクト
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ▲▲▲▲▲▲▲▲▲▲ ここまでが重要な追加箇所です ▲▲▲▲▲▲▲▲▲▲

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}