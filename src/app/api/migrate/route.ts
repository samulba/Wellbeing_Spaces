import { migriereBestehendeDaten } from '@/app/actions/organisation'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const ergebnis = await migriereBestehendeDaten()
    if (!ergebnis.erfolg) {
      return NextResponse.json({ error: ergebnis.fehler }, { status: 400 })
    }
    return NextResponse.json({ success: true, orgId: ergebnis.orgId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
