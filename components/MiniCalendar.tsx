"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Activity {
  activity_date: string;
  users: { name: string } | null;
  activity_types: { color: string } | null;
}

interface DayWithActivities {
  date: Date;
  activities: Activity[];
}

export default function MiniCalendar() {
  const supabase = createClient()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      
      // 注意: タイムゾーン問題を避けるため、UTCで日付を生成する
      const startDate = new Date(Date.UTC(year, month, 1)).toISOString().split("T")[0];
      const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("activity_records")
        .select(`
          activity_date,
          users ( name ),
          activity_types ( color )
        `)
        .gte("activity_date", startDate)
        .lte("activity_date", endDate)

      if (data && !error) {
        setActivities(data as Activity[])
      }
      setLoading(false)
    }
    fetchActivities()
  }, [currentDate, supabase])

  const getDaysInMonth = (): (DayWithActivities | null)[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (DayWithActivities | null)[] = []
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)

      // ▼▼▼ 変更点: タイムゾーンの影響を受けないように日付文字列を生成 ▼▼▼
      const localYear = date.getFullYear();
      const localMonth = (date.getMonth() + 1).toString().padStart(2, '0');
      const localDay = date.getDate().toString().padStart(2, '0');
      const dateString = `${localYear}-${localMonth}-${localDay}`;
      // ▲▲▲ 変更ここまで ▲▲▲

      const dayActivities = activities.filter(a => a.activity_date === dateString)
      days.push({ date, activities: dayActivities })
    }
    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(direction === "prev" ? prev.getMonth() - 1 : prev.getMonth() + 1)
      return newDate
    })
  }

  const handleDayClick = (day: DayWithActivities) => {
    const year = day.date.getFullYear()
    const month = day.date.getMonth() + 1
    router.push(`/calendar?year=${year}&month=${month}`)
  }

  const days = getDaysInMonth()
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"]

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</span>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigateMonth("prev")}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigateMonth("next")}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
            {weekDays.map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((day, index) => (
              <div key={index} className="relative h-14 flex flex-col items-center justify-start pt-1">
                {day ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors mb-1",
                          "hover:bg-gray-100",
                          day.date.toDateString() === new Date().toDateString() && "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        {day.date.getDate()}
                      </button>
                    </TooltipTrigger>
                    {day.activities.length > 0 && (
                      <TooltipContent>
                        <p>{day.activities.length}件の活動</p>
                        <ul className="list-disc list-inside">
                          {day.activities.slice(0, 5).map((a, i) => (
                            <li key={i}>{a.users?.name || '不明な利用者'}</li>
                          ))}
                           {day.activities.length > 5 && <li>...他</li>}
                        </ul>
                      </TooltipContent>
                    )}
                    <div className="flex flex-col items-center w-full space-y-0.5">
                      {day.activities.slice(0, 2).map((a, i) => (
                        <div
                          key={i}
                          className="h-1 w-5/6 rounded-full"
                          style={{ backgroundColor: a.activity_types?.color || '#cccccc' }}
                        ></div>
                      ))}
                      {day.activities.length > 2 && (
                        <div className="text-gray-400 font-bold -mt-0.5" style={{ fontSize: '0.6rem' }}>+</div>
                      )}
                    </div>
                  </Tooltip>
                ) : <div />}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}