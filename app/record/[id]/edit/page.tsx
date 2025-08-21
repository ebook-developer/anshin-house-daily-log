"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"

// 記録追加ページとほぼ同じ型定義
interface Staff { id: string; name: string; }
interface ActivityType { id: string; name: string; color: string | null; }

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
  
  // フォームの型を定義
  type FormData = {
    user_id: string;
    activity_date: string;
    staff_id: string;
    activity_type_id: string;
    content: string;
    has_next_appointment: boolean;
    next_appointment_date: string | null;
    next_appointment_content: string | null;
  }
  const [formData, setFormData] = useState<FormData | null>(null)
  const [userName, setUserName] = useState<string>("") // 利用者名は編集不可なので別途保持

  const fetchInitialData = useCallback(async () => {
    if (!recordId) return;
    try {
      setLoading(true)
      setError(null)

      // 編集対象の記録と、プルダウン用のマスターデータを並行して取得
      const [recordData, staffData, activityTypesData] = await Promise.all([
        supabase.from("activity_records").select(`*, users (name)`).eq("id", recordId).single(),
        supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
        supabase.from("activity_types").select("id, name, color").eq("is_active", true).order("name"),
      ])

      if (recordData.error) throw recordData.error
      if (staffData.error) throw staffData.error
      if (activityTypesData.error) throw activityTypesData.error
      
      const record = recordData.data;
      setFormData({
        user_id: record.user_id,
        activity_date: record.activity_date,
        staff_id: record.staff_id,
        activity_type_id: record.activity_type_id,
        content: record.content,
        has_next_appointment: record.has_next_appointment ?? false,
        next_appointment_date: record.next_appointment_date,
        next_appointment_content: record.next_appointment_content,
      });
      setUserName((record.users as { name: string })?.name || '不明な利用者')
      
      if (staffData.data) setStaff(staffData.data)
      if (activityTypesData.data) setActivityTypes(activityTypesData.data)

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
          staff_id: formData.staff_id,
          activity_type_id: formData.activity_type_id,
          activity_date: formData.activity_date,
          content: formData.content,
          has_next_appointment: formData.has_next_appointment,
          next_appointment_date: formData.has_next_appointment ? formData.next_appointment_date : null,
          next_appointment_content: formData.has_next_appointment ? formData.next_appointment_content : null,
        })
        .eq('id', recordId);

      if (updateError) throw updateError
      
      alert("活動記録を更新しました")
      router.push(`/user/${formData.user_id}`) // 更新後は利用者詳細ページに戻る
      router.refresh(); // ページをリフレッシュして最新の情報を表示
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

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">活動記録の編集</h1>
        <Link href={`/user/${formData.user_id}`}>
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />利用者詳細に戻る</Button>
        </Link>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-xl sm:text-2xl">記録の修正</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label htmlFor="activity_date">対応日 *</Label><Input id="activity_date" type="date" value={formData.activity_date} onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })} required/></div>
              <div className="space-y-2"><Label htmlFor="staff_id">担当スタッフ *</Label><Select value={formData.staff_id} onValueChange={(value) => setFormData({ ...formData, staff_id: value })}><SelectTrigger id="staff_id"><SelectValue placeholder="スタッフを選択" /></SelectTrigger><SelectContent>{staff.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>利用者 (編集不可)</Label><Input value={userName} disabled /></div>
              <div className="space-y-2"><Label htmlFor="activity_type_id">活動種別 *</Label><Select value={formData.activity_type_id} onValueChange={(value) => setFormData({ ...formData, activity_type_id: value })}><SelectTrigger id="activity_type_id"><SelectValue placeholder="活動種別を選択" /></SelectTrigger><SelectContent>{activityTypes.map((at) => (<SelectItem key={at.id} value={at.id}><div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: at.color || '#cccccc' }}></div>{at.name}</div></SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="content">活動内容 *</Label><Textarea id="content" placeholder="実施した活動の詳細を記入" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4} required/></div>
            <div className="space-y-4"><div className="flex items-center space-x-2"><Checkbox id="has_next_appointment" checked={formData.has_next_appointment} onCheckedChange={(checked) => setFormData({ ...formData, has_next_appointment: checked as boolean })}/><Label htmlFor="has_next_appointment">次回対応予定あり</Label></div>
              {formData.has_next_appointment && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6"><div className="space-y-2"><Label htmlFor="next_appointment_date">次回対応日</Label><Input id="next_appointment_date" type="date" value={formData.next_appointment_date || ""} onChange={(e) => setFormData({ ...formData, next_appointment_date: e.target.value })}/></div><div className="space-y-2 md:col-span-2"><Label htmlFor="next_appointment_content">次回対応内容</Label><Textarea id="next_appointment_content" placeholder="次回実施予定の内容を記入" value={formData.next_appointment_content || ""} onChange={(e) => setFormData({ ...formData, next_appointment_content: e.target.value })} rows={2}/></div></div>)}
            </div>
            <div className="flex justify-end space-x-4"><Link href={`/user/${formData.user_id}`}><Button type="button" variant="outline">キャンセル</Button></Link><Button type="submit" disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "更新中..." : "更新"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}