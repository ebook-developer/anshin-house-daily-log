//components/EditRecordForm.tsx
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, ClipboardCheck, ClipboardPlus, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Props {
  initialRecord: any
  userName: string
  staffList: any[]
  activityTypes: any[]
}

export function EditRecordForm({ initialRecord, userName, staffList, activityTypes }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // フォーム状態の初期化 (以前のロジックを完全維持)
  const [formData, setFormData] = useState({
    user_id: initialRecord.user_id,
    activity_date: initialRecord.activity_date,
    start_time: initialRecord.start_time,
    end_time: initialRecord.end_time,
    task_time: initialRecord.task_time,
    staff_id: initialRecord.staff_id,
    activity_type_id: initialRecord.activity_type_id,
    content: initialRecord.content,
    is_completed: initialRecord.is_completed ?? true,
  })

  const formMode = formData.is_completed ? 'record' : 'task'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        .eq('id', initialRecord.id)

      if (updateError) throw updateError
      
      alert("活動記録を更新しました")
      router.push(`/user/${formData.user_id}`)
      router.refresh()
    } catch (err) {
      console.error("Update failed:", err)
      alert("更新に失敗しました。もう一度お試しください。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">活動記録の編集</h1>
        <Link href={`/user/${formData.user_id}`}>
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />戻る</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Label className="text-base font-semibold">記録の種類</Label>
            <ToggleGroup 
              type="single" 
              value={formMode} 
              onValueChange={(value) => {
                if (value) setFormData({ ...formData, is_completed: value === 'record' })
              }} 
              className="grid grid-cols-2 gap-4 h-auto"
            >
              <ToggleGroupItem value="record" className="flex flex-col h-20 gap-1 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700 data-[state=on]:border-blue-200 border">
                <ClipboardCheck className="h-5 w-5"/>
                <span className="font-bold">活動記録</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="task" className="flex flex-col h-20 gap-1 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 data-[state=on]:border-amber-200 border">
                <ClipboardPlus className="h-5 w-5"/>
                <span className="font-bold">未完了タスク</span>
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
                <div className="space-y-2"><Label htmlFor="task_time">希望時間</Label><Input id="task_time" type="time" value={formData.task_time || ""} onChange={(e) => setFormData({ ...formData, task_time: e.target.value })}/></div>
              )}
            </div>

            {formMode === 'record' && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">時間の入力</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">実績の所要時間を分析するため、正確な入力にご協力ください。</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label>利用者</Label><Input value={userName} disabled className="bg-muted cursor-not-allowed" /></div>
              <div className="space-y-2">
                <Label htmlFor="staff_id">担当スタッフ</Label>
                <Select value={formData.staff_id || ""} onValueChange={(v) => setFormData({ ...formData, staff_id: v })}>
                  <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                  <SelectContent>{staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="activity_type_id">活動種別 *</Label>
                <Select value={formData.activity_type_id} onValueChange={(v) => setFormData({ ...formData, activity_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                  <SelectContent>{activityTypes.map(at => <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <Textarea id="content" value={formData.content || ""} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={5} />
            </div>

            <div className="flex justify-end gap-4">
              <Link href={`/user/${formData.user_id}`}><Button type="button" variant="outline">キャンセル</Button></Link>
              <Button type="submit" disabled={saving} className="min-w-[120px]">
                <Save className="h-4 w-4 mr-2" /> {saving ? "更新中..." : "更新して保存"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}