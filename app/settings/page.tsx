"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, UserCheck, Tag, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface Staff { id: string; name: string; email: string | null; is_active: boolean | null; }
interface ActivityType { id: string; name: string; is_active: boolean | null; }

export default function SettingsPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<Staff[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newStaff, setNewStaff] = useState({ name: "", email: "" })
  const [newActivityType, setNewActivityType] = useState({ name: "" })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null)
        const [staffData, activityTypesData] = await Promise.all([
          supabase.from("staff").select("*").order("name"),
          supabase.from("activity_types").select("id, name, is_active").order("name"),
        ])
        if (staffData.error) throw staffData.error
        if (activityTypesData.error) throw activityTypesData.error
        if (staffData.data) setStaff(staffData.data)
        if (activityTypesData.data) setActivityTypes(activityTypesData.data)
      } catch (err: unknown) {
        console.error("データの取得に失敗しました:", err)
        setError(err instanceof Error ? err.message : "データの取得に失敗しました。")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [supabase])

  const addStaff = async () => {
    if (!newStaff.name.trim()) { alert("スタッフの氏名は必須です。"); return; }
    const staffDataToInsert = { name: newStaff.name.trim(), email: newStaff.email.trim() || null };
    try {
      const { data, error } = await supabase.from("staff").insert([staffDataToInsert]).select();
      if (error) throw error;
      setNewStaff({ name: "", email: "" });
      setStaff(prev => [...prev, ...data as Staff[]].sort((a, b) => a.name.localeCompare(b.name)));
      alert("スタッフを追加しました");
    } catch (err: unknown) {
      console.error("スタッフの追加に失敗しました:", err);
      const isDuplicateEmail = err && typeof err === 'object' && 'code' in err && err.code === "23505";
      alert(isDuplicateEmail ? "スタッフの追加に失敗しました。\n入力されたメールアドレスは既に使用されています。" : "スタッフの追加に失敗しました。");
    }
  };

  const addActivityType = async () => {
    if (!newActivityType.name.trim()) { alert("活動種別名は必須です。"); return; }
    try {
      const { data, error } = await supabase.from("activity_types").insert([{ name: newActivityType.name.trim() }]).select("id, name, is_active");
      if (error) throw error
      setNewActivityType({ name: "" })
      setActivityTypes(prev => [...prev, ...data as ActivityType[]].sort((a, b) => a.name.localeCompare(b.name)));
      alert("活動種別を追加しました")
    } catch (err) {
      console.error("活動種別の追加に失敗しました:", err);
      alert("活動種別の追加に失敗しました")
    }
  }

  const toggleStaffStatus = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase.from("staff").update({ is_active: !currentStatus }).eq("id", id)
      if (error) throw error
      setStaff(staff.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    } catch (err) {
      console.error("ステータスの更新に失敗しました:", err);
    }
  }

  const toggleActivityTypeStatus = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase.from("activity_types").update({ is_active: !currentStatus }).eq("id", id)
      if (error) throw error
      setActivityTypes(activityTypes.map(at => at.id === id ? { ...at, is_active: !currentStatus } : at));
    } catch (err) {
      console.error("ステータスの更新に失敗しました:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">設定を読み込んでいます...</p>
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
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>再試行</Button>
            <Link href="/"><Button variant="outline">ダッシュボードに戻る</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl sm:text-3xl font-bold">システム設定</h1></div>
      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff" className="flex items-center"><UserCheck className="h-4 w-4 mr-2" />スタッフ管理</TabsTrigger>
          <TabsTrigger value="activity-types" className="flex items-center"><Tag className="h-4 w-4 mr-2" />活動種別管理</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-xl sm:text-2xl">新しいスタッフの追加</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="staff-name">氏名 *</Label>
                  <Input id="staff-name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="田中 太郎"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-email">メールアドレス</Label>
                  <Input id="staff-email" type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="tanaka@example.com"/>
                </div>
                <Button onClick={addStaff} className="w-full"><Plus className="h-4 w-4 mr-2" />追加</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-xl sm:text-2xl">スタッフ一覧</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staff.map((s) => (
                  <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                    <div><h3 className="font-medium">{s.name}</h3>{s.email && <p className="text-sm text-gray-600">{s.email}</p>}</div>
                    <div className="flex items-center space-x-2"><span className={`px-2 py-1 text-xs rounded-full ${s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{s.is_active ? "有効" : "無効"}</span><Button variant="outline" size="sm" onClick={() => toggleStaffStatus(s.id, s.is_active)}>{s.is_active ? "無効化" : "有効化"}</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity-types" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-xl sm:text-2xl">新しい活動種別の追加</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="activity-type-name">活動種別名 *</Label>
                  <Input id="activity-type-name" value={newActivityType.name} onChange={(e) => setNewActivityType({ ...newActivityType, name: e.target.value })} placeholder="定期訪問"/>
                </div>
                <Button onClick={addActivityType} className="w-full"><Plus className="h-4 w-4 mr-2" />追加</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-xl sm:text-2xl">活動種別一覧</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityTypes.map((at) => (
                  <div key={at.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                    <h3 className="font-medium">{at.name}</h3>
                    <div className="flex items-center space-x-2"><span className={`px-2 py-1 text-xs rounded-full ${at.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{at.is_active ? "有効" : "無効"}</span><Button variant="outline" size="sm" onClick={() => toggleActivityTypeStatus(at.id, at.is_active)}>{at.is_active ? "無効化" : "有効化"}</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}