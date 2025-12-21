'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check role to decide redirection
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
      return { error: 'Authentication failed' }
  }

  const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

  const role = profile?.role || 'staff'

  revalidatePath('/', 'layout')

  if (role === 'owner' || role === 'manager') {
      redirect('/admin')
  } else {
      redirect('/staff')
  }
}

export async function logout() {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
