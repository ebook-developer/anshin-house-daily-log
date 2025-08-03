"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Phone, MapPin, Calendar, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface UserDetail {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  assigned_staff_name: string | null
}

interface ActivityRecord {
  id: string
  activity_date: string
  content: string
  staff_name: string
  activity_type_name: string
  activity_type_color: string
  has_next_appointment: boolean
  next_appointment_date: string | null
  next_appointment_content: string | null
}

export default function UserDetailPage() {
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchUserData()
    }
  }, [userId])

  const fetchUserData = async () => {
    try {
      setError(null)

      // 利用者情報を取得
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
          id,
          name,
          phone,
          address,
          notes,
          staff:assigned_staff_id (
            name
          )
        `)
        .eq("id", userId)
        .single()

      if (userError) throw userError

      if (userData) {
        setUser({
          ...userData,
          assigned_staff_name: userData.staff?.name || null,
        })
      }

      // 活動記録を取得
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activity_records")
        .select(`
          id,
          activity_date,
          content,
          has_next_appointment,
          next_appointment_date,
          next_appointment_content,
          staff!inner(name),
          activity_types!inner(name, color)
        `)
        .eq("user_id", userId)
        .order("activity_date", { ascending: false })

      if (activitiesError) throw activitiesError

      if (activitiesData) {
        const formattedActivities = activitiesData.map((record: any) => ({
          id: record.id,
          activity_date: record.activity_date,
          content: record.content,
          staff_name: record.staff.name,
          activity_type_name: record.activity_types.name,
          activity_type_color: record.activity_types.color,
          has_next_appointment: record.has_next_appointment,
          next_appointment_date: record.next_appointment_date,
          next_appointment_content: record.next_appointment_content,
        }))
        setActivities(formattedActivities)
      }
    } catch (error) {
      console.error("データの取得に失敗しました:", error)
      setError("データの取得に失敗しました。Supabaseの設定を確認してください。")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">利用者情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/">
            <Button>ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">利用者が見つかりません</p>
          <Link href="/">
            <Button className="mt-4">ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-4">利用者詳細</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 利用者情報 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  利用者情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                </div>

                {user.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{user.phone}</span>
                  </div>
                )}

                {user.address && (
                  <div className="flex items-start text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 mt-1" />
                    <span>{user.address}</span>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-gray-500">担当スタッフ</span>
                  <p className="text-gray-900">{user.assigned_staff_name || "未割当"}</p>
                </div>

                {user.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">備考</span>
                    <p className="text-gray-900 text-sm">{user.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 活動履歴 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  活動履歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">まだ活動記録がありません</div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="border-l-4 pl-4 pb-4"
                        style={{ borderColor: activity.activity_type_color }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              style={{
                                backgroundColor: activity.activity_type_color + "20",
                                borderColor: activity.activity_type_color,
                                color: activity.activity_type_color,
                              }}
                            >
                              {activity.activity_type_name}
                            </Badge>
                            <span className="text-sm text-gray-600">担当: {activity.staff_name}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(activity.activity_date)}
                          </div>
                        </div>

                        <p className="text-gray-900 mb-2">{activity.content}</p>

                        {activity.has_next_appointment && activity.next_appointment_date && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <div className="flex items-center mb-1">
                              <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                              <span className="text-sm font-medium text-blue-800">
                                次回予定: {formatDate(activity.next_appointment_date)}
                              </span>
                            </div>
                            {activity.next_appointment_content && (
                              <p className="text-sm text-blue-700">{activity.next_appointment_content}</p>
                            )}
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
      </main>
    </div>
  )
}
