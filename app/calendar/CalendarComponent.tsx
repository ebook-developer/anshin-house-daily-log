//app/calendar/CalendarComponent.tsx
"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalendarIcon, User, Hourglass } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Database } from "@/lib/database.types"

type ActivityRecordUser = Database['public']['Tables']['users']['Row']
type ActivityRecordStaff = Database['public']['Tables']['staff']['Row']
type ActivityRecordType = Database['public']['Tables']['activity_types']['Row']

interface ActivityRecord {
  id: string
  activity_date: string
  start_time: string | null
  end_time: string | null
  content: string | null
  user_id: string
  user_name: string
  staff_name: string
  activity_type_name: string
  activity_type_color: string | null
}

export default function CalendarComponent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  
  const getInitialDate = () => {
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    if (year && month) {
      try {
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        if (!isNaN(date.getTime())) {
          return date;
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Do nothing, fall back to default
      }
    }
    return new Date()
  }

  const [currentDate, setCurrentDate] = useState(getInitialDate())
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDayActivities, setSelectedDayActivities] = useState<ActivityRecord[]>([])

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        setError(null)
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const startDate = new Date(year, month, 1).toISOString().split("T")[0]
        const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0]

        const { data, error: fetchError } = await supabase
          .from("activity_records")
          .select(`id, activity_date, start_time, end_time, content, user_id, users!inner(name), staff!inner(name), activity_types!inner(name, color)`)
          .gte("activity_date", startDate)
          .lte("activity_date", endDate)
          .order("activity_date", { ascending: true })
          .order("start_time", { ascending: true, nullsFirst: true })

        if (fetchError) throw fetchError
        if (data) {
          const formattedActivities = data.map((record) => {
            const user = record.users as ActivityRecordUser | null
            const staff = record.staff as ActivityRecordStaff | null
            const activityType = record.activity_types as ActivityRecordType | null
            return {
              id: record.id,
              activity_date: record.activity_date,
              start_time: record.start_time,
              end_time: record.end_time,
              content: record.content,
              user_id: record.user_id,
              user_name: user?.name ?? '不明',
              staff_name: staff?.name ?? '不明',
              activity_type_name: activityType?.name ?? '不明',
              activity_type_color: activityType?.color ?? '#cccccc',
            }
          })
          setActivities(formattedActivities)
        }
      } catch (err) {
        console.error("活動記録の取得に失敗しました:", err)
        setError("活動記録の取得に失敗しました。")
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [currentDate, supabase])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate(); const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) { days.push({ date: new Date(year, month, -i), isCurrentMonth: false, activities: [] }) }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
      const dateString = `${y}-${m}-${d}`;
      const dayActivities = activities.filter((activity) => activity.activity_date === dateString)
      days.push({ date, isCurrentMonth: true, activities: dayActivities })
    }
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) { days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false, activities: [] }) }
    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(direction === "prev" ? prev.getMonth() - 1 : prev.getMonth() + 1);
      return newDate
    })
  }
  
  const formatDateForTitle = (date: Date) => {
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  }

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    try {
      const startDate = new Date(`1970-01-01T${start}`);
      const endDate = new Date(`1970-01-01T${end}`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
      const diff = endDate.getTime() - startDate.getTime();
      if (diff < 0) return null;
      return Math.floor(diff / (1000 * 60));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) { // ▼▼▼ 修正: 未使用変数を _e にし、ESLintルールを無効化 ▼▼▼
      return null;
    }
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">カレンダーを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>再試行</Button>
            <Link href="/"><Button variant="outline">ダッシュボードに戻る</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">活動カレンダー</h1>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <CardTitle className="text-xl sm:text-2xl">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}><ChevronLeft className="h-4 w-4" /> 前月</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>今月</Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>次月 <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 border-t border-l border-gray-200">
              {weekDays.map((day, index) => (
                <div key={day} className={`p-2 text-center text-xs sm:text-sm font-medium border-b border-r border-gray-200 bg-gray-50 ${index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"}`}>{day}</div>
              ))}
              {days.map((day, index) => (
                <div key={index} className={`relative p-2 border-b border-r border-gray-200 ${!day.isCurrentMonth ? "bg-gray-50" : "bg-white"}`}>
                  <div className={`text-xs sm:text-sm font-medium mb-1 ${!day.isCurrentMonth ? "text-gray-400" : index % 7 === 0 ? "text-red-600" : index % 7 === 6 ? "text-blue-600" : "text-gray-900"} ${day.date.toDateString() === new Date().toDateString() ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>{day.date.getDate()}</div>
                  <div className="space-y-1">
                    {day.activities.slice(0, 2).map((activity) => (
                      <DialogTrigger key={activity.id} asChild onClick={() => setSelectedDayActivities(day.activities)}>
                        <div className="text-xs p-1 rounded truncate cursor-pointer hover:bg-gray-100" style={{ backgroundColor: (activity.activity_type_color || '#cccccc') + "20", borderLeft: `3px solid ${activity.activity_type_color || '#cccccc'}`}} title={`${activity.user_name} - ${activity.staff_name}`}>
                          <div className="font-medium text-gray-800">{activity.user_name}</div>
                          <div className="text-gray-600 hidden sm:block">{activity.staff_name}</div>
                        </div>
                      </DialogTrigger>
                    ))}
                    {day.activities.length > 2 && (
                      <DialogTrigger asChild onClick={() => setSelectedDayActivities(day.activities)}>
                        <div className="text-xs text-center text-blue-600 font-semibold pt-1 cursor-pointer hover:underline">
                          +{day.activities.length - 2}件...
                        </div>
                      </DialogTrigger>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            {selectedDayActivities.length > 0 ? formatDateForTitle(new Date(selectedDayActivities[0].activity_date)) : ""} の活動記録
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          <div className="space-y-4">
            {selectedDayActivities.map((activity) => {
              const duration = calculateDuration(activity.start_time, activity.end_time);
              return (
                <div key={activity.id} className="border-l-4 p-3" style={{ borderColor: activity.activity_type_color || '#cccccc' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge variant="outline" style={{ backgroundColor: (activity.activity_type_color || '#cccccc') + "20", borderColor: activity.activity_type_color || '#cccccc', color: activity.activity_type_color || '#cccccc' }}>
                        {activity.activity_type_name}
                      </Badge>
                      <Link href={`/user/${activity.user_id}`} className="block mt-2">
                        <h3 className="font-bold text-lg text-blue-700 hover:underline flex items-center">
                          <User className="h-4 w-4 mr-1.5" />
                          {activity.user_name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">担当: {activity.staff_name}</p>
                    </div>
                    {(activity.start_time || duration != null) && (
                      <div className="text-right text-sm text-gray-600">
                        {activity.start_time && (
                          <div className="font-mono">{formatTime(activity.start_time)} - {formatTime(activity.end_time) || '...'}</div>
                        )}
                        {duration !== null && (
                          <div className="flex items-center justify-end text-xs font-semibold text-blue-700 mt-1">
                            <Hourglass className="h-3 w-3 mr-1"/>
                            ({duration}分)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-800 mt-2 bg-gray-50 p-2 rounded-md whitespace-pre-wrap">{activity.content || '(内容は記入されていません)'}</p>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}