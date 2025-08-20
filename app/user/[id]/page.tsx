"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Clock, AlertTriangle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { Database } from "@/lib/database.types"

interface UserDetail {
  id: string
  name: string
  master_uid: string | null
}

interface ActivityRecord {
  id: string
  activity_date: string
  content: string
  staff_name: string
  activity_type_name: string
  activity_type_color: string | null
  has_next_appointment: boolean // ここは boolean のままでOK
  next_appointment_date: string | null
  next_appointment_content: string | null
}

type Staff = Database['public']['Tables']['staff']['Row']
type ActivityType = Database['public']['Tables']['activity_types']['Row']


export default function UserDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const userId = params.id as string
  const [user, setUser] = useState<UserDetail | null>(null)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const masterDbUrl = process.env.NEXT_PUBLIC_MASTER_DB_URL || "https://anshinhousedb.vercel.app";

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return
      try {
        setLoading(true);
        setError(null)
        const { data: userData, error: userError } = await supabase.from("users").select("id, name, master_uid").eq("id", userId).single()
        if (userError) throw userError
        if (userData) setUser(userData)

        const { data: activitiesData, error: activitiesError } = await supabase.from("activity_records").select(`id, activity_date, content, has_next_appointment, next_appointment_date, next_appointment_content, staff:staff_id (name), activity_types:activity_type_id (name, color)`).eq("user_id", userId).order("activity_date", { ascending: false })
        if (activitiesError) throw activitiesError

        if (activitiesData) {
          const formattedActivities = activitiesData.map((record) => ({
            id: record.id,
            activity_date: record.activity_date,
            content: record.content,
            staff_name: (record.staff as Staff | null)?.name ?? '不明',
            activity_type_name: (record.activity_types as ActivityType | null)?.name ?? '不明',
            activity_type_color: (record.activity_types as ActivityType | null)?.color ?? '#cccccc',
            // ▼▼▼ 修正: null の場合に false を設定する (Nullish Coalescing Operator) ▼▼▼
            has_next_appointment: record.has_next_appointment ?? false,
            next_appointment_date: record.next_appointment_date,
            next_appointment_content: record.next_appointment_content,
          }))
          setActivities(formattedActivities)
        }
      } catch (err: unknown) {
        console.error("データの取得に失敗しました:", err)
        setError(err instanceof Error ? err.message : "データの取得に失敗しました。")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId, supabase])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">利用者情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || "利用者が見つかりません"}</p>
          <Link href="/"><Button>ダッシュボードに戻る</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">利用者詳細</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><User className="h-5 w-5 mr-2" />利用者情報</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><h2 className="text-2xl font-bold text-gray-900">{user.name}</h2></div>
              {user.master_uid && (<Button asChild className="w-full"><a href={`${masterDbUrl}/users/${user.master_uid}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />マスター情報を表示</a></Button>)}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Clock className="h-5 w-5 mr-2" />活動履歴</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">まだ活動記録がありません</div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border-l-4 pl-4 pb-4" style={{ borderColor: activity.activity_type_color || '#cccccc' }}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                        <div className="flex items-center space-x-2"><Badge variant="outline" style={{ backgroundColor: (activity.activity_type_color || '#cccccc') + "20", borderColor: activity.activity_type_color || '#cccccc', color: activity.activity_type_color || '#cccccc' }}>{activity.activity_type_name}</Badge><span className="text-sm text-gray-600">担当: {activity.staff_name}</span></div>
                        <div className="flex items-center text-sm text-gray-500"><Calendar className="h-4 w-4 mr-1" />{formatDate(activity.activity_date)}</div>
                      </div>
                      <p className="text-gray-900 mb-2">{activity.content}</p>
                      {activity.has_next_appointment && activity.next_appointment_date && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center mb-1"><Calendar className="h-4 w-4 text-blue-600 mr-1" /><span className="text-sm font-medium text-blue-800">次回予定: {formatDate(activity.next_appointment_date)}</span></div>
                          {activity.next_appointment_content && (<p className="text-sm text-blue-700">{activity.next_appointment_content}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}