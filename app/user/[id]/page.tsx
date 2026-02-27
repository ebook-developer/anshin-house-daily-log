// app/user/[id]/page.tsx
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { UserDetailView } from "@/components/UserDetailView"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id: userId } = await params // Next.js 16 の非同期 params 解決

  // 【最高峰の並列フェッチ】
  const [
    { data: user, error: userError },
    { data: activitiesData }
  ] = await Promise.all([
    supabase.from("users").select("id, name, master_uid").eq("id", userId).single(),
    supabase.from("activity_records")
      .select(`id, activity_date, start_time, end_time, task_time, content, is_completed, staff:staff_id (name), activity_types:activity_type_id (name)`)
      .eq("user_id", userId)
      .order("activity_date", { ascending: false })
      .order("start_time", { ascending: false })
  ])

  if (userError || !user) {
    return notFound()
  }

  // クライアントコンポーネントに必要なデータを渡す
  // ネストされた staff や activity_types の情報をフラットに整形してから渡すのがプロの作法です
  const formattedActivities = (activitiesData || []).map((record) => ({
    id: record.id,
    activity_date: record.activity_date,
    start_time: record.start_time,
    end_time: record.end_time,
    task_time: record.task_time,
    content: record.content,
    staff_name: (record.staff as any)?.name ?? '未割り当て',
    activity_type_name: (record.activity_types as any)?.name ?? '不明',
    is_completed: record.is_completed ?? true,
  }))

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">利用者詳細</h1>
        <Link href="/">
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />ダッシュボードに戻る</Button>
        </Link>
      </div>
      
      <UserDetailView 
        user={user} 
        initialActivities={formattedActivities} 
      />
    </div>
  )
}