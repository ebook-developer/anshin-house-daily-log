"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import Link from "next/link"

interface ActivityRecord {
  id: string
  activity_date: string
  content: string
  user_name: string
  staff_name: string
  activity_type_name: string
  activity_type_color: string
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [currentDate])

  const fetchActivities = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split("T")[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0]

      const { data } = await supabase
        .from("activity_records")
        .select(`
          id,
          activity_date,
          content,
          users!inner(name),
          staff!inner(name),
          activity_types!inner(name, color)
        `)
        .gte("activity_date", startDate)
        .lte("activity_date", endDate)
        .order("activity_date")

      if (data) {
        const formattedActivities = data.map((record) => ({
          id: record.id,
          activity_date: record.activity_date,
          content: record.content,
          user_name: record.users.name,
          staff_name: record.staff.name,
          activity_type_name: record.activity_types.name,
          activity_type_color: record.activity_types.color,
        }))
        setActivities(formattedActivities)
      }
    } catch (error) {
      console.error("活動記録の取得に失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // 前月の日付を追加
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        activities: [],
      })
    }

    // 当月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateString = date.toISOString().split("T")[0]
      const dayActivities = activities.filter((activity) => activity.activity_date === dateString)

      days.push({
        date,
        isCurrentMonth: true,
        activities: dayActivities,
      })
    }

    // 次月の日付を追加（6週間分になるまで）
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        activities: [],
      })
    }

    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">カレンダーを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ダッシュボードに戻る
                </Button>
              </Link>
              <div className="flex items-center ml-4">
                <Calendar className="h-6 w-6 text-blue-600 mr-2" />
                <h1 className="text-xl font-semibold text-gray-900">活動カレンダー</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  今月
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {/* 曜日ヘッダー */}
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`p-2 text-center text-sm font-medium ${
                    index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* カレンダーの日付 */}
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border border-gray-200 ${
                    !day.isCurrentMonth ? "bg-gray-50" : "bg-white"
                  } ${day.date.toDateString() === new Date().toDateString() ? "bg-blue-50 border-blue-300" : ""}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      !day.isCurrentMonth
                        ? "text-gray-400"
                        : index % 7 === 0
                          ? "text-red-600"
                          : index % 7 === 6
                            ? "text-blue-600"
                            : "text-gray-900"
                    }`}
                  >
                    {day.date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {day.activities.slice(0, 3).map((activity) => (
                      <div
                        key={activity.id}
                        className="text-xs p-1 rounded truncate"
                        style={{
                          backgroundColor: activity.activity_type_color + "20",
                          borderLeft: `3px solid ${activity.activity_type_color}`,
                        }}
                        title={`${activity.user_name} - ${activity.staff_name} - ${activity.content}`}
                      >
                        <div className="font-medium">{activity.user_name}</div>
                        <div className="text-gray-600">{activity.staff_name}</div>
                      </div>
                    ))}

                    {day.activities.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">+{day.activities.length - 3}件</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
