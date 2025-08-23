"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// ▼▼▼ 修正: 未使用の Calendar をインポート文から削除 ▼▼▼
import { Clock, AlertTriangle, Users, BarChart as BarChartIcon, PieChart as PieChartIcon, Hourglass } from "lucide-react"
import Link from "next/link"
import MiniCalendar from "@/components/MiniCalendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from "recharts"

interface UserWithLastActivity {
  id: string
  name: string
  master_uid: string | null
  last_activity_staff_name: string | null
  last_activity_date: string | null
  days_elapsed: number
  is_overdue: boolean
}

interface Staff {
  id: string
  name: string
}

interface FullActivityRecord {
  start_time: string | null;
  end_time: string | null;
  staff: { name: string } | null;
  activity_types: { name: string, color: string | null } | null;
}

interface StaffActivityData {
  name: string;
  "活動件数": number;
  "合計時間 (分)": number;
}

interface ActivityTypeData {
  name: string;
  value: number;
  color: string;
}

interface ActivityTypeTimeData {
  name: string;
  "合計時間 (分)": number;
  color: string;
}

type TimeRange = 'this_month' | 'last_month' | 'last_3_months';

export default function Dashboard() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithLastActivity[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithLastActivity[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<TimeRange>('this_month')
  const [staffActivityData, setStaffActivityData] = useState<StaffActivityData[]>([])
  const [activityTypeData, setActivityTypeData] = useState<ActivityTypeData[]>([])
  const [activityTypeTimeData, setActivityTypeTimeData] = useState<ActivityTypeTimeData[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  const dateRange = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (analyticsTimeRange) {
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_3_months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'this_month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }
    return { startDate: startDate.toISOString().split("T")[0], endDate: endDate.toISOString().split("T")[0] };
  }, [analyticsTimeRange]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null)
        const { data: staffData, error: staffError } = await supabase.from("staff").select("id, name").eq("is_active", true).order("name")
        if (staffError) throw staffError
        if (staffData) setStaff(staffData)
        const { data: usersData, error: usersError } = await supabase.from("users").select("id, name, master_uid").eq("is_active", true).order("name")
        if (usersError) throw usersError
        if (usersData) {
          const usersWithActivity = await Promise.all(
            usersData.map(async (user) => {
              const { data: lastActivity } = await supabase.from("activity_records").select("activity_date, staff:staff_id(name)").eq("user_id", user.id).order("activity_date", { ascending: false }).limit(1).single();
              const staffName = (lastActivity?.staff as { name: string } | null)?.name || null
              const lastActivityDate = lastActivity?.activity_date || null
              const daysElapsed = lastActivityDate ? Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)) : 999
              return { id: user.id, name: user.name, master_uid: user.master_uid, last_activity_staff_name: staffName, last_activity_date: lastActivityDate, days_elapsed: daysElapsed, is_overdue: daysElapsed > 90 }
            })
          )
          usersWithActivity.sort((a, b) => b.days_elapsed - a.days_elapsed)
          setUsers(usersWithActivity)
          setFilteredUsers(usersWithActivity)
        }
      } catch (err: unknown) {
        console.error("データの取得に失敗しました:", err)
        setError(err instanceof Error ? err.message : "データの取得に失敗しました。")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [supabase])

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoadingAnalytics(true);
      const { startDate, endDate } = dateRange;

      const { data: monthlyActivities, error: monthlyError } = await supabase
        .from("activity_records")
        .select(`start_time, end_time, staff ( name ), activity_types ( name, color )`)
        .gte('activity_date', startDate)
        .lte('activity_date', endDate);
      
      if (monthlyError) {
        console.error("分析データの取得に失敗:", monthlyError);
        setError("分析データの取得に失敗しました。")
        setLoadingAnalytics(false);
        return;
      }
      if (monthlyActivities) {
        const staffMetrics: { [key: string]: { count: number; totalMinutes: number } } = {};
        const typeMetrics: { [key: string]: { count: number; totalMinutes: number; color: string } } = {};
        
        (monthlyActivities as FullActivityRecord[]).forEach((record) => {
          const staffName = record.staff?.name;
          const typeName = record.activity_types?.name;
          const typeColor = record.activity_types?.color || '#cccccc';
          let duration = 0;
          if (record.start_time && record.end_time) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            try {
              const start = new Date(`1970-01-01T${record.start_time}`);
              const end = new Date(`1970-01-01T${record.end_time}`);
              const diff = (end.getTime() - start.getTime()) / (1000 * 60);
              if (diff > 0) duration = diff;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) { /* Invalid time format, ignore */ }
          }

          if (staffName) {
            if (!staffMetrics[staffName]) staffMetrics[staffName] = { count: 0, totalMinutes: 0 };
            staffMetrics[staffName].count++;
            staffMetrics[staffName].totalMinutes += duration;
          }
          if (typeName) {
            if (!typeMetrics[typeName]) typeMetrics[typeName] = { count: 0, totalMinutes: 0, color: typeColor };
            typeMetrics[typeName].count++;
            typeMetrics[typeName].totalMinutes += duration;
          }
        });

        setStaffActivityData(Object.entries(staffMetrics).map(([name, data]) => ({ name, "活動件数": data.count, "合計時間 (分)": Math.round(data.totalMinutes) })));
        setActivityTypeData(Object.entries(typeMetrics).map(([name, data]) => ({ name, value: data.count, color: data.color })));
        setActivityTypeTimeData(Object.entries(typeMetrics).map(([name, data]) => ({ name, "合計時間 (分)": Math.round(data.totalMinutes), color: data.color })));
      }
      setLoadingAnalytics(false);
    }
    fetchAnalyticsData();
  }, [dateRange, supabase]);

  useEffect(() => {
    if (selectedStaffId === "all") {
      setFilteredUsers(users)
    } else {
      const filterUsersByLastStaff = async () => {
        const filtered = await Promise.all(users.map(async (user) => {
          const { data: lastRecord } = await supabase.from("activity_records").select("staff_id").eq("user_id", user.id).order("activity_date", { ascending: false }).limit(1).single();
          return lastRecord?.staff_id === selectedStaffId ? user : null;
        }));
        setFilteredUsers(filtered.filter((u): u is UserWithLastActivity => u !== null));
      };
      filterUsersByLastStaff();
    }
  }, [selectedStaffId, users, supabase])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "記録なし"
    return new Date(dateString).toLocaleDateString("ja-JP")
  }

  const getDaysElapsedBadge = (days: number, isOverdue: boolean) => {
    if (days === 999) { return ( <Badge variant="destructive" className="ml-2">記録なし</Badge> ) }
    if (isOverdue) { return ( <Badge variant="destructive" className="ml-2">{days}日経過</Badge> ) }
    if (days > 60) { return ( <Badge variant="secondary" className="ml-2">{days}日経過</Badge> ) }
    return ( <Badge variant="outline" className="ml-2">{days}日経過</Badge> )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込んでいます...</p>
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
          <Button onClick={() => window.location.reload()}>再試行</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">総利用者数</h3>
          <p className="text-2xl font-bold">{users.length}名</p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">要注意利用者</h3>
          <p className="text-2xl font-bold text-red-600">{users.filter((u) => u.is_overdue).length}名</p>
          <p className="text-xs text-muted-foreground">90日以上未接触</p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">今日の日付</h3>
          <p className="text-2xl font-bold">{new Date().toLocaleDateString("ja-JP")}</p>
        </div>
        <div className="border rounded-lg p-4 flex flex-col justify-center">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="担当者で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての担当者</SelectItem>
                {staff.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
        </div>
      </div>
      
      <Tabs defaultValue="care_status">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="care_status"><Users className="h-4 w-4 mr-2"/>利用者ケア状況</TabsTrigger>
          <TabsTrigger value="analytics"><BarChartIcon className="h-4 w-4 mr-2"/>活動分析</TabsTrigger>
        </TabsList>

        <TabsContent value="care_status" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg"><Clock className="h-5 w-5 mr-2" />利用者一覧（経過日数順）</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <Link key={user.id} href={`/user/${user.id}`}>
                          <div className={`p-4 rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer ${user.is_overdue ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1"><div className="flex items-center"><h3 className="font-medium text-gray-900">{user.name}</h3>{getDaysElapsedBadge(user.days_elapsed, user.is_overdue)}{user.is_overdue && <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />}</div><div className="mt-1 text-sm text-gray-600"><span>最終記録者: {user.last_activity_staff_name || "記録なし"}</span><span className="mx-2">•</span><span>最終活動: {formatDate(user.last_activity_date)}</span></div></div>
                              <div className="text-right"><div className="text-lg font-semibold text-gray-900">{user.days_elapsed === 999 ? "---" : `${user.days_elapsed}日`}</div><div className="text-xs text-gray-500">経過</div></div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">該当する利用者がいません</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <MiniCalendar />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">活動状況ダッシュボード</h2>
            <div className="flex items-center gap-2">
              {(['this_month', 'last_month', 'last_3_months'] as TimeRange[]).map(range => (
                <Button key={range} variant={analyticsTimeRange === range ? 'default' : 'outline'} size="sm" onClick={() => setAnalyticsTimeRange(range)}>
                  {range === 'this_month' ? '今月' : range === 'last_month' ? '先月' : '過去3ヶ月'}
                </Button>
              ))}
            </div>
          </div>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader><CardTitle className="flex items-center text-lg"><BarChartIcon className="h-5 w-5 mr-2" />スタッフ別 活動件数</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                      <Tooltip wrapperClassName="!text-sm !rounded-lg !border-border !bg-background !shadow-lg"/>
                      <Bar dataKey="活動件数" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center text-lg"><Hourglass className="h-5 w-5 mr-2" />スタッフ別 合計活動時間</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} label={{ value: '分', position: 'insideTopLeft', dy: -10, fontSize: 12 }}/>
                      <Tooltip wrapperClassName="!text-sm !rounded-lg !border-border !bg-background !shadow-lg"/>
                      <Bar dataKey="合計時間 (分)" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center text-lg"><PieChartIcon className="h-5 w-5 mr-2" />活動種別 割合 (件数)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={activityTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {activityTypeData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip wrapperClassName="!text-sm !rounded-lg !border-border !bg-background !shadow-lg"/>
                      <Legend iconSize={10} wrapperStyle={{fontSize: "0.8rem"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center text-lg"><Hourglass className="h-5 w-5 mr-2" />活動種別 割合 (時間)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={activityTypeTimeData} dataKey="合計時間 (分)" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {activityTypeTimeData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip wrapperClassName="!text-sm !rounded-lg !border-border !bg-background !shadow-lg"/>
                      <Legend iconSize={10} wrapperStyle={{fontSize: "0.8rem"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}