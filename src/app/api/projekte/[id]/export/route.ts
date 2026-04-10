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
        .select('*, produktstatus(status)')
        .in('raum_id', raumIds)
        .is('deleted_at', null)
        .order('raum_id')
        .order('reihenfolge')
    : { data: [] }

  const header = [
    'Produktname', 'Raum', 'Kategorie', 'Menge', 'Einheit',
    'VP netto (€)', 'VP brutto (€)', 'Gesamtpreis netto (€)', 'Status',
  ].join(';')

  const rows = (produkte ?? []).map((p) => {
    const vp = p.verkaufspreis ?? 0
    const vpBrutto = r2(vp * (1 + MWST))
    const gesamtNetto = r2(vp * p.menge)
    // produktstatus may be array or object depending on Supabase join
    const statusObj = Array.isArray(p.produktstatus) ? p.produktstatus[0] : p.produktstatus
    const status = statusObj?.status ?? 'ausstehend'
    return [
      csvCell(p.name),
      csvCell(raumMap[p.raum_id]),
      csvCell(p.kategorie),
      p.menge,
      csvCell(p.einheit),
      vp.toFixed(2).replace('.', ','),
      vpBrutto.toFixed(2).replace('.', ','),
      gesamtNetto.toFixed(2).replace('.', ','),
      csvCell(STATUSLABEL[status] ?? status),
    ].join(';')
  })

  const csv = '\uFEFF' + [header, ...rows].join('\r\n')
  const safeName = projekt.name.replace(/[^\w\s\-äöüÄÖÜß]/g, '_')
  const filename = encodeURIComponent(`${safeName}_Produktliste.csv`)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
