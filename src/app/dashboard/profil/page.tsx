import { createClient } from '@/lib/supabase/server'
import ProfilFormular from '@/components/ProfilFormular'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const email = user?.email ?? ''
  const name = (user?.user_metadata?.full_name as string | undefined) ?? ''

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Profil</h1>

      <ProfilFormular email={email} name={name} />
    </div>
  )
}
