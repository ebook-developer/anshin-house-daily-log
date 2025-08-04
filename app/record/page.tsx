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
import { ArrowLeft, Save, AlertTriangle, Check, ChevronsUpDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

// 型定義
interface Staff {
  id: string;
  name: string;
}
interface ActivityType {
  id: string;
  name: string;
  color: string;
}
// マスターDBから取得する利用者の型
interface MasterUser {
  uid: string;
  name: string;
}

export default function RecordPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff[]>([])
  // ★利用者リストの型をMasterUserに変更
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    activity_date: new Date().toISOString().split("T")[0],
    staff_id: "",
    // ★user_id を master_user_uid に変更。活動記録に直接紐づけるのはマスターのUID。
    master_user_uid: "", 
    activity_type_id: "",
    content: "",
    has_next_appointment: false,
    next_appointment_date: "",
    next_appointment_content: "",
  })

  // ★APIからマスター利用者リストを取得する関数
  const fetchMasterUsers = async (): Promise<MasterUser[]> => {
    // 環境変数からAPIの情報を取得（NEXT_PUBLIC_プレフィックスが必要）
    const apiUrl = process.env.NEXT_PUBLIC_MASTER_DB_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_MASTER_DB_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("マスターDBのAPI設定が環境変数にありません。");
    }

    const response = await fetch(`${apiUrl}/api/v1/users`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`APIからのデータ取得に失敗しました: ${response.statusText}`);
    }
    return response.json();
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        setLoading(true)

        // ★Promise.allでマスター利用者リストも一緒に取得
        const [staffData, masterUsersData, activityTypesData] = await Promise.all([
          supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
          fetchMasterUsers(), // ★APIを呼び出す
          supabase.from("activity_types").select("id, name, color").eq("is_active", true).order("name"),
        ])

        if (staffData.error) throw staffData.error
        if (activityTypesData.error) throw activityTypesData.error
        
        if (staffData.data) setStaff(staffData.data)
        setMasterUsers(masterUsersData) // ★Stateにセット
        if (activityTypesData.data) setActivityTypes(activityTypesData.data)

      } catch (error: any) {
        console.error("データの取得に失敗しました:", error)
        setError(error.message || "データの取得に失敗しました。設定を確認してください。")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.master_user_uid || !formData.staff_id || !formData.activity_type_id) {
        alert("担当スタッフ、利用者、活動種別は必須です。");
        return;
    }

    setSaving(true)

    try {
      // daily-logのusersテーブルに、マスターの情報を同期・保存する
      const { data: userInLog, error: upsertError } = await supabase
        .from('users')
        .upsert({
            master_uid: formData.master_user_uid,
            name: masterUsers.find(u => u.uid === formData.master_user_uid)?.name || '不明な利用者'
        }, { onConflict: 'master_uid' }) // master_uidが同じなら更新、なければ挿入
        .select()
        .single();
      
      if (upsertError) throw upsertError;
      if (!userInLog) throw new Error("利用者情報の同期に失敗しました。");

      // 活動記録を保存。user_idにはdaily-log内のusersテーブルのIDを使う
      const { error: recordError } = await supabase.from("activity_records").insert([
        {
          user_id: userInLog.id, // ★ここが重要！
          staff_id: formData.staff_id,
          activity_type_id: formData.activity_type_id,
          activity_date: formData.activity_date,
          content: formData.content,
          has_next_appointment: formData.has_next_appointment,
          next_appointment_date: formData.has_next_appointment ? formData.next_appointment_date : null,
          next_appointment_content: formData.has_next_appointment ? formData.next_appointment_content : null,
        },
      ])

      if (recordError) throw recordError

      alert("活動記録を保存しました")
      router.push("/")
    } catch (error) {
      console.error("保存に失敗しました:", error)
      alert("保存に失敗しました。もう一度お試しください。")
    } finally {
      setSaving(false)
    }
  }

  const [popoverOpen, setPopoverOpen] = useState(false)

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
                    required
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
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        {formData.master_user_uid
                          ? masterUsers.find((user) => user.uid === formData.master_user_uid)?.name
                          : "利用者を選択してください"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="利用者を検索..." />
                        <CommandList>
                          <CommandEmpty>該当する利用者がいません。</CommandEmpty>
                          <CommandGroup>
                            {masterUsers.map((user) => (
                              <CommandItem
                                key={user.uid}
                                value={user.name}
                                onSelect={() => {
                                  setFormData({ ...formData, master_user_uid: user.uid })
                                  setPopoverOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.master_user_uid === user.uid ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_type_id">活動種別 *</Label>
                  <Select
                    value={formData.activity_type_id}
                    onValueChange={(value) => setFormData({ ...formData, activity_type_id: value })}
                    required
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