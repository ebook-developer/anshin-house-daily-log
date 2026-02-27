// app/record/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { EditRecordForm } from "@/components/EditRecordForm"

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id: recordId } = await params // Next.js 16 の非同期 params 解決

  // 【最高峰の並列フェッチ】必要なマスタと編集データを一度に取得
  const [
    { data: recordData, error: recordError },
    { data: staffData },
    { data: activityTypesData }
  ] = await Promise.all([
    supabase.from("activity_records").select(`*, users (name)`).eq("id", recordId).single(),
    supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
    supabase.from("activity_types").select("id, name").eq("is_active", true).order("name"),
  ])

  if (recordError || !recordData) {
    return notFound()
  }

  // クライアントコンポーネントへ初期値を渡す
  return (
    <div className="max-w-4xl mx-auto py-6">
      <EditRecordForm 
        initialRecord={recordData}
        userName={(recordData.users as any)?.name || "不明な利用者"}
        staffList={staffData || []}
        activityTypes={activityTypesData || []}
      />
    </div>
  )
}