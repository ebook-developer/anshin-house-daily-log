// app/page.tsx
import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/features/dashboard/components/DashboardContent"

export default async function DashboardPage() {
  const supabase = await createClient()

  // 【世界最高峰の最適化】
  // 前回のステップで作った View (user_with_last_activity) を使用します。
  // これにより、以前クライアント側で map を回して50回以上投げていたクエリを
  // サーバーサイドでの「たった1回」のクエリに凝縮しました。
  const [
    { data: usersWithActivity, error: usersError },
    { data: uncompletedTasks, error: tasksError },
    { data: staff, error: staffError },
    { data: monthlyActivities, error: monthlyError } // 分析用データも先行取得
  ] = await Promise.all([
    supabase.from("user_with_last_activity")
      .select("*")
      .eq("is_active", true)
      .order("days_elapsed", { ascending: false }),
    supabase.from("activity_records")
      .select(`*, users ( id, name ), staff ( name ), activity_types ( name )`)
      .eq('is_completed', false)
      .order('activity_date', { ascending: true }),
    supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
    supabase.from("activity_records")
      .select(`activity_date, start_time, end_time, staff ( name ), activity_types ( name, color )`)
      .eq('is_completed', true) // 実績のみ
  ])

  if (usersError || tasksError || staffError || monthlyError) {
    console.error("Dashboard Fetch Error:", { usersError, tasksError, staffError, monthlyError })
    throw new Error("データの取得に失敗しました。")
  }

  return (
    <DashboardContent 
      initialUsers={usersWithActivity || []}
      initialTasks={uncompletedTasks || []}
      staffList={staff || []}
      allActivityHistory={monthlyActivities || []}
    />
  )
}