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
      toast.success('Staff updated successfully')
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
        <h1 className="text-3xl font-bold tracking-tight">Edit Staff</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Staff Information</CardTitle>
          <CardDescription>
            Edit staff details and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="id" value={staff.id} />
            <input type="hidden" name="userId" value={staff.user_id || ''} />
            
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={staff.display_name} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required defaultValue={staff.email || ''} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">New Password (Optional)</Label>
              <Input id="password" name="password" type="password" minLength={6} placeholder="Leave blank to keep current" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="role">System Role</Label>
                    <Select name="role" defaultValue={staff.profile_role || 'staff'}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="staff">Staff (Limited)</SelectItem>
                            <SelectItem value="manager">Manager (Approval)</SelectItem>
                            <SelectItem value="owner">Owner (Full)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Permissions in the system.</p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="app_role">Employment Type</Label>
                    <Select name="app_role" defaultValue={staff.role || 'employee'}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="employee">Employee (正社員)</SelectItem>
                            <SelectItem value="contractor">Contractor (業務委託)</SelectItem>
                            <SelectItem value="admin">Admin (管理)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">For payroll/HR records.</p>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Account
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
