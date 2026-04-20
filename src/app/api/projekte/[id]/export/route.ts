import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { effektiverVpNetto } from '@/lib/preise'
import { NextResponse } from 'next/server'

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

/**
 * Excel-HYPERLINK-Formel. Wird in LibreOffice/Excel als klickbarer Link
 * angezeigt (bei Excel ggf. "Bearbeitung aktivieren" nötig).
 */
function csvHyperlink(url: string | null | undefined, label = 'Öffnen'): string {
  if (!url) return ''
  const safeUrl = url.replace(/"/g, '""')
  return `"=HYPERLINK(""${safeUrl}"",""${label}"")"`
}

type RaumProduktRow = {
  raum_id: string
  menge: number
  reihenfolge: number | null
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  produkte: {
    id: string
    name: string
    kategorie: string | null
    einheit: string
    einkaufspreis: number | null
    marge_prozent: number | null
    verkaufspreis: number | null
    produkt_url: string | null
    deleted_at: string | null
    hinweis_extern: string | null
    hinweis_extern_sichtbar: boolean
    partner: { name: string } | { name: string }[] | null
    produktstatus: { status: string } | { status: string }[] | null
  } | null
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [supabase, MWST] = await Promise.all([createClient(), getMwstSatz()])

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const orgId = await getOrganisationId()

  const { data: projekt } = await supabase
    .from('projekte')
    .select('name')
    .eq('id', params.id)
    .eq('organisation_id', orgId)
    .single()

  if (!projekt) return new NextResponse('Nicht gefunden', { status: 404 })

  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name, reihenfolge')
    .eq('projekt_id', params.id)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  const raumMap: Record<string, { name: string; reihenfolge: number }> = {}
  for (const r of raeume ?? []) raumMap[r.id] = { name: r.name, reihenfolge: r.reihenfolge ?? 0 }
  const raumIds = (raeume ?? []).map((r) => r.id)

  const { data: rpsRaw } = raumIds.length
    ? await supabase
        .from('raum_produkte')
        .select(`
          raum_id, menge, reihenfolge, verkaufspreis_override, rabatt_prozent,
          produkte(
            id, name, kategorie, einheit,
            einkaufspreis, marge_prozent, verkaufspreis,
            produkt_url, deleted_at,
            hinweis_extern, hinweis_extern_sichtbar,
            partner(name),
            produktstatus(status)
          )
        `)
        .in('raum_id', raumIds)
        .order('reihenfolge')
    : { data: [] as RaumProduktRow[] }

  const rps = ((rpsRaw ?? []) as unknown as RaumProduktRow[]).filter(
    (rp) => rp.produkte && rp.produkte.deleted_at == null,
  )

  // Sortiert nach Raum-Reihenfolge, dann nach Raum-Produkt-Reihenfolge
  rps.sort((a, b) => {
    const rA = raumMap[a.raum_id]?.reihenfolge ?? 0
    const rB = raumMap[b.raum_id]?.reihenfolge ?? 0
    if (rA !== rB) return rA - rB
    return (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0)
  })

  const header = [
    'Produktname', 'Raum', 'Kategorie', 'Partner',
    'Menge', 'Einheit',
    'EP netto (€)',
    'Marge (%)',
    'Basis-VP netto (€)',
    'Rabatt (%)',
    'VP netto (€)', 'VP brutto (€)',
    'Gesamtpreis netto (€)', 'Gesamtpreis brutto (€)',
    'Status', 'Hinweis',
    'Produkt-Link',
  ].join(';')

  const rows = rps.map((rp) => {
    const p = rp.produkte!
    const ep = p.einkaufspreis ?? null
    const basisVp = rp.verkaufspreis_override ?? p.verkaufspreis ?? 0
    const vp = effektiverVpNetto(
      { verkaufspreis_override: rp.verkaufspreis_override, rabatt_prozent: rp.rabatt_prozent },
      p.verkaufspreis,
    )
    const vpBrutto     = r2(vp * (1 + MWST))
    const gesamtNetto  = r2(vp * rp.menge)
    const gesamtBrutto = r2(gesamtNetto * (1 + MWST))
    const statusObj    = Array.isArray(p.produktstatus) ? p.produktstatus[0] : p.produktstatus
    const status       = statusObj?.status ?? 'ausstehend'
    const partnerName  = p.partner ? (Array.isArray(p.partner) ? p.partner[0]?.name : p.partner.name) : null
    const hinweis      = p.hinweis_extern

    return [
      csvCell(p.name),
      csvCell(raumMap[rp.raum_id]?.name ?? ''),
      csvCell(p.kategorie),
      csvCell(partnerName),
      rp.menge,
      csvCell(p.einheit),
      csvNum(ep),
      p.marge_prozent != null ? String(p.marge_prozent).replace('.', ',') : '',
      csvNum(basisVp),
      rp.rabatt_prozent != null ? String(rp.rabatt_prozent).replace('.', ',') : '',
      csvNum(vp),
      csvNum(vpBrutto),
      csvNum(gesamtNetto),
      csvNum(gesamtBrutto),
      csvCell(STATUSLABEL[status] ?? status),
      csvCell(hinweis),
      csvHyperlink(p.produkt_url),
    ].join(';')
  })

  const csv = '\uFEFF' + [header, ...rows].join('\r\n')

  const heute     = new Date().toISOString().slice(0, 10)
  const safeName  = projekt.name.replace(/[^\w\s\-äöüÄÖÜß]/g, '_')
  const filename  = encodeURIComponent(`${safeName}-${heute}.csv`)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
