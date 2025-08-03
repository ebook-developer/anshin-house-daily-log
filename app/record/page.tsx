"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Staff {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

interface ActivityType {
  id: string
  name: string
  color: string
}

export default function RecordPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    activity_date: new Date().toISOString().split("T")[0],
    staff_id: "",
    user_id: "",
    activity_type_id: "",
    content: "",
    has_next_appointment: false,
    next_appointment_date: "",
    next_appointment_content: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setError(null)

      const [staffData, usersData, activityTypesData] = await Promise.all([
        supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
        supabase.from("users").select("id, name").eq("is_active", true).order("name"),
        supabase.from("activity_types").select("id, name, color").eq("is_active", true).order("name"),
      ])

      if (staffData.error) throw staffData.error
      if (usersData.error) throw usersData.error
      if (activityTypesData.error) throw activityTypesData.error

      if (staffData.data) setStaff(staffData.data)
      if (usersData.data) setUsers(usersData.data)
      if (activityTypesData.data) setActivityTypes(activityTypesData.data)
    } catch (error) {
      console.error("データの取得に失敗しました:", error)
      setError("データの取得に失敗しました。Supabaseの設定を確認してください。")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from("activity_records").insert([
        {
          ...formData,
          next_appointment_date: formData.has_next_appointment ? formData.next_appointment_date : null,
          next_appointment_content: formData.has_next_appointment ? formData.next_appointment_content : null,
        },
      ])

      if (error) throw error

      alert("活動記録を保存しました")
      router.push("/")
    } catch (error) {
      console.error("保存に失敗しました:", error)
      alert("保存に失敗しました。もう一度お試しください。")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/">
            <Button>ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-4">活動記録の追加</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>新しい活動記録</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="activity_date">対応日 *</Label>
                  <Input
                    id="activity_date"
                    type="date"
                    value={formData.activity_date}
                    onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff_id">担当スタッフ *</Label>
                  <Select
                    value={formData.staff_id}
                    onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="スタッフを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_id">利用者 *</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="利用者を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_type_id">活動種別 *</Label>
                  <Select
                    value={formData.activity_type_id}
                    onValueChange={(value) => setFormData({ ...formData, activity_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="活動種別を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((at) => (
                        <SelectItem key={at.id} value={at.id}>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: at.color }}></div>
                            {at.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">活動内容 *</Label>
                <Textarea
                  id="content"
                  placeholder="実施した活動の詳細を記入してください"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_next_appointment"
                    checked={formData.has_next_appointment}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, has_next_appointment: checked as boolean })
                    }
                  />
                  <Label htmlFor="has_next_appointment">次回対応予定あり</Label>
                </div>

                {formData.has_next_appointment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div className="space-y-2">
                      <Label htmlFor="next_appointment_date">次回対応日</Label>
                      <Input
                        id="next_appointment_date"
                        type="date"
                        value={formData.next_appointment_date}
                        onChange={(e) => setFormData({ ...formData, next_appointment_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="next_appointment_content">次回対応内容</Label>
                      <Textarea
                        id="next_appointment_content"
                        placeholder="次回実施予定の内容を記入してください"
                        value={formData.next_appointment_content}
                        onChange={(e) => setFormData({ ...formData, next_appointment_content: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    キャンセル
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
