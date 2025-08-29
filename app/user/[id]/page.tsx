"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Clock, AlertTriangle, ExternalLink, Pencil, Trash2, ArrowLeft, Hourglass, ListTodo, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { Database } from "@/lib/database.types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface UserDetail { id: string; name: string; master_uid: string | null; }
interface ActivityRecord {
  id: string
  activity_date: string
  start_time: string | null
  end_time: string | null
  task_time: string | null
  content: string | null
  staff_name: string
  activity_type_name: string
  is_completed: boolean | null
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

        const { data: activitiesData, error: activitiesError } = await supabase.from("activity_records").select(`id, activity_date, start_time, end_time, task_time, content, is_completed, staff:staff_id (name), activity_types:activity_type_id (name)`).eq("user_id", userId).order("activity_date", { ascending: false, nullsFirst: false }).order("start_time", { ascending: false, nullsFirst: false })
        if (activitiesError) throw activitiesError

        if (activitiesData) {
          const formattedActivities = activitiesData.map((record) => ({
            id: record.id,
            activity_date: record.activity_date,
            start_time: record.start_time,
            end_time: record.end_time,
            task_time: record.task_time,
            content: record.content,
            staff_name: (record.staff as Staff | null)?.name ?? '未割り当て',
            activity_type_name: (record.activity_types as ActivityType | null)?.name ?? '不明',
            is_completed: record.is_completed ?? true,
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

  const handleDelete = async (recordId: string) => {
    try {
      const { error: deleteError } = await supabase.from('activity_records').delete().eq('id', recordId)
      if (deleteError) throw deleteError
      setActivities(activities.filter(a => a.id !== recordId))
      alert("記録を削除しました。")
    } catch (err) {
      console.error("削除に失敗しました:", err);
      alert("記録の削除に失敗しました。");
    }
  }

  const handleCompleteTask = async (recordId: string) => {
    try {
      const { error } = await supabase.from('activity_records').update({ is_completed: true }).eq('id', recordId);
      if (error) throw error;
      setActivities(activities.map(a => a.id === recordId ? { ...a, is_completed: true } : a));
    } catch (err) {
      console.error("タスクの完了処理に失敗しました:", err);
      alert("タスクの完了処理に失敗しました。");
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
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
    } catch (_e) {
      return null;
    }
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

  const uncompletedTasks = activities.filter(a => !a.is_completed);
  const completedRecords = activities.filter(a => a.is_completed);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">利用者詳細</h1>
        <Link href="/">
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />ダッシュボードに戻る</Button>
        </Link>
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
            <CardContent className="space-y-6">
              {uncompletedTasks.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold mb-3 flex items-center text-amber-800"><ListTodo className="h-4 w-4 mr-2"/>未完了のタスク ({uncompletedTasks.length}件)</h3>
                  <div className="space-y-6">
                    {uncompletedTasks.map((task) => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const dueDate = new Date(task.activity_date);
                      const isOverdue = dueDate < today;
                      return (
                        <div key={task.id} className={cn("border-l-4 p-4 rounded-r-md", isOverdue ? "border-destructive bg-destructive/10" : "border-amber-500 bg-amber-50/50")}>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                            <div className="flex items-center space-x-2"><Badge variant={isOverdue ? "destructive" : "secondary"} className={!isOverdue ? 'bg-amber-500 hover:bg-amber-600' : ''}><AlertCircle className="h-3 w-3 mr-1.5"/>{task.activity_type_name}</Badge><span className="text-sm text-gray-600">担当: {task.staff_name}</span></div>
                            <div className="flex items-center text-sm font-semibold text-destructive"><Calendar className="h-4 w-4 mr-1" />期限: {formatDate(task.activity_date)} {formatTime(task.task_time)}</div>
                          </div>
                          <p className="text-gray-900 mb-3 whitespace-pre-wrap">{task.content || '(タスク詳細なし)'}</p>
                          <div className="flex justify-end items-center space-x-2">
                            <Button variant="default" size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleCompleteTask(task.id)}><CheckCircle2 className="h-3 w-3 mr-1.5"/>完了にする</Button>
                            <Link href={`/record/${task.id}/edit`}><Button variant="outline" size="sm"><Pencil className="h-3 w-3 mr-1.5"/>編集</Button></Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-3 w-3 mr-1.5"/>削除</Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle><AlertDialogDescription>この操作は元に戻せません。この記録はデータベースから完全に削除されます。</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(task.id)}>はい、削除します</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {completedRecords.length > 0 && (
                <div>
                  {uncompletedTasks.length > 0 && <Separator className="my-6" />}
                  <h3 className="text-md font-semibold mb-3 flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-600"/>完了済みの活動履歴</h3>
                  <div className="space-y-6">
                    {completedRecords.map((activity) => {
                      const duration = calculateDuration(activity.start_time, activity.end_time);
                      return (
                        <div key={activity.id} className="border-l-4 pl-4 border-gray-200">
                           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                            <div className="flex items-center space-x-2"><Badge variant="outline">{activity.activity_type_name}</Badge><span className="text-sm text-gray-600">担当: {activity.staff_name}</span></div>
                            <div className="flex items-center text-sm text-gray-500 flex-wrap">
                              <div className="flex items-center mr-2"><Calendar className="h-4 w-4 mr-1" /><span>{formatDate(activity.activity_date)}</span></div>
                              {(activity.start_time || activity.end_time) && (<span className="font-mono text-xs sm:text-sm">{formatTime(activity.start_time) || '...'} - {formatTime(activity.end_time) || '...'}</span>)}
                              {duration !== null && (<span className="ml-2 flex items-center text-xs text-blue-600 font-semibold bg-blue-100 px-1.5 py-0.5 rounded-full"><Hourglass className="h-3 w-3 mr-1"/>{duration}分</span>)}
                            </div>
                          </div>
                          {activity.content ? (<p className="text-gray-900 mb-3 whitespace-pre-wrap">{activity.content}</p>) : (<p className="text-gray-500 italic mb-3">（内容は記入されていません）</p>)}
                          <div className="flex justify-end items-center space-x-2">
                            <Link href={`/record/${activity.id}/edit`}><Button variant="outline" size="sm"><Pencil className="h-3 w-3 mr-1.5"/>編集</Button></Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-3 w-3 mr-1.5"/>削除</Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle><AlertDialogDescription>この操作は元に戻せません。この記録はデータベースから完全に削除されます。</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(activity.id)}>はい、削除します</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
               {activities.length === 0 && (
                <div className="text-center py-8 text-gray-500">まだ活動記録がありません</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}