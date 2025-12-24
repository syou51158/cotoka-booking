'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateStaff } from '../actions'
import { toast } from '@/lib/toast'

export default function EditStaffPage({ staff }: { staff: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const res = await updateStaff(formData)

    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('スタッフ情報を更新しました')
      router.push('/admin/staff')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/staff">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">スタッフ編集</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>スタッフ情報</CardTitle>
          <CardDescription>
            スタッフの詳細情報と権限を編集します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="id" value={staff.id} />
            <input type="hidden" name="userId" value={staff.user_id || ''} />

            <div className="grid gap-2">
              <Label htmlFor="name">表示名</Label>
              <Input id="name" name="name" required defaultValue={staff.display_name} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" name="email" type="email" required defaultValue={staff.email || ''} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">新しいパスワード (任意)</Label>
              <Input id="password" name="password" type="password" minLength={6} placeholder="変更しない場合は空欄" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role">システム権限</Label>
                <Select name="role" defaultValue={staff.profile_role || 'staff'}>
                  <SelectTrigger>
                    <SelectValue placeholder="権限を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">スタッフ (一般)</SelectItem>
                    <SelectItem value="manager">マネージャー (承認権限)</SelectItem>
                    <SelectItem value="owner">オーナー (全権限)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">管理画面での操作権限です。</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app_role">雇用形態</Label>
                <Select name="app_role" defaultValue={staff.role || 'employee'}>
                  <SelectTrigger>
                    <SelectValue placeholder="形態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">正社員</SelectItem>
                    <SelectItem value="contractor">業務委託</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">給与計算や人事管理用です。</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                アカウントを更新
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
