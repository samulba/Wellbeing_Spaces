'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { onboardingDateiSignierteUrl, getAnfrageDateien } from '@/app/actions/onboarding-uploads'
import type {
  OnboardingFrage,
  OnboardingSektion,
  OnboardingVorlage,
  OnboardingDatei,
  OnboardingLinkEintrag,
} from '@/lib/supabase/types'

interface Props {
  anfrageId: string
  vorlage:   OnboardingVorlage | null | undefined
  antworten: Record<string, unknown> | null | undefined
}

export default function DynamischeAntwortenAnzeige({ anfrageId, vorlage, antworten }: Props) {
  const [dateien, setDateien] = useState<OnboardingDatei[]>([])

  useEffect(() => {
    let aktiv = true
    void getAnfrageDateien(anfrageId).then((d) => { if (aktiv) setDateien(d) })
    return () => { aktiv = false }
  }, [anfrageId])

  if (!antworten || Object.keys(antworten).length === 0) {
    // Wenn keine Antworten da sind aber Dateien hochgeladen wurden,
    // trotzdem die Dateien zeigen.
    if (dateien.length === 0) return null
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Hochgeladene Dateien
        </p>
        <ul className="space-y-1">
          {dateien.map((d) => <li key={d.id}><DateiLink datei={d} /></li>)}
        </ul>
      </div>
    )
  }

  // Fallback: keine Vorlage verfuegbar (z.B. Standard-Form oder geloeschte Vorlage)
  // — zeige Antworten als rohe Key/Value-Paare an, damit der Admin nichts uebersieht.
  if (!vorlage) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Eingereichte Antworten
        </p>
        <dl className="space-y-2.5">
          {Object.entries(antworten).map(([key, wert]) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-1.5 sm:gap-3">
              <dt className="text-[11px] text-gray-400 leading-relaxed font-mono">{key}</dt>
              <dd className="text-sm text-gray-700">
                <RawWert wert={wert} />
              </dd>
            </div>
          ))}
        </dl>
        {dateien.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 mb-2">Hochgeladene Dateien</p>
            <ul className="space-y-1">
              {dateien.map((d) => <li key={d.id}><DateiLink datei={d} /></li>)}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const fragen   = vorlage.fragen ?? []
  const sektionen = vorlage.sektionen ?? []

  // Gruppiere Fragen nach Sektion (mit Fallback fuer ungesektionierte)
  const gruppen: Array<{ sektion: OnboardingSektion | null; fragen: OnboardingFrage[] }> = []
  const unsortiert = fragen.filter((f) => !f.sektion_id)
  if (unsortiert.length > 0) gruppen.push({ sektion: null, fragen: unsortiert })
  for (const s of sektionen) {
    const fragenS = fragen.filter((f) => f.sektion_id === s.id)
    if (fragenS.length > 0) gruppen.push({ sektion: s, fragen: fragenS })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Eingereichte Antworten
      </p>
      <div className="space-y-5">
        {gruppen.map((grp, gi) => (
          <div key={grp.sektion?.id ?? `_unsorted-${gi}`}>
            {grp.sektion && (
              <p className="text-xs font-medium text-gray-700 mb-2">{grp.sektion.name}</p>
            )}
            <dl className="space-y-2.5">
              {grp.fragen.map((f) => {
                const wert = antworten[f.id]
                return (
                  <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-1.5 sm:gap-3">
                    <dt className="text-[11px] text-gray-400 leading-relaxed">{f.titel}</dt>
                    <dd className="text-sm text-gray-700">
                      <AntwortWert frage={f} wert={wert} dateien={dateien.filter((d) => d.frage_id === f.id)} />
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

function AntwortWert({
  frage,
  wert,
  dateien,
}: {
  frage: OnboardingFrage
  wert: unknown
  dateien: OnboardingDatei[]
}) {
  // Leer-Werte sichtbar machen
  const leer = wert == null || wert === '' || (Array.isArray(wert) && wert.length === 0)
  if (leer && frage.typ !== 'upload') return <span className="text-gray-300">—</span>

  if (frage.typ === 'upload') {
    if (dateien.length === 0) return <span className="text-gray-300">—</span>
    return (
      <ul className="space-y-1">
        {dateien.map((d) => (
          <li key={d.id}>
            <DateiLink datei={d} />
          </li>
        ))}
      </ul>
    )
  }

  if (frage.typ === 'link_liste') {
    const liste = wert as OnboardingLinkEintrag[]
    return (
      <ul className="space-y-1">
        {liste.map((l, i) => (
          <li key={`${i}-${l.url}`}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-wellbeing-green hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {l.titel || l.url}
            </a>
          </li>
        ))}
      </ul>
    )
  }

  if (frage.typ === 'url' && typeof wert === 'string') {
    return (
      <a
        href={wert.startsWith('http') ? wert : `https://${wert}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-wellbeing-green hover:underline inline-flex items-center gap-1"
      >
        <ExternalLink className="w-3 h-3" /> {wert}
      </a>
    )
  }

  if (frage.typ === 'budget_verteilung' && wert && typeof wert === 'object') {
    const obj = wert as Record<string, number>
    return (
      <ul className="space-y-0.5">
        {Object.entries(obj).map(([k, v]) => (
          <li key={k} className="flex justify-between gap-2">
            <span>{k}</span>
            <span className="font-medium">{v}%</span>
          </li>
        ))}
      </ul>
    )
  }

  if (frage.typ === 'datum_rechner' && wert && typeof wert === 'object') {
    const v = wert as { startdatum?: string; tage?: number }
    return <span>{v.startdatum} + {v.tage} Tage</span>
  }

  if (Array.isArray(wert)) {
    return (
      <div className="flex flex-wrap gap-1">
        {wert.map((v, i) => (
          <span key={`${i}-${String(v)}`} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {String(v)}
          </span>
        ))}
      </div>
    )
  }

  if (typeof wert === 'string' && wert.length > 100) {
    return <p className="whitespace-pre-wrap leading-relaxed">{wert}</p>
  }

  return <span>{String(wert)}</span>
}

/** Render-Helper fuer rohe Antwort-Werte ohne Frage-Definition. */
function RawWert({ wert }: { wert: unknown }) {
  if (wert == null || wert === '') return <span className="text-gray-300">—</span>
  if (Array.isArray(wert)) {
    if (wert.length === 0) return <span className="text-gray-300">—</span>
    // Pruefen ob es link_liste-aehnliche Eintraege sind
    if (wert.every((v) => v && typeof v === 'object' && 'url' in v)) {
      return (
        <ul className="space-y-1">
          {(wert as Array<{ titel?: string; url: string }>).map((l, i) => (
            <li key={`${i}-${l.url}`}>
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                className="text-wellbeing-green hover:underline inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />{l.titel || l.url}
              </a>
            </li>
          ))}
        </ul>
      )
    }
    return (
      <div className="flex flex-wrap gap-1">
        {wert.map((v, i) => (
          <span key={`${i}-${String(v)}`} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {String(v)}
          </span>
        ))}
      </div>
    )
  }
  if (typeof wert === 'object') {
    return <pre className="text-[11px] bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-wrap">{JSON.stringify(wert, null, 2)}</pre>
  }
  if (typeof wert === 'string' && wert.length > 100) {
    return <p className="whitespace-pre-wrap leading-relaxed">{wert}</p>
  }
  return <span>{String(wert)}</span>
}

function DateiLink({ datei }: { datei: OnboardingDatei }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function oeffnen() {
    if (url) return window.open(url, '_blank', 'noopener,noreferrer')
    setLoading(true)
    const res = await onboardingDateiSignierteUrl(datei.id)
    setLoading(false)
    if (res.url) {
      setUrl(res.url)
      window.open(res.url, '_blank', 'noopener,noreferrer')
    }
  }

  const istBild = datei.dateityp.startsWith('image/')

  return (
    <button
      type="button"
      onClick={oeffnen}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-wellbeing-green hover:underline disabled:opacity-50"
    >
      {istBild ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      <span>{datei.dateiname}</span>
      <Download className="w-3 h-3 text-gray-400" />
    </button>
  )
}
