'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type TeamActionState = { fehler?: string; erfolg?: string } | null

export async function inviteUser(
  prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const email = (formData.get('email') as string)?.trim()
  const rolle = (formData.get('rolle') as string) || 'Mitarbeiter'

  if (!email) return { fehler: 'E-Mail darf nicht leer sein.' }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { rolle },
  })

  if (error) return { fehler: error.message }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: `Einladung an ${email} gesendet.` }
}

export async function updateUserRolle(userId: string, rolle: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { rolle },
  })
  revalidatePath('/dashboard/einstellungen')
}

export async function deactivateUser(userId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.auth.admin.updateUserById(userId, { ban_duration: '87600h' })
  revalidatePath('/dashboard/einstellungen')
}

export async function reactivateUser(userId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  revalidatePath('/dashboard/einstellungen')
}
