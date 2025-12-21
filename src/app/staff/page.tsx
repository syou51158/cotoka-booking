import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { StaffPortalView } from './staff-portal-view'
import { getStaffByUserId, getAllStaff } from '@/server/staff'

export default async function StaffPortalPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const staff = await getStaffByUserId(user.id)

  let allStaff: any[] = [];
  // If staff is admin, fetch all staff for the terminal mode selector
  if (staff?.role === 'admin') {
    allStaff = await getAllStaff();
  }

  return (
    <StaffPortalView
      user={user}
      staffProfile={staff}
      allStaff={allStaff}
    />
  )
}
