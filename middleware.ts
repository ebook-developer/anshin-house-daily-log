// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // =================================================================
  // 1. メンテナンスモードのチェック (最優先)
  // =================================================================
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  // メンテナンスモードが有効な場合
  if (isMaintenanceMode) {
    // 表示を許可するメンテナンスページ自体へのアクセスは除外
    if (pathname === '/maintenance') {
      return NextResponse.next();
    }
    // それ以外のすべてのアクセスをメンテナンスページへリダイレクト
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // メンテナンスモードが無効な時に、メンテナンスページへアクセスされた場合
  if (!isMaintenanceMode && pathname === '/maintenance') {
    // ホームページへリダイレクト
    return NextResponse.redirect(new URL('/', request.url));
  }

  // =================================================================
  // 2. Supabase認証とセッション管理 (メンテナンスモードでない場合のみ実行)
  // =================================================================
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

  // ユーザーのセッション情報を取得
  const { data: { user } } = await supabase.auth.getUser()

  // ログインしていない、かつ、アクセス先がログインページでない場合
  if (!user && pathname !== '/login') {
    // ログインページへリダイレクト
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // ログイン済み、かつ、アクセス先がログインページの場合
  if (user && pathname === '/login') {
    // ダッシュボード（ホームページ）へリダイレクト
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// ミドルウェアを適用するパス
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}