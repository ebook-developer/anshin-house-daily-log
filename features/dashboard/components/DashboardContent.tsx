"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Clock, AlertTriangle, Users, BarChart as BarChartIcon, PieChart as PieChartIcon, Hourglass, ListTodo, CheckCircle2, Calendar, CalendarDays } from "lucide-react"
import Link from "next/link"
import MiniCalendar from "@/components/MiniCalendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from "recharts"
import type { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"
// ダイアログ関連のインポートを完全補完
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [activeTab, setActiveTab] = useState("care_status")

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  // 状態管理
  const [uncompletedTasks, setUncompletedTasks] = useState(initialTasks)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'this_month' | 'last_month' | 'last_3_months'>('this_month')

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [tempDuration, setTempDuration] = useState(30)

  // 1. フィルタリング
  const filteredUsers = useMemo(() => {
    if (selectedStaffId === "all") return initialUsers
    const staff = staffList.find(s => s.id === selectedStaffId)
    return initialUsers.filter(u => u.last_activity_staff_name === staff?.name)
  }, [selectedStaffId, initialUsers, staffList])

  const overdueCount = useMemo(() => initialUsers.filter(u => (u.days_elapsed ?? 0) > 90).length, [initialUsers])

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
      const typeColor = record.activity_types?.color || '#cccccc'
      const duration = record.duration_minutes || 0

      if (!staffMetrics[staffName]) staffMetrics[staffName] = { count: 0, totalMinutes: 0 }
      staffMetrics[staffName].count++
      staffMetrics[staffName].totalMinutes += duration

      if (!typeMetrics[typeName]) typeMetrics[typeName] = { count: 0, totalMinutes: 0, color: typeColor }
      typeMetrics[typeName].count++
      typeMetrics[typeName].totalMinutes += duration
    })

    return {
      staff: Object.entries(staffMetrics).map(([name, data]) => ({ name, "活動件数": data.count, "合計時間 (分)": Math.round(data.totalMinutes) })),
      type: Object.entries(typeMetrics).map(([name, data]) => ({ name, value: data.count, color: data.color })),
      typeTime: Object.entries(typeMetrics).map(([name, data]) => ({ name, "合計時間 (分)": Math.round(data.totalMinutes), color: data.color }))
    }
  }, [analyticsTimeRange, allActivityHistory])

  // 3. 操作ロジック
  const handleAssignTask = async (taskId: string, newStaffId: string) => {
    const { error } = await supabase.from('activity_records').update({ staff_id: newStaffId }).eq('id', taskId)
    if (!error) setUncompletedTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, staff_id: newStaffId } : t))
  }

  const requestCompleteTask = (taskId: string) => {
    setTargetTaskId(taskId)
    setTempDuration(30)
    setIsCompleteDialogOpen(true)
  }

  const executeCompleteTask = async () => {
    if (!targetTaskId) return
    const { error } = await supabase.from('activity_records').update({ 
      is_completed: true,
      duration_minutes: tempDuration,
      start_time: null,
      end_time: null 
    }).eq('id', targetTaskId)

    if (!error) {
      setUncompletedTasks(tasks => tasks.filter(t => t.id !== targetTaskId))
      setIsCompleteDialogOpen(false)
      setTargetTaskId(null)
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
        <div className="lg:col-span-2">
          <Card className="h-full border-primary/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 py-4">
              <CardTitle className="flex items-center text-lg font-bold text-primary"><ListTodo className="h-5 w-5 mr-3" /><span>チームの未完了タスク</span></CardTitle>
              <Badge variant="secondary" className="px-3 py-1 text-sm font-bold">{uncompletedTasks.length}件</Badge>
            </CardHeader>
            <CardContent className="pt-6">
              {uncompletedTasks.length > 0 ? (
                <div className="space-y-3">
                  {uncompletedTasks.map(task => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const dueDate = new Date(task.activity_date);
                    const isOverdue = dueDate < today;
                    return (
                      <div key={task.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-md border", isOverdue ? "bg-red-50 border-red-200" : "bg-card")}>
                        <Link href={`/user/${task.users?.id}`} className="flex-1 space-y-1.5 group">
                          <div className="flex items-center gap-2">
                            {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                            <p className="font-bold text-primary group-hover:underline">{task.users?.name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.activity_types?.name} - {task.content || '(詳細なし)'}</p>
                          <div className="flex items-center text-xs gap-2 text-muted-foreground"><Calendar className="h-3 w-3" /> {formatDate(task.activity_date)}</div>
                        </Link>
                        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-center">
                          <Select value={task.staff_id || undefined} onValueChange={(v) => handleAssignTask(task.id, v)}>
                            <SelectTrigger className="w-full sm:w-40 h-9 font-medium"><SelectValue placeholder="担当者を割当..." /></SelectTrigger>
                            <SelectContent>{staffList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                          </Select>
                          <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-700" onClick={() => requestCompleteTask(task.id)}><CheckCircle2 className="h-5 w-5 text-white" /></Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed">未完了のタスクはありません。</div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-bold text-red-600 tracking-tight uppercase">要注意利用者</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black text-red-700">{overdueCount}名</div><p className="text-xs text-muted-foreground">90日以上未接触</p></CardContent>
          </Card>
          <MiniCalendar />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="care_status" className="font-bold"><Users className="h-4 w-4 mr-2"/>利用者ケア状況</TabsTrigger>
          <TabsTrigger value="analytics" className="font-bold"><BarChartIcon className="h-4 w-4 mr-2"/>活動分析</TabsTrigger>
        </TabsList>

        <TabsContent value="care_status" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b bg-muted/10 px-4 py-3">
              <CardTitle className="text-sm font-bold flex items-center"><Clock className="h-4 w-4 mr-2 text-primary" />利用者一覧（経過日数順）</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-muted-foreground">担当絞り込み:</span>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="w-48 h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">すべて</SelectItem>{staffList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {filteredUsers.map((user) => {
                const nextTask = uncompletedTasks.find(t => t.users?.id === user.id);
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
                          <p className="text-xs text-muted-foreground font-bold">
                            最終: {formatDate(user.last_activity_date)} ({user.last_activity_staff_name || "記録なし"})
                          </p>
                          {nextTask && (
                            <div className="flex items-center text-[10px] text-blue-700 pt-1 font-bold">
                              <CalendarDays className="h-3 w-3 mr-1.5" />次回予定: {formatDate(nextTask.activity_date)}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className={cn("text-2xl font-black tabular-nums", (user.days_elapsed ?? 0) > 90 ? "text-red-600" : "text-primary/70")}>
                            {user.days_elapsed === 999 ? "---" : `${user.days_elapsed}日`}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Elapsed</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-8">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
            <h2 className="text-sm font-bold text-primary">集計期間</h2>
            <div className="flex gap-2">
              {(['this_month', 'last_month', 'last_3_months'] as const).map(range => (
                <Button key={range} variant={analyticsTimeRange === range ? 'default' : 'outline'} size="sm" className="h-8 text-xs font-bold" onClick={() => setAnalyticsTimeRange(range)}>
                  {range === 'this_month' ? '今月' : range === 'last_month' ? '先月' : '過去3ヶ月'}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="bg-muted/10 border-b py-3 px-4"><CardTitle className="text-sm font-bold flex items-center"><BarChartIcon className="h-4 w-4 mr-2" />スタッフ別 活動件数</CardTitle></CardHeader>
              <CardContent className="h-[300px] pt-6">
                {isMounted && staffActivityData.staff.length > 0 ? (
                  <ResponsiveContainer key={`bar-count-${activeTab}`} width="100%" height="100%">
                    <BarChart data={staffActivityData.staff}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} fontWeight="bold" />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="活動件数" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : ( <p className="flex items-center justify-center h-full text-sm text-muted-foreground italic">実績データがありません</p> )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/10 border-b py-3 px-4"><CardTitle className="text-sm font-bold flex items-center"><Hourglass className="h-4 w-4 mr-2" />スタッフ別 合計時間(分)</CardTitle></CardHeader>
              <CardContent className="h-[300px] pt-6">
                {isMounted && staffActivityData.staff.length > 0 ? (
                  <ResponsiveContainer key={`bar-time-${activeTab}`} width="100%" height="100%">
                    <BarChart data={staffActivityData.staff}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} fontWeight="bold" />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="合計時間 (分)" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : ( <p className="flex items-center justify-center h-full text-sm text-muted-foreground italic">実績データがありません</p> )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/10 border-b py-3 px-4"><CardTitle className="text-sm font-bold flex items-center"><PieChartIcon className="h-4 w-4 mr-2" />活動種別 割合(件数)</CardTitle></CardHeader>
              <CardContent className="h-[300px] pt-6">
                {isMounted && staffActivityData.type.length > 0 ? (
                  <ResponsiveContainer key={`pie-count-${activeTab}`} width="100%" height="100%">
                    <PieChart>
                      <Pie data={staffActivityData.type} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {staffActivityData.type.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : ( <p className="flex items-center justify-center h-full text-sm text-muted-foreground italic">実績データがありません</p> )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/10 border-b py-3 px-4"><CardTitle className="text-sm font-bold flex items-center"><Hourglass className="h-4 w-4 mr-2" />活動種別 割合(時間)</CardTitle></CardHeader>
              <CardContent className="h-[300px] pt-6">
                {isMounted && staffActivityData.typeTime.length > 0 ? (
                  <ResponsiveContainer key={`pie-time-${activeTab}`} width="100%" height="100%">
                    <PieChart>
                      <Pie data={staffActivityData.typeTime} dataKey="合計時間 (分)" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {staffActivityData.typeTime.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : ( <p className="flex items-center justify-center h-full text-sm text-muted-foreground italic">実績データがありません</p> )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" />支援完了の報告</DialogTitle>
            <DialogDescription className="pt-2 font-medium text-gray-900 leading-relaxed">お疲れ様でした！今回の活動<span className="text-blue-600 font-bold">（移動時間は含めず）</span>にはどのくらいの時間がかかりましたか？</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="quick-duration" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">活動時間 (目安)</Label>
            <Select value={String(tempDuration)} onValueChange={(val) => setTempDuration(Number(val))}>
              <SelectTrigger id="quick-duration" className="w-full h-12 text-lg font-bold border-2 border-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
                <SelectGroup><SelectLabel>短時間</SelectLabel><SelectItem value="5">5分</SelectItem><SelectItem value="10">10分</SelectItem><SelectItem value="15">15分</SelectItem><SelectItem value="30">30分</SelectItem><SelectItem value="45">45分</SelectItem></SelectGroup>
                <SelectGroup><SelectLabel>標準的</SelectLabel><SelectItem value="60">1時間</SelectItem><SelectItem value="90">1時間半</SelectItem><SelectItem value="120">2時間</SelectItem><SelectItem value="150">2時間半</SelectItem><SelectItem value="180">3時間</SelectItem></SelectGroup>
                <SelectGroup><SelectLabel>長時間</SelectLabel><SelectItem value="210">3時間半</SelectItem><SelectItem value="240">4時間</SelectItem><SelectItem value="300">5時間</SelectItem><SelectItem value="360">6時間</SelectItem><SelectItem value="420">6時間以上</SelectItem></SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2"><Button variant="ghost" onClick={() => setIsCompleteDialogOpen(false)} className="sm:flex-1">キャンセル</Button><Button onClick={executeCompleteTask} className="sm:flex-1 bg-green-600 hover:bg-green-700 font-bold text-white">報告する</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}