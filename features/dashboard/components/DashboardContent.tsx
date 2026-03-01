"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Clock, AlertTriangle, Users, BarChart as BarChartIcon, PieChart as PieChartIcon, Hourglass, Activity, CheckCircle2, Calendar, CalendarDays, Target } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MiniCalendar from "@/components/MiniCalendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Cell を含めて Recharts 関連をインポート
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from "recharts"
import type { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ▼▼▼ デザイナー厳選のカラーパレット（強制適用用） ▼▼▼
const CHART_COLORS = [
  "#3b82f6", // Blue (Primary)
  "#ef4444", // Red
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

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
  const router = useRouter()
  
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("care_status")

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  const [users, setUsers] = useState<UserWithActivity[]>(initialUsers)
  const [uncompletedTasks, setUncompletedTasks] = useState(initialTasks)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'this_month' | 'last_month' | 'last_3_months'>('this_month')

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [tempDuration, setTempDuration] = useState(30)

  // 1. フィルタリングロジック
  const filteredUsers = useMemo(() => {
    if (selectedStaffId === "all") return users
    const staff = staffList.find(s => s.id === selectedStaffId)
    return users.filter(u => u.last_activity_staff_name === staff?.name)
  }, [selectedStaffId, users, staffList])

  const overdueCount = useMemo(() => users.filter(u => (u.days_elapsed ?? 0) > 90).length, [users])

  // 2. 分析データ計算
  const staffActivityData = useMemo(() => {
    const today = new Date()
    let startDate: Date
    if (analyticsTimeRange === 'last_month') startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    else if (analyticsTimeRange === 'last_3_months') startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    else startDate = new Date(today.getFullYear(), today.getMonth(), 1)

    const filtered = allActivityHistory.filter(h => new Date(h.activity_date) >= startDate)
    
    const staffMetrics: Record<string, { count: number; totalMinutes: number }> = {}
    const typeMetrics: Record<string, { count: number; totalMinutes: number; color: string }> = {}

    filtered.forEach((record) => {
      const staffName = record.staff?.name || "未指定"
      const typeName = record.activity_types?.name || "未分類"
      // DBの色は一旦無視して集計のみ行う
      const typeColor = record.activity_types?.color || '#cccccc' 
      const duration = typeof record.duration_minutes === 'number' ? record.duration_minutes : 0

      if (!staffMetrics[staffName]) staffMetrics[staffName] = { count: 0, totalMinutes: 0 }
      staffMetrics[staffName].count++
      staffMetrics[staffName].totalMinutes += duration

      if (!typeMetrics[typeName]) typeMetrics[typeName] = { count: 0, totalMinutes: 0, color: typeColor }
      typeMetrics[typeName].count++
      typeMetrics[typeName].totalMinutes += duration
    })

    return {
      count: filtered.length,
      staff: Object.entries(staffMetrics).map(([name, data]) => ({ name, "活動件数": data.count, "合計時間": Math.round(data.totalMinutes) })),
      type: Object.entries(typeMetrics).map(([name, data]) => ({ name, value: data.count, color: data.color })),
      typeTime: Object.entries(typeMetrics).map(([name, data]) => ({ name, value: Math.round(data.totalMinutes), color: data.color }))
    }
  }, [analyticsTimeRange, allActivityHistory])

  // 3. 操作ロジック
  const handleAssignTask = async (taskId: string, newStaffId: string) => {
    const { error } = await supabase.from('activity_records').update({ staff_id: newStaffId }).eq('id', taskId)
    if (!error) setUncompletedTasks(prev => prev.map(t => t.id === taskId ? { ...t, staff_id: newStaffId } : t))
  }

  const requestCompleteTask = (taskId: string) => {
    setTargetTaskId(taskId)
    setTempDuration(30)
    setIsCompleteDialogOpen(true)
  }

  const executeCompleteTask = async () => {
    if (!targetTaskId) return
    const taskToComplete = uncompletedTasks.find(t => t.id === targetTaskId)
    if (!taskToComplete) return

    const { error } = await supabase.from('activity_records').update({ 
      is_completed: true,
      duration_minutes: tempDuration,
      start_time: null,
      end_time: null 
    }).eq('id', targetTaskId)

    if (!error) {
      setUncompletedTasks(prev => prev.filter(t => t.id !== targetTaskId))
      const today = new Date(); today.setHours(0,0,0,0)
      const activityDate = new Date(taskToComplete.activity_date)
      const diffDays = Math.max(0, Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)))

      setUsers(prev => prev.map(u => u.id === taskToComplete.user_id ? { ...u, last_activity_date: taskToComplete.activity_date, days_elapsed: diffDays, last_activity_staff_name: staffList.find(s => s.id === taskToComplete.staff_id)?.name || u.last_activity_staff_name } : u))
      setIsCompleteDialogOpen(false)
      setTargetTaskId(null)
      router.refresh()
    }
  }

  const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString("ja-JP") : "記録なし"

  const getDaysElapsedBadge = (days: number, isOverdue: boolean) => {
    if (days === 999) return <Badge variant="destructive" className="ml-2">記録なし</Badge>
    if (isOverdue) return <Badge variant="destructive" className="ml-2">{days}日経過</Badge>
    if (days > 60) return <Badge variant="secondary" className="ml-2">{days}日経過</Badge>
    return <Badge variant="outline" className="ml-2">{days}日経過</Badge>
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 左側カラム：タスク一覧 */}
        <div className="lg:col-span-2">
          <Card className="h-full border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/10 px-4 py-3">
              <CardTitle className="flex items-center text-sm font-black text-primary tracking-tighter">
                <Target className="h-4 w-4 mr-2 text-primary" />
                <span>チームの未完了タスク</span>
              </CardTitle>
              <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-black bg-primary text-primary-foreground">
                残り {uncompletedTasks.length}件
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {uncompletedTasks.length > 0 ? (
                uncompletedTasks.map((task: any) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const dueDate = new Date(task.activity_date);
                  const isOverdue = dueDate < today;
                  return (
                    <div key={task.id} className={cn(
                      "p-4 rounded-lg border-2 transition-all hover:bg-muted/30",
                      isOverdue ? "border-red-100 bg-red-50/10" : "border-muted/50 bg-card"
                    )}>
                      <div className="flex justify-between items-center gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <Link href={`/user/${task.users?.id}`} className="group block">
                            <div className="flex items-center gap-2">
                              {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                              <p className={cn(
                                "font-black text-lg truncate group-hover:text-primary transition-colors",
                                isOverdue ? "text-red-600" : "text-gray-900"
                              )}>
                                {task.users?.name}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground line-clamp-1">
                              {task.activity_types?.name} — {task.content || '(内容なし)'}
                            </p>
                          </Link>
                          <div className={cn("flex items-center text-[11px] font-black", isOverdue ? "text-red-600" : "text-muted-foreground/80")}>
                            <Calendar className="h-3 w-3 mr-1" />
                            {isOverdue ? "期限切れ" : "対応期限"}: {formatDate(task.activity_date)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Select value={task.staff_id || undefined} onValueChange={(v) => handleAssignTask(task.id, v)}>
                            <SelectTrigger className="w-32 sm:w-36 h-8 text-[11px] font-bold border-muted-foreground/20">
                              <SelectValue placeholder="担当者割当" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map((s) => (<SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 shadow-sm shrink-0" onClick={() => requestCompleteTask(task.id)}>
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed">
                   <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                   <p className="text-xs font-bold">現在、予定されているタスクはありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右側カラム：要注意利用者・カレンダー */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-red-200 bg-red-50/50 shadow-sm">
            <CardHeader className="pb-2 bg-red-100/50"><CardTitle className="text-xs font-bold text-red-600 tracking-wider">要注意利用者（未接触）</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-black text-red-700">{overdueCount}名</div>
              <p className="text-[10px] font-bold text-red-600/70 mt-2">90日以上、支援実績がありません</p>
            </CardContent>
          </Card>
          <MiniCalendar />
        </div>
      </div>
      
      {/* タブ切り替えエリア */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="care_status" className="font-bold"><Users className="h-4 w-4 mr-2"/>利用者ケア状況</TabsTrigger>
          <TabsTrigger value="analytics" className="font-bold"><BarChartIcon className="h-4 w-4 mr-2"/>活動分析</TabsTrigger>
        </TabsList>

        {/* --- 利用者ケア状況タブ --- */}
        <TabsContent value="care_status" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b bg-muted/10 px-4 py-3">
              <CardTitle className="text-sm font-bold flex items-center"><Clock className="h-4 w-4 mr-2 text-primary" />利用者一覧（未接触日数順）</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-muted-foreground">担当者で絞り込む:</span>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="w-48 h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">すべての担当者</SelectItem>{staffList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {filteredUsers.map((user) => {
                const nextTask = uncompletedTasks.find((t: any) => t.users?.id === user.id);
                return (
                  <Link key={user.id} href={`/user/${user.id}`} className="block">
                    <div className={cn("p-4 rounded-lg border-2 transition-all hover:bg-muted/30", (user.days_elapsed ?? 0) > 90 ? "border-red-100 bg-red-50/10" : "border-muted/50 bg-card")}>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center">
                            <h3 className="font-black text-gray-900">{user.name}</h3>
                            {getDaysElapsedBadge(user.days_elapsed ?? 0, (user.days_elapsed ?? 0) > 90)}
                            {(user.days_elapsed ?? 0) > 90 && <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />}
                          </div>
                          <p className="text-xs text-muted-foreground font-bold italic">最終活動: {formatDate(user.last_activity_date)} ({user.last_activity_staff_name || "記録なし"})</p>
                          {nextTask && <div className="flex items-center text-[10px] text-blue-700 pt-1 font-bold"><CalendarDays className="h-3 w-3 mr-1.5" />次回予定日: {formatDate(nextTask.activity_date)}</div>}
                        </div>
                        <div className="text-right ml-4">
                          <div className={cn("text-2xl font-black tabular-nums", (user.days_elapsed ?? 0) > 90 ? "text-red-600" : "text-primary/70")}>{user.days_elapsed === 999 ? "---" : `${user.days_elapsed}日`}</div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">経過</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- 活動分析タブ（型エラー修正版） --- */}
        <TabsContent value="analytics" className="mt-6 space-y-8">
          {/* 1. 期間フィルタ */}
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
            <h2 className="text-sm font-bold text-primary italic text-blue-800">
              分析対象: {staffActivityData.count} 件の実績
            </h2>
            <div className="flex gap-2">
              {(['this_month', 'last_month', 'last_3_months'] as const).map(range => (
                <Button key={range} variant={analyticsTimeRange === range ? 'default' : 'outline'} size="sm" className="h-8 text-xs font-bold" onClick={() => setAnalyticsTimeRange(range)}>
                  {range === 'this_month' ? '今月' : range === 'last_month' ? '先月' : '過去3ヶ月'}
                </Button>
              ))}
            </div>
          </div>

          {/* 2. グラフエリア */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full min-w-0">
            
            {/* ① スタッフ別 活動件数 */}
            <Card className="flex flex-col h-full shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center text-gray-700">
                  <BarChartIcon className="h-4 w-4 mr-2 text-blue-500" />
                  スタッフ別 活動件数
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                {isMounted && staffActivityData.staff.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffActivityData.staff} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="活動件数" radius={[4, 4, 0, 0]} barSize={40}>
                        {staffActivityData.staff.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : ( <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground"><Activity className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs font-bold">データがありません</p></div> )}
              </CardContent>
            </Card>

            {/* ② 活動種別 割合 */}
            <Card className="flex flex-col h-full shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center text-gray-700">
                  <PieChartIcon className="h-4 w-4 mr-2 text-emerald-500" />
                  活動種別 割合
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                {isMounted && staffActivityData.type.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={staffActivityData.type} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={2}
                        // ▼ 修正点: percent が undefined の場合の対策 (percent ?? 0)
                        label={({name, percent}) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {staffActivityData.type.map((entry, index) => ( 
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" /> 
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : ( <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground"><Activity className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs font-bold">データがありません</p></div> )}
              </CardContent>
            </Card>

            {/* ③ スタッフ別 合計時間 */}
            <Card className="flex flex-col h-full shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center text-gray-700">
                  <Hourglass className="h-4 w-4 mr-2 text-violet-500" />
                  スタッフ別 合計時間 (分)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                {isMounted && staffActivityData.staff.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffActivityData.staff} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        // ▼ 修正点: value: number ではなく value: any にして型エラー回避
                        formatter={(value: any) => [`${value}分`, '合計時間']}
                      />
                      <Bar dataKey="合計時間" radius={[4, 4, 0, 0]} barSize={40}>
                         {staffActivityData.staff.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : ( <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground"><Activity className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs font-bold">データがありません</p></div> )}
              </CardContent>
            </Card>

            {/* ④ 活動種別 時間割合 */}
            <Card className="flex flex-col h-full shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center text-gray-700">
                  <PieChartIcon className="h-4 w-4 mr-2 text-orange-500" />
                  活動種別 時間割合
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                {isMounted && staffActivityData.typeTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={staffActivityData.typeTime} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={2}
                        // ▼ 修正点: percent が undefined の場合の対策 (percent ?? 0)
                        label={({name, percent}) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {staffActivityData.typeTime.map((entry, index) => ( 
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" /> 
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        // ▼ 修正点: value: number ではなく value: any にして型エラー回避
                        formatter={(value: any) => [`${value}分`, '合計時間']} 
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : ( <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground"><Activity className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs font-bold">データがありません</p></div> )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" />支援完了の報告</DialogTitle>
            <DialogDescription className="pt-2 font-medium text-gray-900 leading-relaxed">
              お疲れ様でした！今回の活動<span className="text-blue-600 font-bold">（移動時間は含めず）</span>にはどのくらいの時間がかかりましたか？
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="quick-duration" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">活動時間 (目安)</Label>
            <Select value={String(tempDuration)} onValueChange={(val) => setTempDuration(Number(val))}>
              <SelectTrigger id="quick-duration" className="w-full h-12 text-lg font-bold border-2 border-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
                <SelectGroup><SelectLabel>短時間</SelectLabel><SelectItem value="5">5分</SelectItem><SelectItem value="10">10分</SelectItem><SelectItem value="15">15分</SelectItem><SelectItem value="30">30分</SelectItem><SelectItem value="45">45分</SelectItem></SelectGroup>
                <SelectGroup><SelectLabel>標準的な支援</SelectLabel><SelectItem value="60">1時間</SelectItem><SelectItem value="90">1時間半</SelectItem><SelectItem value="120">2時間</SelectItem><SelectItem value="150">2時間半</SelectItem><SelectItem value="180">3時間</SelectItem></SelectGroup>
                <SelectGroup><SelectLabel>長時間の支援</SelectLabel><SelectItem value="210">3時間半</SelectItem><SelectItem value="240">4時間</SelectItem><SelectItem value="300">5時間</SelectItem><SelectItem value="360">6時間</SelectItem><SelectItem value="420">6時間以上</SelectItem></SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2"><Button variant="ghost" onClick={() => setIsCompleteDialogOpen(false)} className="sm:flex-1 font-bold">キャンセル</Button><Button onClick={executeCompleteTask} className="sm:flex-1 bg-green-600 hover:bg-green-700 font-bold text-white">報告する</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}