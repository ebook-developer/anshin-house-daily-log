"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Users, UserCheck, Tag } from "lucide-react"
import Link from "next/link"

interface Staff {
  id: string
  name: string
  email: string | null
  is_active: boolean
}

interface User {
  id: string
  name: string
  phone: string | null
  address: string | null
  assigned_staff_id: string | null
  assigned_staff_name: string | null
  is_active: boolean
}

interface ActivityType {
  id: string
  name: string
  color: string
  is_active: boolean
}

export default function SettingsPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)

  // フォーム状態
  const [newStaff, setNewStaff] = useState({ name: "", email: "" })
  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    address: "",
    assigned_staff_id: "none",
  })
  const [newActivityType, setNewActivityType] = useState({ name: "", color: "#3B82F6" })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [staffData, usersData, activityTypesData] = await Promise.all([
        supabase.from("staff").select("*").order("name"),
        supabase
          .from("users")
          .select(`
          *,
          staff:assigned_staff_id (name)
        `)
          .order("name"),
        supabase.from("activity_types").select("*").order("name"),
      ])

      if (staffData.data) setStaff(staffData.data)
      if (usersData.data) {
        const formattedUsers = usersData.data.map((user) => ({
          ...user,
          assigned_staff_name: user.staff?.name || null,
        }))
        setUsers(formattedUsers)
      }
      if (activityTypesData.data) setActivityTypes(activityTypesData.data)
    } catch (error) {
      console.error("データの取得に失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }

  const addStaff = async () => {
    if (!newStaff.name.trim()) return

    try {
      const { error } = await supabase.from("staff").insert([newStaff])

      if (error) throw error

      setNewStaff({ name: "", email: "" })
      fetchData()
      alert("スタッフを追加しました")
    } catch (error) {
      console.error("スタッフの追加に失敗しました:", error)
      alert("スタッフの追加に失敗しました")
    }
  }

  const addUser = async () => {
    if (!newUser.name.trim()) return

    try {
      const { error } = await supabase.from("users").insert([
        {
          ...newUser,
          assigned_staff_id: newUser.assigned_staff_id === "none" ? null : newUser.assigned_staff_id,
        },
      ])

      if (error) throw error

      setNewUser({ name: "", phone: "", address: "", assigned_staff_id: "none" })
      fetchData()
      alert("利用者を追加しました")
    } catch (error) {
      console.error("利用者の追加に失敗しました:", error)
      alert("利用者の追加に失敗しました")
    }
  }

  const addActivityType = async () => {
    if (!newActivityType.name.trim()) return

    try {
      const { error } = await supabase.from("activity_types").insert([newActivityType])

      if (error) throw error

      setNewActivityType({ name: "", color: "#3B82F6" })
      fetchData()
      alert("活動種別を追加しました")
    } catch (error) {
      console.error("活動種別の追加に失敗しました:", error)
      alert("活動種別の追加に失敗しました")
    }
  }

  const toggleStaffStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("staff").update({ is_active: !currentStatus }).eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("ステータスの更新に失敗しました:", error)
    }
  }

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ is_active: !currentStatus }).eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("ステータスの更新に失敗しました:", error)
    }
  }

  const toggleActivityTypeStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("activity_types").update({ is_active: !currentStatus }).eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("ステータスの更新に失敗しました:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">設定を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-4">システム設定</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="staff" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="staff" className="flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              スタッフ管理
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              利用者管理
            </TabsTrigger>
            <TabsTrigger value="activity-types" className="flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              活動種別管理
            </TabsTrigger>
          </TabsList>

          {/* スタッフ管理 */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>新しいスタッフの追加</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="staff-name">氏名 *</Label>
                    <Input
                      id="staff-name"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="田中 太郎"
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff-email">メールアドレス</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="tanaka@example.com"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addStaff} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      追加
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>スタッフ一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{s.name}</h3>
                        {s.email && <p className="text-sm text-gray-600">{s.email}</p>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {s.is_active ? "有効" : "無効"}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => toggleStaffStatus(s.id, s.is_active)}>
                          {s.is_active ? "無効化" : "有効化"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 利用者管理 */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>新しい利用者の追加</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="user-name">氏名 *</Label>
                    <Input
                      id="user-name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="山田 一郎"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-phone">電話番号</Label>
                    <Input
                      id="user-phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="090-1234-5678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-address">住所</Label>
                    <Input
                      id="user-address"
                      value={newUser.address}
                      onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                      placeholder="東京都渋谷区1-1-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-staff">担当スタッフ</Label>
                    <Select
                      value={newUser.assigned_staff_id}
                      onValueChange={(value) => setNewUser({ ...newUser, assigned_staff_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="担当スタッフを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未割当</SelectItem>
                        {staff
                          .filter((s) => s.is_active)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={addUser} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      利用者を追加
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>利用者一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{u.name}</h3>
                        <div className="text-sm text-gray-600">
                          {u.phone && <span>{u.phone}</span>}
                          {u.phone && u.assigned_staff_name && <span className="mx-2">•</span>}
                          {u.assigned_staff_name && <span>担当: {u.assigned_staff_name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            u.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {u.is_active ? "有効" : "無効"}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => toggleUserStatus(u.id, u.is_active)}>
                          {u.is_active ? "無効化" : "有効化"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 活動種別管理 */}
          <TabsContent value="activity-types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>新しい活動種別の追加</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="activity-type-name">活動種別名 *</Label>
                    <Input
                      id="activity-type-name"
                      value={newActivityType.name}
                      onChange={(e) => setNewActivityType({ ...newActivityType, name: e.target.value })}
                      placeholder="定期訪問"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-type-color">表示色</Label>
                    <Input
                      id="activity-type-color"
                      type="color"
                      value={newActivityType.color}
                      onChange={(e) => setNewActivityType({ ...newActivityType, color: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addActivityType} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      追加
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>活動種別一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityTypes.map((at) => (
                    <div key={at.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: at.color }}></div>
                        <h3 className="font-medium">{at.name}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            at.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {at.is_active ? "有効" : "無効"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActivityTypeStatus(at.id, at.is_active)}
                        >
                          {at.is_active ? "無効化" : "有効化"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
