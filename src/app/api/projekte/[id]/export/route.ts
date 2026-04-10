import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MWST = 0.19
const r2 = (n: number) => Math.round(n * 100) / 100

const STATUSLABEL: Record<string, string> = {
  ausstehend:     'Ausstehend',
  freigegeben:    'Freigegeben',
  abgelehnt:      'Abgelehnt',
  ueberarbeitung: 'Überarbeitung',
}

function csvCell(val: string | number | null | undefined): string {
  if (val == null) return ''
  const s = String(val)
  return s.includes(';') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function csvNum(val: number | null | undefined): string {
  if (val == null) return ''
  return val.toFixed(2).replace('.', ',')
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: projekt } = await supabase
    .from('projekte')
    .select('name')
    .eq('id', params.id)
    .single()

  if (!projekt) return new NextResponse('Nicht gefunden', { status: 404 })

  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name')
    .eq('projekt_id', params.id)
    .is('deleted_at', null)
    .order('reihenfolge')

  const raumMap: Record<string, string> = {}
  for (const r of raeume ?? []) raumMap[r.id] = r.name
  const raumIds = (raeume ?? []).map((r) => r.id)

  const { data: produkte } = raumIds.length
    ? await supabase
        .from('produkte')
        .select('*, partner(name), produktstatus(status)')
        .in('raum_id', raumIds)
        .is('deleted_at', null)
        .order('raum_id')
        .order('reihenfolge')
    : { data: [] }

  const header = [
    'Produktname', 'Raum', 'Kategorie', 'Partner',
    'Menge', 'Einheit',
    'EP netto (€)',
    'Marge (%)',
    'VP netto (€)', 'VP brutto (€)',
    'Gesamtpreis netto (€)', 'Gesamtpreis brutto (€)',
    'Status',
  ].join(';')

  const rows = (produkte ?? []).map((p) => {
    const ep  = p.einkaufspreis ?? null
    const vp  = p.verkaufspreis ?? 0
    const vpBrutto     = vp != null ? r2(vp * (1 + MWST)) : null
    const gesamtNetto  = r2(vp * p.menge)
    const gesamtBrutto = r2(gesamtNetto * (1 + MWST))
    const statusObj    = Array.isArray(p.produktstatus) ? p.produktstatus[0] : p.produktstatus
    const status       = statusObj?.status ?? 'ausstehend'
    const partnerName  = p.partner ? (Array.isArray(p.partner) ? p.partner[0]?.name : p.partner.name) : null

    return [
      csvCell(p.name),
      csvCell(raumMap[p.raum_id]),
      csvCell(p.kategorie),
      csvCell(partnerName),
      p.menge,
      csvCell(p.einheit),
      csvNum(ep),
      p.marge_prozent != null ? String(p.marge_prozent).replace('.', ',') : '',
      csvNum(vp),
      csvNum(vpBrutto),
      csvNum(gesamtNetto),
      csvNum(gesamtBrutto),
      csvCell(STATUSLABEL[status] ?? status),
    ].join(';')
  })

  const csv = '\uFEFF' + [header, ...rows].join('\r\n')

  const heute     = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const safeName  = projekt.name.replace(/[^\w\s\-äöüÄÖÜß]/g, '_')
  const filename  = encodeURIComponent(`${safeName}-${heute}.csv`)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
