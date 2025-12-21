'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['staff', 'manager', 'owner']),
  app_role: z.enum(['employee', 'contractor', 'admin']),
})

const updateStaffSchema = z.object({
  id: z.string().uuid(), // staff id
  userId: z.string().uuid(), // auth user id
  name: z.string().min(1),
  role: z.enum(['staff', 'manager', 'owner']),
  app_role: z.enum(['employee', 'contractor', 'admin']),
  email: z.string().email(),
  password: z.string().optional(),
})


export async function createStaff(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin()
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    role: formData.get('role'), // profile role
    app_role: formData.get('app_role'), // staff app_role
  }

  const result = createStaffSchema.safeParse(rawData)
  if (!result.success) {
    return { error: 'Invalid input: ' + result.error.message }
  }

  const { email, password, name, role, app_role } = result.data

  // 1. Create Auth User
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (userError) {
    return { error: 'Failed to create user: ' + userError.message }
  }

  const userId = userData.user.id

  // 2. Create Profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      role: role as any, // 'staff' | 'manager' | 'owner'
      full_name: name,
    })

  if (profileError) {
    // Cleanup user if profile creation fails? 
    // Ideally yes, but for now let's just return error.
    return { error: 'Failed to create profile: ' + profileError.message }
  }

  // 3. Create Staff Record
  const { error: staffError } = await supabaseAdmin
    .from('staff')
    .insert({
      user_id: userId,
      display_name: name,
      email: email,
      role: app_role as any, // 'employee' | 'contractor' | 'admin'
    })

  if (staffError) {
    return { error: 'Failed to create staff record: ' + staffError.message }
  }

  revalidatePath('/admin/staff')
  return { success: true }
}

export async function updateStaff(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin()
  const rawData = {
    id: formData.get('id'),
    userId: formData.get('userId'),
    email: formData.get('email'),
    name: formData.get('name'),
    role: formData.get('role'),
    app_role: formData.get('app_role'),
    password: formData.get('password') || undefined,
  }

  const result = updateStaffSchema.safeParse(rawData)
  if (!result.success) {
    return { error: 'Invalid input: ' + result.error.message }
  }

  const { id, userId, email, name, role, app_role, password } = result.data

  // 1. Update Auth User (Email & Password)
  const authUpdates: any = { email, user_metadata: { full_name: name } }
  if (password && password.length >= 6) {
    authUpdates.password = password
  }

  const { error: userError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
  
  if (userError) {
    return { error: 'Failed to update user: ' + userError.message }
  }

  // 2. Update Profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: role as any,
      full_name: name,
    })
    .eq('id', userId)

  if (profileError) {
    return { error: 'Failed to update profile: ' + profileError.message }
  }

  // 3. Update Staff Record
  const { error: staffError } = await supabaseAdmin
    .from('staff')
    .update({
      display_name: name,
      email: email,
      role: app_role as any,
    })
    .eq('id', id)

  if (staffError) {
    return { error: 'Failed to update staff record: ' + staffError.message }
  }

  revalidatePath('/admin/staff')
  revalidatePath(`/admin/staff/${id}`)
  return { success: true }
}

export async function getStaffWithDetails(staffId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: staff, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()

  if (error || !staff) return null

  // Get Profile info via user_id
  let profile = null
  if (staff.user_id) {
    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', staff.user_id)
      .single()
    profile = p
  }

  return {
    ...staff,
    profile_role: profile?.role || 'staff'
  }
}
