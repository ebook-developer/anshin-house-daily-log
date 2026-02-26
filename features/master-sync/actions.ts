// src/features/master-sync/actions.ts
"use server"

import { z } from "zod"

const MasterUserSchema = z.object({
  uid: z.string(),
  name: z.string(),
})

export type MasterUser = z.infer<typeof MasterUserSchema>

export async function getMasterUsersAction(): Promise<MasterUser[]> {
  const apiUrl = process.env.MASTER_DB_API_URL
  const apiKey = process.env.MASTER_DB_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error("Server configuration error: Master DB settings missing.")
  }

  const targetUrl = `${apiUrl}/api/v1/users`

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    })

    // 【デバッグ強化】レスポンスが JSON でない場合の詳細ログ
    const contentType = response.headers.get("content-type")
    
    if (!response.ok || !contentType?.includes("application/json")) {
      const errorBody = await response.text()
      console.error("--- Master DB Error Detail ---")
      console.error(`URL: ${targetUrl}`)
      console.error(`Status: ${response.status}`)
      console.error(`Content-Type: ${contentType}`)
      console.error(`Body (Snippet): ${errorBody.substring(0, 200)}`) // 最初の200文字を表示
      console.error("-------------------------------")
      
      if (response.status === 404) throw new Error("外部APIのパスが見つかりません。")
      if (errorBody.includes("<!DOCTYPE")) throw new Error("外部APIがHTML(恐らくログイン画面)を返しました。認証設定を確認してください。")
      throw new Error(`Master DB 連携エラー (${response.status})`)
    }

    const data = await response.json()
    return z.array(MasterUserSchema).parse(data)
  } catch (error) {
    console.error("Master Sync Failure:", error)
    throw error
  }
}