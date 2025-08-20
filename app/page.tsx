"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, AlertTriangle, User } from "lucide-react"
import Link from "next/link"
import MiniCalendar from "@/components/MiniCalendar"

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

export default function Dashboard() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithLastActivity[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithLastActivity[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all")
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null)

        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("id, name")
          .eq("is_active", true)
          .order("name")

        if (staffError) throw staffError
        if (staffData) setStaff(staffData)

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, master_uid")
          .eq("is_active", true)
          .order("name")

        if (usersError) throw usersError

        if (usersData) {
          const usersWithActivity = await Promise.all(
            usersData.map(async (user) => {
              const { data: lastActivity, error: activityError } = await supabase
                .from("activity_records")
                .select("activity_date, staff:staff_id(name)")
                .eq("user_id", user.id)
                .order("activity_date", { ascending: false })
                .limit(1)
                .single();

              if (activityError && activityError.code !== 'PGRST116') {
                console.error(`利用者${user.name}の活動記録取得エラー:`, activityError)
              }
              
              const staffName = (lastActivity?.staff as { name: string } | null)?.name || null

              const lastActivityDate = lastActivity?.activity_date || null
              const daysElapsed = lastActivityDate
                ? Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
                : 999

              return {
                id: user.id,
                name: user.name,
                master_uid: user.master_uid,
                last_activity_staff_name: staffName,
                last_activity_date: lastActivityDate,
                days_elapsed: daysElapsed,
                is_overdue: daysElapsed > 90,
              }
            }),
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
    fetchData()
  }, [supabase])

  useEffect(() => {
    if (selectedStaffId === "all") {
      setFilteredUsers(users)
    } else {
      const filterUsersByLastStaff = async () => {
        const filtered = await Promise.all(users.map(async (user) => {
          const { data: lastRecord } = await supabase
            .from("activity_records")
            .select("staff_id")
            .eq("user_id", user.id)
            .order("activity_date", { ascending: false })
            .limit(1)
            .single();
          
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">総利用者数</CardTitle><User className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{users.length}名</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">要注意利用者</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{users.filter((u) => u.is_overdue).length}名</div><p className="text-xs text-muted-foreground">90日以上未接触</p></CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">今日の日付</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{new Date().toLocaleDateString("ja-JP")}</div></CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
           <Card>
            <CardHeader><CardTitle className="text-lg">利用者ケア状況ダッシュボード</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4"><label className="text-sm font-medium">担当者で絞り込み:</label><Select value={selectedStaffId} onValueChange={setSelectedStaffId}><SelectTrigger className="w-48"><SelectValue placeholder="担当者を選択" /></SelectTrigger><SelectContent><SelectItem value="all">すべて</SelectItem>{staff.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <MiniCalendar />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center text-lg"><Clock className="h-5 w-5 mr-2" />利用者一覧（経過日数順）</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Link key={user.id} href={`/user/${user.id}`}>
                <div className={`p-4 rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer ${user.is_overdue ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between"><div className="flex-1"><div className="flex items-center"><h3 className="font-medium text-gray-900">{user.name}</h3>{getDaysElapsedBadge(user.days_elapsed, user.is_overdue)}{user.is_overdue && <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />}</div><div className="mt-1 text-sm text-gray-600"><span>最終記録者: {user.last_activity_staff_name || "記録なし"}</span><span className="mx-2">•</span><span>最終活動: {formatDate(user.last_activity_date)}</span></div></div><div className="text-right"><div className="text-lg font-semibold text-gray-900">{user.days_elapsed === 999 ? "---" : `${user.days_elapsed}日`}</div><div className="text-xs text-gray-500">経過</div></div></div>
                </div>
              </Link>
            ))}
            {filteredUsers.length === 0 && (<div className="text-center py-8 text-gray-500">該当する利用者がいません</div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}