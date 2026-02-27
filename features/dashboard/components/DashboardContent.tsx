"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, AlertTriangle, Users, BarChart as BarChartIcon, PieChart as PieChartIcon, Hourglass, ListTodo, CheckCircle2, Calendar, CalendarDays } from "lucide-react"
import Link from "next/link"
import MiniCalendar from "@/components/MiniCalendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from "recharts"
import type { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"
import { calculateDurationMinutes } from "@/lib/date-utils"

type UserWithActivity = Database['public']['Views']['user_with_last_activity']['Row']
type UncompletedTask = any

interface Props {
  initialUsers: UserWithActivity[]
  initialTasks: UncompletedTask[]
  staffList: { id: string, name: string }[]
  allActivityHistory: any[]
}

export function DashboardContent({ initialUsers, initialTasks, staffList, allActivityHistory }: Props) {
  const supabase = createClient()
  
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    // 【世界最高峰の修正】連鎖レンダリングを回避するため、次の描画フレームでマウントを確定させる
    const handle = requestAnimationFrame(() => {
      setIsMounted(true)
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  console.log("📊 Dashboard Data Scan:");
  console.log("- initialUsers (View由来) 数:", initialUsers.length);
  console.log("- initialTasks (未完了タスク) 数:", initialTasks.length);
  console.log("- allActivityHistory (グラフ用実績) 数:", allActivityHistory.length);
  if (allActivityHistory.length > 0) {
    console.log("- 実績データの1件目日付:", allActivityHistory[0].activity_date);
  }

  const [uncompletedTasks, setUncompletedTasks] = useState(initialTasks)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'this_month' | 'last_month' | 'last_3_months'>('this_month')

  const filteredUsers = useMemo(() => {
    if (selectedStaffId === "all") return initialUsers
    return initialUsers.filter(u => u.last_activity_staff_name === staffList.find(s => s.id === selectedStaffId)?.name)
  }, [selectedStaffId, initialUsers, staffList])

  const overdueCount = useMemo(() => initialUsers.filter(u => (u.days_elapsed ?? 0) > 90).length, [initialUsers])

  const staffActivityData = useMemo(() => {
    const today = new Date()
    let startDate: Date
    if (analyticsTimeRange === 'last_month') startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    else if (analyticsTimeRange === 'last_3_months') startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    else startDate = new Date(today.getFullYear(), today.getMonth(), 1)

    const filtered = allActivityHistory.filter(h => new Date(h.activity_date) >= startDate)
    
    const staffMetrics: { [key: string]: { count: number; totalMinutes: number } } = {}
    const typeMetrics: { [key: string]: { count: number; totalMinutes: number; color: string } } = {}

    filtered.forEach((record) => {
      const staffName = record.staff?.name
      const typeName = record.activity_types?.name
      const typeColor = record.activity_types?.color || '#cccccc'
      
      const duration = calculateDurationMinutes(record.start_time, record.end_time) || 0

      if (staffName) {
        if (!staffMetrics[staffName]) staffMetrics[staffName] = { count: 0, totalMinutes: 0 }
        staffMetrics[staffName].count++
        staffMetrics[staffName].totalMinutes += duration
      }
      if (typeName) {
        if (!typeMetrics[typeName]) typeMetrics[typeName] = { count: 0, totalMinutes: 0, color: typeColor }
        typeMetrics[typeName].count++
        typeMetrics[typeName].totalMinutes += duration
      }
    })

    return {
      staff: Object.entries(staffMetrics).map(([name, data]) => ({ name, "活動件数": data.count, "合計時間 (分)": Math.round(data.totalMinutes) })),
      type: Object.entries(typeMetrics).map(([name, data]) => ({ name, value: data.count, color: data.color })),
      typeTime: Object.entries(typeMetrics).map(([name, data]) => ({ name, "合計時間 (分)": Math.round(data.totalMinutes), color: data.color }))
    }
  }, [analyticsTimeRange, allActivityHistory])

  const handleAssignTask = async (taskId: string, newStaffId: string) => {
    const { error } = await supabase.from('activity_records').update({ staff_id: newStaffId }).eq('id', taskId)
    if (!error) setUncompletedTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, staff_id: newStaffId, staff: { name: staffList.find(s => s.id === newStaffId)?.name || '未定' } } : t))
  }

  const handleCompleteTask = async (taskId: string) => {
    const { error } = await supabase.from('activity_records').update({ is_completed: true }).eq('id', taskId)
    if (!error) setUncompletedTasks(tasks => tasks.filter(t => t.id !== taskId))
  }

  const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString("ja-JP") : "記録なし"

  const getDaysElapsedBadge = (days: number, isOverdue: boolean) => {
    if (days === 999) return <Badge variant="destructive" className="ml-2">記録なし</Badge>
    if (isOverdue) return <Badge variant="destructive" className="ml-2">{days}日経過</Badge>
    if (days > 60) return <Badge variant="secondary" className="ml-2">{days}日経過</Badge>
    return <Badge variant="outline" className="ml-2">{days}日経過</Badge>
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 py-4">
              <CardTitle className="flex items-center text-lg font-semibold">
                <ListTodo className="h-5 w-5 mr-3 text-primary" />
                <span>チームの未完了タスク</span>
              </CardTitle>
              <Badge variant="secondary" className="px-3 py-1 text-sm font-bold">{uncompletedTasks.length}件</Badge>
            </CardHeader>
            <CardContent className="pt-6">
              {uncompletedTasks.length > 0 ? (
                <div className="space-y-3">
                  {uncompletedTasks.map(task => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const dueDate = new Date(task.activity_date);
                    const isOverdue = dueDate < today;
                    const isToday = dueDate.getTime() === today.getTime();
                    return (
                      <div key={task.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-md border", isOverdue ? "bg-red-50 border-red-200" : "bg-card")}>
                        <Link href={`/user/${task.users?.id}`} className="flex-1 space-y-1.5 group">
                          <div className="flex items-center gap-2">
                            {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                            <p className={cn("font-semibold group-hover:underline", isOverdue && "text-destructive font-bold")}>{task.users?.name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.activity_types?.name} - {task.content || '(詳細なし)'}</p>
                          <div className={cn("inline-flex items-center gap-x-2 rounded-md px-2.5 py-1 text-sm font-medium", isOverdue ? "bg-red-100 text-red-800" : isToday ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800")}>
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">{isOverdue ? "期限切れ" : isToday ? "本日対応" : `期限: ${formatDate(task.activity_date)}`}</span>
                            {task.task_time && <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded-sm text-xs">{task.task_time.slice(0, 5)}</span>}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-center">
                          <Select value={task.staff_id || undefined} onValueChange={(v) => handleAssignTask(task.id, v)}>
                            <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="担当者を割当..." /></SelectTrigger>
                            <SelectContent>{staffList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                          </Select>
                          <Button size="icon" className="h-9 w-9 bg-green-500 hover:bg-green-600 flex-shrink-0" onClick={() => handleCompleteTask(task.id)} title="このタスクを完了する"><CheckCircle2 className="h-5 w-5" /></Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                  <p className="font-semibold">素晴らしい！</p>
                  <p>未完了のタスクはありません。</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">要注意利用者</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{overdueCount}名</div><p className="text-xs text-muted-foreground">90日以上未接触</p></CardContent></Card>
          <MiniCalendar />
        </div>
      </div>
      
      <Tabs defaultValue="care_status">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="care_status"><Users className="h-4 w-4 mr-2"/>利用者ケア状況</TabsTrigger>
          <TabsTrigger value="analytics"><BarChartIcon className="h-4 w-4 mr-2"/>活動分析</TabsTrigger>
        </TabsList>

        <TabsContent value="care_status" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center text-lg"><Clock className="h-5 w-5 mr-2" />利用者一覧（経過日数順）</CardTitle>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium whitespace-nowrap">担当者で絞り込み:</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="w-auto sm:w-48"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">すべて</SelectItem>{staffList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const nextTask = uncompletedTasks.find(t => t.users?.id === user.id);
                  return (
                    <Link key={user.id} href={`/user/${user.id}`}>
                      <div className={`p-4 rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer ${user.days_elapsed && user.days_elapsed > 90 ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center"><h3 className="font-medium text-gray-900">{user.name}</h3>{getDaysElapsedBadge(user.days_elapsed ?? 0, (user.days_elapsed ?? 0) > 90)}{ (user.days_elapsed ?? 0) > 90 && <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />}</div>
                            <div className="text-sm text-gray-600"><span>最終記録者: {user.last_activity_staff_name || "記録なし"}</span><span className="mx-2">•</span><span>最終活動: {formatDate(user.last_activity_date)}</span></div>
                            {nextTask && <div className="flex items-center text-sm text-sky-700 pt-1"><CalendarDays className="h-4 w-4 mr-2 flex-shrink-0" /><span>次回予定: {formatDate(nextTask.activity_date)}{nextTask.task_time && ` ${nextTask.task_time.slice(0, 5)}`}</span></div>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4"><div className="text-lg font-semibold text-gray-900">{user.days_elapsed === 999 ? "---" : `${user.days_elapsed}日`}</div><div className="text-xs text-gray-500">経過</div></div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-8">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
            <h2 className="text-sm font-bold">集計期間</h2>
            <div className="flex gap-2">
              {(['this_month', 'last_month', 'last_3_months'] as const).map(range => (
                <Button key={range} variant={analyticsTimeRange === range ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setAnalyticsTimeRange(range)}>
                  {range === 'this_month' ? '今月' : range === 'last_month' ? '先月' : '過去3ヶ月'}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader><CardTitle className="text-sm font-bold flex items-center"><BarChartIcon className="h-4 w-4 mr-2" />スタッフ別 活動件数</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffActivityData.staff}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="活動件数" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-bold flex items-center"><Hourglass className="h-4 w-4 mr-2" />スタッフ別 合計時間(分)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffActivityData.staff}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="合計時間 (分)" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-bold flex items-center"><PieChartIcon className="h-4 w-4 mr-2" />活動種別 割合(件数)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={staffActivityData.type} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {staffActivityData.type.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-bold flex items-center"><Hourglass className="h-4 w-4 mr-2" />活動種別 割合(時間)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={staffActivityData.typeTime} dataKey="合計時間 (分)" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {staffActivityData.typeTime.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}