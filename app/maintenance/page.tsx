// app/maintenance/page.tsx
import { ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-yellow-100 rounded-full p-3 w-fit">
            <ShieldAlert className="h-8 w-8 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">システムメンテナンスのお知らせ</CardTitle>
          <CardDescription className="pt-2">
            現在、システム改修を実施しております。<br />
            ご不便をおかけいたしますが、作業完了まで今しばらくお待ちください。
          </CardDescription>
        </CardHeader>
        {/* <CardContent>
          <p className="text-sm text-muted-foreground">
            完了予定: 8月XX日 XX:XX頃
          </p>
        </CardContent> */}
      </Card>
    </div>
  )
}