"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, AlertTriangle, ArrowLeft, ClipboardCheck, ClipboardPlus, Info } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Staff { id: string; name: string; }
interface ActivityType { id: string; name: string; }
type FormMode = "record" | "task";

export default function EditRecordPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const recordId = params.id as string

  const [staff, setStaff] = useState<Staff[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  type FormData = {
    user_id: string;
    activity_date: string;
    start_time: string | null;
    end_time: string | null;
    task_time: string | null;
    staff_id: string | null;
    activity_type_id: string;
    content: string | null;
    is_completed: boolean;
  }
  const [formData, setFormData] = useState<FormData | null>(null)
  const [userName, setUserName] = useState<string>("")

  const fetchInitialData = useCallback(async () => {
    if (!recordId) return;
    try {
      setLoading(true)
      setError(null)
      const [recordData, staffData, activityTypesData] = await Promise.all([
        supabase.from("activity_records").select(`*, users (name)`).eq("id", recordId).single(),
        supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
        supabase.from("activity_types").select("id, name").eq("is_active", true).order("name"),
      ])
      if (recordData.error) throw recordData.error
      if (staffData.error) throw staffData.error
      if (activityTypesData.error) throw activityTypesData.error
      
      const record = recordData.data;
      setFormData({
        user_id: record.user_id,
        activity_date: record.activity_date,
        start_time: record.start_time,
        end_time: record.end_time,
        task_time: record.task_time,
        staff_id: record.staff_id,
        activity_type_id: record.activity_type_id,
        content: record.content,
        is_completed: record.is_completed ?? true,
      });
      setUserName((record.users as { name: string })?.name || '不明な利用者')
      if (staffData.data) setStaff(staffData.data)
      if (activityTypesData.data) setActivityTypes(activityTypesData.data as ActivityType[])
    } catch (err: unknown) {
      console.error("データの取得に失敗しました:", err)
      setError(err instanceof Error ? err.message : "データの取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [recordId, supabase])
  
  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return;
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from("activity_records")
        .update({
          staff_id: formData.staff_id || null,
          activity_type_id: formData.activity_type_id,
          activity_date: formData.activity_date,
          start_time: formData.is_completed ? (formData.start_time || null) : null,
          end_time: formData.is_completed ? (formData.end_time || null) : null,
          task_time: !formData.is_completed ? (formData.task_time || null) : null,
          content: formData.content,
          is_completed: formData.is_completed,
        })
        .eq('id', recordId);

      if (updateError) throw updateError
      alert("活動記録を更新しました")
      router.push(`/user/${formData.user_id}`)
      router.refresh();
    } catch (err) {
      console.error("更新に失敗しました:", err)
      alert("更新に失敗しました。もう一度お試しください。")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !formData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">記録を読み込んでいます...</p>
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
          <Link href="/"><Button>ダッシュボードに戻る</Button></Link>
        </div>
      </div>
    )
  }

  const formMode = formData.is_completed ? 'record' : 'task';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">活動記録の編集</h1>
        <Link href={`/user/${formData.user_id}`}><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />利用者詳細に戻る</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Label className="text-base font-semibold">記録の種類を選択</Label>
            <ToggleGroup 
              type="single" 
              value={formMode} 
              onValueChange={(value: FormMode) => {
                if (value && formData) setFormData({ ...formData, is_completed: value === 'record' })
              }} 
              className="grid grid-cols-2 h-auto"
            >
              <ToggleGroupItem value="record" className="flex flex-col items-center justify-center h-24 text-sm gap-2 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800 data-[state=on]:border-blue-300">
                <ClipboardCheck className="h-6 w-6"/>
                <span className="font-bold">活動記録</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">完了済みの活動を修正</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="task" className="flex flex-col items-center justify-center h-24 text-sm gap-2 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-800 data-[state=on]:border-amber-300">
                <ClipboardPlus className="h-6 w-6"/>
                <span className="font-bold">未完了タスク</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">未来の予定を修正</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="activity_date">{formMode === 'record' ? '対応日 *' : '対応希望日 *'}</Label>
                <Input id="activity_date" type="date" value={formData.activity_date} onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })} required/>
              </div>
              {formMode === 'record' ? (
                <>
                  <div className="space-y-2"><Label htmlFor="start_time">開始時間</Label><Input id="start_time" type="time" value={formData.start_time || ""} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}/></div>
                  <div className="space-y-2"><Label htmlFor="end_time">終了時間</Label><Input id="end_time" type="time" value={formData.end_time || ""} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}/></div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="task_time">希望時間</Label>
                  <Input id="task_time" type="time" value={formData.task_time || ""} onChange={(e) => setFormData({ ...formData, task_time: e.target.value })}/>
                </div>
              )}
            </div>
            {formMode === 'record' && (
              <Alert variant="default" className="-mt-2">
                <Info className="h-4 w-4" />
                <AlertTitle className="font-semibold">時間の入力について</AlertTitle>
                <AlertDescription className="text-xs">
                  時間は任意項目です。移動時間は含めず、実際の支援時間を入力してください。<br />
                  このデータは、将来的に活動ごとの所要時間を分析し、業務改善に役立てるために活用されます。
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label>利用者 (編集不可)</Label><Input value={userName} disabled /></div>
              <div className="space-y-2">
                <Label htmlFor="staff_id">{formMode === 'record' ? '担当スタッフ *' : '担当スタッフ (後で割当可)'}</Label>
                <Select value={formData.staff_id || ""} onValueChange={(value) => setFormData({ ...formData, staff_id: value })}><SelectTrigger id="staff_id"><SelectValue placeholder="スタッフを選択" /></SelectTrigger><SelectContent>{staff.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="activity_type_id">活動種別 *</Label>
                <Select value={formData.activity_type_id} onValueChange={(value) => setFormData({ ...formData, activity_type_id: value })}>
                  <SelectTrigger id="activity_type_id"><SelectValue placeholder="活動種別を選択" /></SelectTrigger>
                  <SelectContent>{activityTypes.map((at) => (<SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>))}</SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground ml-1">
                  活動種別は<Link href="/settings" className="underline hover:text-primary">設定ページ</Link>で追加・編集できます。
                </p>
              </div>
            </div>

            <div className="space-y-2"><Label htmlFor="content">{formMode === 'record' ? '活動内容' : 'タスクの詳細内容'}</Label><Textarea id="content" placeholder={formMode === 'record' ? "特記事項があれば記入してください（任意）" : "依頼されたタスクの詳細を記入してください"} value={formData.content || ""} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4}/></div>
            
            <div className="flex justify-end space-x-4"><Link href={`/user/${formData.user_id}`}><Button type="button" variant="outline">キャンセル</Button></Link><Button type="submit" disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "更新中..." : "更新"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}