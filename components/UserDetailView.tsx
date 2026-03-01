"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Clock, ExternalLink, Pencil, Trash2, Hourglass, ListTodo, CheckCircle2, AlertCircle } from "lucide-react" // CalendarDays を削除
import Link from "next/link"
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
import { formatTimeSafe } from "@/lib/date-utils"

interface UserDetailViewProps {
  user: { id: string; name: string; master_uid: string | null; }
  initialActivities: any[]
}

export function UserDetailView({ user, initialActivities }: UserDetailViewProps) {
  const supabase = createClient()
  const [activities, setActivities] = useState(initialActivities)
  const masterDbUrl = process.env.NEXT_PUBLIC_MASTER_DB_URL || "https://anshinhousedb.vercel.app";

  const handleDelete = async (recordId: string) => {
    try {
      const { error } = await supabase.from('activity_records').delete().eq('id', recordId)
      if (error) throw error
      setActivities(activities.filter(a => a.id !== recordId))
      alert("記録を削除しました。")
    } catch (err) {
      console.error("Delete failed:", err);
      alert("削除に失敗しました。");
    }
  }

  const handleCompleteTask = async (recordId: string) => {
    try {
      const { error } = await supabase.from('activity_records').update({ is_completed: true }).eq('id', recordId);
      if (error) throw error;
      setActivities(activities.map(a => a.id === recordId ? { ...a, is_completed: true } : a));
    } catch (err) {
      console.error("Task completion failed:", err);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", { 
      year: "numeric", month: "long", day: "numeric", weekday: "short" 
    })
  }

  const formatDurationDisplay = (minutes: number | null) => {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return m > 0 ? `${h}時間${m}分` : `${h}時間`;
    }
    return `${m}分`;
  }

  const uncompletedTasks = activities.filter(a => !a.is_completed);
  const completedRecords = activities.filter(a => a.is_completed);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center text-lg"><User className="h-5 w-5 mr-2 text-primary" />利用者情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><h2 className="text-2xl font-bold text-gray-900">{user.name}</h2></div>
            {user.master_uid && (
              <Button asChild className="w-full shadow-sm" variant="outline">
                <a href={`${masterDbUrl}/users/${user.master_uid}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />マスター詳細を表示
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center text-lg"><Clock className="h-5 w-5 mr-2 text-primary" />活動履歴・タスク</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            
            {uncompletedTasks.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <h3 className="text-sm font-bold mb-4 flex items-center text-amber-700 uppercase tracking-wider">
                  <ListTodo className="h-4 w-4 mr-2"/>未完了のタスク ({uncompletedTasks.length}件)
                </h3>
                <div className="space-y-4">
                  {uncompletedTasks.map((task) => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const dueDate = new Date(task.activity_date);
                    const isOverdue = dueDate < today;
                    return (
                      <div key={task.id} className={cn("border-l-4 p-4 rounded-r-md transition-all", isOverdue ? "border-destructive bg-destructive/5" : "border-amber-500 bg-amber-50/50")}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={isOverdue ? "destructive" : "secondary"} className={!isOverdue ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}>
                              <AlertCircle className="h-3 w-3 mr-1.5"/>{task.activity_type_name}
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">{task.staff_name}</span>
                          </div>
                          <div className="flex items-center text-sm font-bold text-destructive">
                            <Calendar className="h-4 w-4 mr-1" />{formatDate(task.activity_date)} {formatTimeSafe(task.task_time)}
                          </div>
                        </div>
                        <p className="text-gray-900 mb-4 whitespace-pre-wrap text-sm leading-relaxed">{task.content || '(タスク詳細なし)'}</p>
                        <div className="flex justify-end items-center space-x-2">
                          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 shadow-sm" onClick={() => handleCompleteTask(task.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5"/>完了にする
                          </Button>
                          <Link href={`/record/${task.id}/edit`}>
                            <Button variant="outline" size="sm" className="h-8"><Pencil className="h-3 w-3 mr-1.5"/>編集</Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {completedRecords.length > 0 && (
              <div className="animate-in fade-in duration-700">
                {uncompletedTasks.length > 0 && <Separator className="my-8" />}
                <h3 className="text-sm font-bold mb-4 flex items-center text-gray-700 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600"/>完了済みの活動実績
                </h3>
                <div className="space-y-6">
                  {completedRecords.map((activity) => {
                    const durationText = formatDurationDisplay(activity.duration_minutes);
                    return (
                      <div key={activity.id} className="group border-l-4 pl-4 border-gray-200 hover:border-primary/30 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="font-bold">{activity.activity_type_name}</Badge>
                            <span className="text-xs font-medium text-muted-foreground">{activity.staff_name}</span>
                          </div>
                          <div className="flex items-center text-xs font-bold text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 mr-1" />{formatDate(activity.activity_date)}
                            {durationText && (
                              <span className="ml-3 flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-100">
                                <Hourglass className="h-3 w-3 mr-1"/>{durationText}
                              </span>
                            )}
                          </div>
                        </div>
                        {activity.content ? (
                          <p className="text-gray-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{activity.content}</p>
                        ) : (
                          <p className="text-muted-foreground italic text-xs mb-3">（活動内容の記入なし）</p>
                        )}
                        <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/record/${activity.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary"><Pencil className="h-3 w-3 mr-1"/>編集</Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3 mr-1"/>削除</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>削除の最終確認</AlertDialogTitle><AlertDialogDescription>この活動記録を完全に削除します。この操作は取り消せません。</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(activity.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">削除を実行</AlertDialogAction>
                              </AlertDialogFooter>
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
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-sm italic">まだ活動記録がありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}