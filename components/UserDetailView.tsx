//components/UserDetailView.tsx 
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Clock, ExternalLink, Trash2, ListTodo, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
// 【追加】堅牢な日付・時間ユーティリティ
import { calculateDurationMinutes, formatTimeSafe } from "@/lib/date-utils"

interface UserDetailViewProps {
  user: { id: string; name: string; master_uid: string | null; }
  initialActivities: any[]
}

export function UserDetailView({ user, initialActivities }: UserDetailViewProps) {
  const supabase = createClient()
  const [activities, setActivities] = useState(initialActivities)
  const masterDbUrl = process.env.NEXT_PUBLIC_MASTER_DB_URL || "https://anshinhousedb.vercel.app"

  const handleDelete = async (recordId: string) => {
    const { error } = await supabase.from('activity_records').delete().eq('id', recordId)
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== recordId))
      alert("記録を削除しました。")
    }
  }

  const handleCompleteTask = async (recordId: string) => {
    const { error } = await supabase.from('activity_records').update({ is_completed: true }).eq('id', recordId)
    if (!error) {
      setActivities(prev => prev.map(a => a.id === recordId ? { ...a, is_completed: true } : a))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
  }

  const uncompletedTasks = activities.filter(a => !a.is_completed)
  const completedRecords = activities.filter(a => a.is_completed)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader><CardTitle className="flex items-center"><User className="h-5 w-5 mr-2" />利用者情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            {user.master_uid && (
              <Button asChild className="w-full">
                <a href={`${masterDbUrl}/users/${user.master_uid}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />マスター情報を表示
                </a>
              </Button>
            )}
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
                <div className="space-y-4">
                  {uncompletedTasks.map((task) => (
                    <div key={task.id} className="border-l-4 border-amber-500 bg-amber-50/50 p-4 rounded-r-md">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                        <Badge variant="secondary" className="bg-amber-500 text-white">{task.activity_type_name}</Badge>
                        <div className="text-sm font-semibold text-destructive flex items-center">
                           <Calendar className="h-4 w-4 mr-1" />期限: {formatDate(task.activity_date)} {formatTimeSafe(task.task_time)}
                        </div>
                      </div>
                      <p className="text-gray-900 mb-3 whitespace-pre-wrap">{task.content || '(詳細なし)'}</p>
                      <div className="flex justify-end space-x-2">
                        <Button variant="default" size="sm" className="bg-green-500" onClick={() => handleCompleteTask(task.id)}>完了</Button>
                        <Link href={`/record/${task.id}/edit`}><Button variant="outline" size="sm">編集</Button></Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedRecords.length > 0 && (
              <div>
                {uncompletedTasks.length > 0 && <Separator className="my-6" />}
                <h3 className="text-md font-semibold mb-3 flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-600"/>完了済みの活動履歴</h3>
                <div className="space-y-6">
                  {completedRecords.map((activity) => {
                    // 【修正】ユーティリティを使用した計算
                    const duration = calculateDurationMinutes(activity.start_time, activity.end_time)
                    return (
                      <div key={activity.id} className="border-l-4 pl-4 border-gray-200">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center space-x-2"><Badge variant="outline">{activity.activity_type_name}</Badge><span className="text-xs text-muted-foreground">担当: {activity.staff_name}</span></div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> {formatDate(activity.activity_date)}
                            {duration !== null && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">{duration}分</span>}
                          </div>
                        </div>
                        <p className="text-gray-900 mb-3 whitespace-pre-wrap">{activity.content || '(内容なし)'}</p>
                        <div className="flex justify-end space-x-2">
                           <Link href={`/record/${activity.id}/edit`}><Button variant="outline" size="sm">編集</Button></Link>
                           <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>削除確認</AlertDialogTitle><AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(activity.id)}>削除</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}