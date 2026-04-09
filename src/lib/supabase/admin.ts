import { createClient } from '@supabase/supabase-js'

// Service-Role-Client: umgeht RLS vollständig.
// NUR für serverseitige Aktionen verwenden, die nach eigener Validierung handeln.
// NIEMALS im Browser oder in Client Components verwenden.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
