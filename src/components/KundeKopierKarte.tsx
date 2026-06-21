'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// ── Clipboard-Helfer (mit Fallback für ältere/unsichere Kontexte) ──
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* Fallback unten */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const run = (text: string) => {
    void copyText(text).then((ok) => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1300)
    })
  }
  return [copied, run]
}

// ── Einzelner Copy-Button (Icon) ──────────────────────────────
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, run] = useCopied()
  return (
    <button
      type="button"
      onClick={() => run(value)}
      aria-label={`${label} kopieren`}
      title={copied ? 'Kopiert' : `${label} kopieren`}
      className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-gray-200 text-gray-400 hover:text-wellbeing-green hover:border-wellbeing-green/40 hover:bg-wellbeing-green/5'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Eine Daten-Zeile (Label · Wert · Copy) ────────────────────
function Zeile({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 flex-1 min-w-0 break-words select-text">{value}</span>
      <CopyButton value={value} label={label} />
    </div>
  )
}

// ── „Alles kopieren"-Button ───────────────────────────────────
function CopyAlles({ text }: { text: string }) {
  const [copied, run] = useCopied()
  return (
    <button
      type="button"
      onClick={() => run(text)}
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-gray-200 text-gray-500 hover:text-wellbeing-green hover:border-wellbeing-green/40'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Kopiert' : 'Alles kopieren'}
    </button>
  )
}

// ── Karte ─────────────────────────────────────────────────────
interface Props {
  titel:           string
  name:            string
  firma:           string | null
  ansprechpartner: string | null
  email:           string | null
  telefon:         string | null
  strasse:         string | null
  plz:             string | null
  ort:             string | null
  /** Legacy-Freitextadresse (Fallback, solange keine strukturierten Teile gepflegt sind). */
  adresseLegacy:   string | null
  website:         string | null
}

export default function KundeKopierKarte({
  titel, name, firma, ansprechpartner, email, telefon, strasse, plz, ort, adresseLegacy, website,
}: Props) {
  const hatStruktur = !!(strasse || plz || ort)
  const firmaExtra    = firma && firma !== name ? firma : null
  const ansprechExtra = ansprechpartner && ansprechpartner !== name ? ansprechpartner : null

  // Block für Bestellformulare (Name → Firma → Adresse → Telefon → E-Mail)
  const ortZeile = [plz, ort].filter(Boolean).join(' ')
  const allesZeilen = [
    name,
    firmaExtra,
    ansprechExtra,
    hatStruktur ? strasse : adresseLegacy,
    hatStruktur ? (ortZeile || null) : null,
    telefon,
    email,
  ].filter(Boolean) as string[]
  const allesText = allesZeilen.join('\n')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{titel}</h2>
        <CopyAlles text={allesText} />
      </div>

      <div>
        <Zeile label="Name"           value={name} />
        {firmaExtra     && <Zeile label="Firma"          value={firmaExtra} />}
        {ansprechExtra  && <Zeile label="Ansprechpartner" value={ansprechExtra} />}
        <Zeile label="E-Mail"         value={email} />
        <Zeile label="Telefon"        value={telefon} />
        {hatStruktur ? (
          <>
            <Zeile label="Straße & Nr." value={strasse} />
            <Zeile label="PLZ"          value={plz} />
            <Zeile label="Ort"          value={ort} />
          </>
        ) : (
          <Zeile label="Adresse"        value={adresseLegacy} />
        )}
        <Zeile label="Website"        value={website} />
      </div>
    </div>
  )
}
