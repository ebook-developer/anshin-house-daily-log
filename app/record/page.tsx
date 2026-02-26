"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, AlertTriangle, Check, ChevronsUpDown, ArrowLeft, ClipboardCheck, ClipboardPlus, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// 【BFF移行】サーバーサイド経由でマスターデータを取得するActionをインポート
import { getMasterUsersAction, type MasterUser } from "@/features/master-sync/actions"

// 型定義の整理
interface Staff { id: string; name: string; }
interface ActivityType { id: string; name: string; }
type FormMode = "record" | "task";

export default function RecordPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // 状態管理
  const [staff, setStaff] = useState<Staff[]>([])
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>("record")
  const [popoverOpen, setPopoverOpen] = useState(false)

  // フォームデータ
  const [formData, setFormData] = useState({
    activity_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    task_time: "",
    staff_id: "",
    master_user_uid: "",
    activity_type_id: "",
    content: "",
  })

  // 初期データの取得
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 【プロの設計】
        // ブラウザから直接外部API(fetch)を叩かず、Server Action経由で取得することで
        // APIキーの漏洩を100%防止し、実行時型バリデーションを適用します。
        const [staffRes, masterUsersData, activityTypesRes] = await Promise.all([
          supabase.from("staff").select("id, name").eq("is_active", true).order("name"),
          getMasterUsersAction(),
          supabase.from("activity_types").select("id, name, is_active").order("name"),
        ])

        if (staffRes.error) throw staffRes.error
        if (activityTypesRes.error) throw activityTypesRes.error
        
        if (staffRes.data) setStaff(staffRes.data)
        setMasterUsers(masterUsersData)
        if (activityTypesRes.data) setActivityTypes(activityTypesRes.data as ActivityType[])
        
      } catch (err: unknown) {
        console.error("データ取得エラー:", err)
        setError(err instanceof Error ? err.message : "データの取得に失敗しました。")
      } finally {
        setLoading(false)
      }
    }
    fetchPrerequisites()
  }, [supabase])

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (formMode === "record" && (!formData.master_user_uid || !formData.staff_id || !formData.activity_type_id)) {
      alert("担当スタッフ、利用者、活動種別は必須です。")
      return
    }
    if (formMode === "task" && (!formData.master_user_uid || !formData.activity_type_id)) {
      alert("利用者と活動種別は必須です。")
      return
    }

    setSaving(true)
    try {
      // 1. 利用者情報の同期（キャッシュ）
      const selectedMasterUser = masterUsers.find(u => u.uid === formData.master_user_uid)
      const { data: userInLog, error: upsertError } = await supabase
        .from('users')
        .upsert({ 
          master_uid: formData.master_user_uid, 
          name: selectedMasterUser?.name || '不明な利用者' 
        }, { onConflict: 'master_uid' })
        .select()
        .single()

      if (upsertError) throw upsertError
      if (!userInLog) throw new Error("利用者情報の同期に失敗しました。")
      
      // 2. 活動記録またはタスクの挿入
      const { error: recordError } = await supabase.from("activity_records").insert([{
        user_id: userInLog.id,
        staff_id: formData.staff_id || null, 
        activity_type_id: formData.activity_type_id,
        activity_date: formData.activity_date,
        start_time: formMode === "record" ? (formData.start_time || null) : null,
        end_time: formMode === "record" ? (formData.end_time || null) : null,
        task_time: formMode === "task" ? (formData.task_time || null) : null,
        content: formData.content,
        is_completed: formMode === "record", 
      }])

      if (recordError) throw recordError

      alert(formMode === "record" ? "活動記録を保存しました" : "タスクを登録しました")
      router.push("/")
      router.refresh() // 画面を最新状態に更新
    } catch (err) {
      console.error("保存失敗:", err)
      alert("保存に失敗しました。もう一度お試しください。")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4 font-semibold">{error}</p>
          <Link href="/"><Button>ダッシュボードに戻る</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {formMode === 'record' ? '活動記録の追加' : '新規タスクの登録'}
        </h1>
        <Link href="/">
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />戻る</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">記録の種類を選択</Label>
            <ToggleGroup 
              type="single" 
              value={formMode} 
              onValueChange={(value: FormMode) => value && setFormMode(value)} 
              className="grid grid-cols-2 h-auto gap-4"
            >
              <ToggleGroupItem 
                value="record" 
                className="flex flex-col items-center justify-center h-24 text-sm gap-2 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700 data-[state=on]:border-blue-200 border"
              >
                <ClipboardCheck className="h-6 w-6"/>
                <span className="font-bold">活動の記録</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">実施済みの支援を記録</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="task" 
                className="flex flex-col items-center justify-center h-24 text-sm gap-2 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 data-[state=on]:border-amber-200 border"
              >
                <ClipboardPlus className="h-6 w-6"/>
                <span className="font-bold">タスクの登録</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">未来の予定を登録</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="activity_date">{formMode === 'record' ? '対応日 *' : '対応希望日 *'}</Label>
                <Input 
                  id="activity_date" 
                  type="date" 
                  value={formData.activity_date} 
                  onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })} 
                  required
                />
              </div>
              
              {formMode === 'record' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="start_time">開始時間</Label>
                    <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">終了時間</Label>
                    <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}/>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="task_time">希望時間</Label>
                  <Input id="task_time" type="time" value={formData.task_time} onChange={(e) => setFormData({ ...formData, task_time: e.target.value })}/>
                </div>
              )}
            </div>

            {formMode === 'record' && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">時間の入力について</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  時間は任意項目です。移動時間は含めず、実際の支援時間を入力してください。
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="staff_id">{formMode === 'record' ? '担当スタッフ *' : '担当スタッフ (後で割当可)'}</Label>
                <Select value={formData.staff_id} onValueChange={(value) => setFormData({ ...formData, staff_id: value })}>
                  <SelectTrigger id="staff_id">
                    <SelectValue placeholder="スタッフを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="master_user_uid">利用者 *</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      id="master_user_uid" 
                      variant="outline" 
                      role="combobox" 
                      className="w-full justify-between font-normal"
                    >
                      {formData.master_user_uid 
                        ? masterUsers.find((user) => user.uid === formData.master_user_uid)?.name 
                        : "利用者を選択..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="利用者を検索..." />
                      <CommandList>
                        <CommandEmpty>該当する利用者が見つかりません</CommandEmpty>
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
                              <Check className={cn("mr-2 h-4 w-4", formData.master_user_uid === user.uid ? "opacity-100" : "opacity-0")}/>
                              {user.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="activity_type_id">活動種別 *</Label>
                <Select value={formData.activity_type_id} onValueChange={(value) => setFormData({ ...formData, activity_type_id: value })}>
                  <SelectTrigger id="activity_type_id">
                    <SelectValue placeholder="活動種別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((at) => (<SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  活動種別は <Link href="/settings" className="underline hover:text-primary">設定ページ</Link> で管理できます。
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">{formMode === 'record' ? '活動内容' : 'タスクの詳細内容'}</Label>
              <Textarea 
                id="content" 
                placeholder={formMode === 'record' ? "具体的な支援内容や気づきを入力してください" : "依頼されたタスクの具体的な内容を入力してください"} 
                value={formData.content || ""} 
                onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
                rows={5}
              />
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <Link href="/">
                <Button type="button" variant="outline">キャンセル</Button>
              </Link>
              <Button type="submit" disabled={saving} className="min-w-[120px]">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}