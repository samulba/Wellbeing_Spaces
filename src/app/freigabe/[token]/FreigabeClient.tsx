'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { Check, X, RefreshCw, ExternalLink, ChevronDown, Package, Star } from 'lucide-react'
import { freigabeStatusAendern, freigabeFavoritWaehlen } from '@/app/actions/freigabe'
import type { FreigabeRaum, FreigabeProdukt, FreigabeProduktGruppe, FreigabeBereich, ProduktStatus, Branding } from '@/lib/supabase/types'
import HinweisBanner from '@/components/HinweisBanner'
import FreigabeAbschlussModal from '@/components/FreigabeAbschlussModal'

// ── Konstante (Fallback) ──────────────────────────────────────
const MWST_DEFAULT = 0.19
const r2  = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// Branding-CSS stammt vom (vertrauenswürdigen) Org-Admin, wird aber defensiv
// von Ausbruch-/Script-Vektoren befreit, bevor es in <style> landet.
function sauberesCss(css: string): string {
  return css
    .replace(/<\/?\s*style/gi, '')
    .replace(/<\s*script/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
}

// ── Typen ─────────────────────────────────────────────────────
interface ProduktState {
  status: ProduktStatus
  kommentar: string
  aktiveAktion: 'ablehnen' | 'alternative' | null
  kommentarEingabe: string
  kundeFavorit: boolean
}

// Bereiche/"Gruppen" eines Raums (Migration 116). Liegt `bereiche` vor, ist das
// die maßgebliche Struktur; sonst ein synthetischer Bereich aus den
// Back-Compat-Feldern (gruppen + lose Produkte) → Verhalten wie bisher.
function raumBuckets(r: FreigabeRaum): FreigabeBereich[] {
  if (r.bereiche && r.bereiche.length > 0) return r.bereiche
  return [{ id: '__all__', name: r.name, beschreibung: null, bloecke: r.gruppen ?? [], produkte: r.produkte }]
}
// Produkte eines Raums flach (Blöcke + Einzelprodukte, jedes genau einmal)
function raumProdukte(r: FreigabeRaum): FreigabeProdukt[] {
  return raumBuckets(r).flatMap((b) => [...b.bloecke.flatMap((g) => g.produkte), ...b.produkte])
}
// Alle Produkte eines Projekts flach
function flacheProdukte(raeume: FreigabeRaum[]): FreigabeProdukt[] {
  return raeume.flatMap(raumProdukte)
}

interface Props {
  token: string
  projektName: string
  kundeName: string | null
  raeume: FreigabeRaum[]
  mwst?: number
  branding?: Branding | null
  // Pflicht-Abschluss (Migration 081)
  scopeBeschreibung?: string
  bereitsAbgeschlossen?: boolean
  abgeschlossenDurch?: string | null
}

// ── Logo ────────────────────────────────────────────
function Logo() {
  return (
    <Image src="/logo-klein.png" alt="Wellbeing Spaces" width={20} height={20} className="w-5 h-5 object-contain" />
  )
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function FreigabeClient({
  token,
  projektName,
  kundeName,
  raeume,
  mwst = MWST_DEFAULT,
  branding,
  scopeBeschreibung,
  bereitsAbgeschlossen = false,
  abgeschlossenDurch = null,
}: Props) {
  const prim       = branding?.primary_color    ?? '#445c49'
  const bg         = branding?.background_color ?? '#f6ede2'
  const firmenname = branding?.firmenname       ?? 'Wellbeing Spaces'
  const fontFamily = branding?.font_family      ?? 'Inter'
  // ── Alle Hooks zuerst (Rules of Hooks) ───────────────────────
  const [state, setState] = useState<Record<string, ProduktState>>(() => {
    const init: Record<string, ProduktState> = {}
    for (const p of flacheProdukte(raeume)) {
      init[p.id] = {
        status: p.status,
        kommentar: p.kommentar ?? '',
        aktiveAktion: null,
        kommentarEingabe: p.kommentar ?? '',
        kundeFavorit: !!p.kunde_favorit,
      }
    }
    return init
  })

  const [isPending, startTransition] = useTransition()
  const [abschlussModalOffen, setAbschlussModalOffen] = useState(false)
  const [lokalAbgeschlossen, setLokalAbgeschlossen] = useState(false)
  const [fehlerMeldung, setFehlerMeldung] = useState<string | null>(null)
  const [aktiverRaumIndex, setAktiverRaumIndex] = useState(0)
  // Innerer Bereich-Pager (Migration 116) — bei Raumwechsel auf 0 zurück.
  const [aktiverBereichIndex, setAktiverBereichIndex] = useState(0)
  useEffect(() => { setAktiverBereichIndex(0) }, [aktiverRaumIndex])

  // Read-Only-Bestätigungsscreen wenn bereits abgeschlossen
  if (bereitsAbgeschlossen || lokalAbgeschlossen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ backgroundColor: bg }}>
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Freigabe abgeschlossen</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Diese Freigabe wurde {abgeschlossenDurch ? <>von <span className="font-semibold text-gray-700">{abgeschlossenDurch}</span></> : null} bereits eingereicht.
            <br />Danke für deine Rückmeldung!
          </p>
          <div className="text-xs text-gray-400 border-t pt-4">
            <p className="font-medium text-gray-600 mb-0.5">{projektName}</p>
            {scopeBeschreibung && <p>{scopeBeschreibung}</p>}
          </div>
        </div>
      </div>
    )
  }

  // Zähler auf Entscheidungs-EINHEITEN (Mig 114): je ungruppiertem Produkt 1 Einheit;
  // je Auswahl-Gruppe 1 Einheit (entschieden, sobald EIN Mitglied freigegeben ist).
  // Nicht-gewählte Alternativen blockieren so weder Fortschritt noch Abschluss.
  let total = 0, offenCount = 0, freigegebenCount = 0, abgelehntCount = 0
  for (const r of raeume) {
    for (const b of raumBuckets(r)) {
      for (const p of b.produkte) {
        if (!state[p.id]) continue
        total++
        const s = state[p.id].status
        if (s === 'freigegeben') freigegebenCount++
        else if (s === 'abgelehnt' || s === 'ueberarbeitung') abgelehntCount++
        else offenCount++
      }
      for (const g of b.bloecke) {
        const members = g.produkte.filter((p) => state[p.id])
        if (members.length === 0) continue
        total++
        if (members.some((p) => state[p.id]?.status === 'freigegeben')) freigegebenCount++
        else offenCount++
      }
    }
  }
  const entschiedenCount = total - offenCount
  const fortschritt      = total > 0 ? Math.round((entschiedenCount / total) * 100) : 0
  const alleDone         = freigegebenCount === total && total > 0
  const alleEntschieden  = offenCount === 0 && total > 0

  // Räume mit mindestens einem aktiven Produkt (für Tab-Navigation pro Raum)
  const sichtbareRaeume = raeume.filter((r) => raumProdukte(r).some((p) => state[p.id]))
  const idx = Math.min(aktiverRaumIndex, Math.max(0, sichtbareRaeume.length - 1))
  const aktuellerRaum = sichtbareRaeume[idx]
  const raumOffenCount = (r: FreigabeRaum) => {
    let offen = 0
    for (const b of raumBuckets(r)) {
      for (const p of b.produkte) if (state[p.id] && state[p.id].status === 'ausstehend') offen++
      for (const g of b.bloecke) {
        const members = g.produkte.filter((p) => state[p.id])
        if (members.length > 0 && !members.some((p) => state[p.id]?.status === 'freigegeben')) offen++
      }
    }
    return offen
  }

  function speichereStatus(produktId: string, status: ProduktStatus, kommentar = '') {
    startTransition(async () => {
      const result = await freigabeStatusAendern(token, produktId, status, kommentar)
      if ('erfolg' in result) {
        setState((prev) => ({
          ...prev,
          [produktId]: { ...prev[produktId], status, kommentar, aktiveAktion: null, kommentarEingabe: kommentar },
        }))
      }
    })
  }

  // Kunde wählt seinen Favoriten in einer Auswahl-Gruppe → wird freigegeben,
  // die Geschwister kehren auf 'ausstehend' zurück (Migration 114).
  function waehleFavorit(gruppe: FreigabeProduktGruppe, chosenId: string) {
    startTransition(async () => {
      const res = await freigabeFavoritWaehlen(token, chosenId)
      if ('erfolg' in res) {
        setState((prev) => {
          const next = { ...prev }
          for (const p of gruppe.produkte) {
            const istChosen = p.id === chosenId
            next[p.id] = {
              ...prev[p.id],
              status: istChosen ? 'freigegeben' : 'ausstehend',
              kundeFavorit: istChosen,
              aktiveAktion: null,
            }
          }
          return next
        })
      } else {
        setFehlerMeldung(res.fehler)
        setTimeout(() => setFehlerMeldung(null), 5000)
      }
    })
  }

  function setAktion(produktId: string, aktion: 'ablehnen' | 'alternative' | null) {
    setState((prev) => ({
      ...prev,
      [produktId]: { ...prev[produktId], aktiveAktion: aktion },
    }))
  }

  function setKommentarEingabe(produktId: string, text: string) {
    setState((prev) => ({
      ...prev,
      [produktId]: { ...prev[produktId], kommentarEingabe: text },
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--brand-primary': prim, '--brand-bg': bg } as React.CSSProperties}>
      {branding?.custom_css && <style>{sauberesCss(branding.custom_css)}</style>}

      {/* ── Sticky Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {branding?.logo_url ? (
                <Image src={branding.logo_url} alt={firmenname} width={24} height={24} className="rounded object-contain shrink-0" />
              ) : (
                <Logo />
              )}
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 leading-none mb-0.5" style={{ fontFamily }}>{firmenname}</p>
                <h1 className="text-sm font-semibold text-gray-900 truncate leading-none">
                  {projektName}
                </h1>
              </div>
            </div>
            {/* Fortschritt-Badge */}
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="text-right">
                <p className="text-[11px] text-gray-400 leading-none mb-0.5">Freigaben</p>
                <p className="text-sm font-bold text-gray-900 leading-none">
                  {freigegebenCount}<span className="text-gray-400 font-normal">/{total}</span>
                </p>
              </div>
              {/* Mini-Donut */}
              <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
                <circle cx="16" cy="16" r="12" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                <circle
                  cx="16" cy="16" r="12" fill="none"
                  stroke={alleDone ? '#10B981' : prim} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 12}`}
                  strokeDashoffset={`${2 * Math.PI * 12 * (1 - fortschritt / 100)}`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '16px 16px', transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden mb-0">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fortschritt}%`, backgroundColor: alleDone ? '#10B981' : prim }}
            />
          </div>
        </div>
      </header>

      {/* ── Inhalt ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Intro-Box */}
        {!alleDone ? (
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 mb-6 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              Bitte prüfen Sie die folgenden Produkte und geben Sie diese frei oder lehnen Sie sie ab.
              {kundeName && <span className="text-gray-500"> · {kundeName}</span>}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              {total - freigegebenCount} von {total} Produkt{total - freigegebenCount !== 1 ? 'en' : ''} noch ausstehend
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-5 mb-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-800">Alle Produkte wurden freigegeben!</p>
            <p className="text-xs text-emerald-600 mt-1">Vielen Dank für Ihre Rückmeldung.</p>
          </div>
        )}

        {/* ── Raum-Navigation (pro Raum eine Ansicht) ─────────── */}
        {sichtbareRaeume.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            {sichtbareRaeume.map((r, i) => {
              const offen = raumOffenCount(r)
              const aktiv = i === idx
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAktiverRaumIndex(i)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${aktiv ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                  style={aktiv ? { backgroundColor: prim } : undefined}
                >
                  {r.name}
                  {offen > 0 ? (
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${aktiv ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{offen}</span>
                  ) : (
                    <Check className={`w-3 h-3 ${aktiv ? 'text-white' : 'text-emerald-500'}`} />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Aktiver Raum → Bereich/"Gruppe" (geführt, ein Bereich pro Seite) ── */}
        {aktuellerRaum && (() => {
          const raum = aktuellerRaum
          const hatAktive = (b: FreigabeBereich) =>
            b.bloecke.some((g) => g.produkte.some((p) => state[p.id])) || b.produkte.some((p) => state[p.id])
          const sichtbareBereiche = raumBuckets(raum).filter(hatAktive)
          if (sichtbareBereiche.length === 0) return null
          const bIdx = Math.min(aktiverBereichIndex, sichtbareBereiche.length - 1)
          const bereich = sichtbareBereiche[bIdx]
          const aktiveProdukte = bereich.produkte.filter((p) => state[p.id])
          const gruppen = bereich.bloecke.filter((g) => g.produkte.some((p) => state[p.id]))
          const anzahl = gruppen.reduce((s, g) => s + g.produkte.length, 0) + aktiveProdukte.length
          const zeigeBereichKopf = bereich.id !== '__all__'
          return (
            <div className="mb-6">
              {/* Raum-Kopf */}
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{raum.name}</span>
                <div className="flex-1 h-px bg-gray-200" />
                {sichtbareBereiche.length > 1 && (
                  <span className="text-xs text-gray-400">Gruppe {bIdx + 1} / {sichtbareBereiche.length}</span>
                )}
              </div>
              {/* Bereich-Kopf */}
              {zeigeBereichKopf && (
                <div className="mb-4 px-1">
                  <h2 className="text-lg font-semibold tracking-tight" style={{ color: prim }}>{bereich.name}</h2>
                  {bereich.beschreibung && <p className="text-sm text-gray-500 mt-0.5">{bereich.beschreibung}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{anzahl} Produkt{anzahl !== 1 ? 'e' : ''}</p>
                </div>
              )}
              <div className="space-y-4">
                {gruppen.map((g) => (
                  <ProduktGruppeKarte
                    key={g.id}
                    gruppe={g}
                    states={state}
                    isPending={isPending}
                    mwst={mwst}
                    prim={prim}
                    onWaehle={(id) => waehleFavorit(g, id)}
                  />
                ))}
                {aktiveProdukte.map((p) => (
                  <ProduktKarte
                    key={p.id}
                    produkt={p}
                    produktState={state[p.id]}
                    isPending={isPending}
                    mwst={mwst}
                    onFreigeben={() => speichereStatus(p.id, 'freigegeben')}
                    onAktionWaehlen={(a) => setAktion(p.id, a)}
                    onKommentarChange={(t) => setKommentarEingabe(p.id, t)}
                    onSpeichern={(s) => speichereStatus(p.id, s, state[p.id].kommentarEingabe)}
                    onAbbrechen={() => setAktion(p.id, null)}
                  />
                ))}
              </div>
              {/* Bereich-Pager (innerhalb des Raums) */}
              {sichtbareBereiche.length > 1 && (
                <div className="flex items-center justify-between gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setAktiverBereichIndex((i) => Math.max(0, i - 1))}
                    disabled={bIdx === 0}
                    className="inline-flex items-center gap-1 text-sm text-gray-600 disabled:opacity-30 disabled:cursor-default hover:text-gray-900 transition-colors"
                  >
                    ← Zurück
                  </button>
                  <span className="text-xs text-gray-400">{bIdx + 1} / {sichtbareBereiche.length}</span>
                  <button
                    type="button"
                    onClick={() => setAktiverBereichIndex((i) => Math.min(sichtbareBereiche.length - 1, i + 1))}
                    disabled={bIdx === sichtbareBereiche.length - 1}
                    className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-30 disabled:cursor-default transition-colors"
                    style={{ color: bIdx === sichtbareBereiche.length - 1 ? undefined : prim }}
                  >
                    Weiter →
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Raum-Pager ─────────────────────────────────────── */}
        {sichtbareRaeume.length > 1 && (
          <div className="flex items-center justify-between gap-3 mb-2">
            <button
              type="button"
              onClick={() => setAktiverRaumIndex((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="inline-flex items-center gap-1 text-sm text-gray-600 disabled:opacity-30 disabled:cursor-default hover:text-gray-900 transition-colors"
            >
              ← Vorheriger Raum
            </button>
            <span className="text-xs text-gray-400">{idx + 1} / {sichtbareRaeume.length}</span>
            <button
              type="button"
              onClick={() => setAktiverRaumIndex((i) => Math.min(sichtbareRaeume.length - 1, i + 1))}
              disabled={idx === sichtbareRaeume.length - 1}
              className="inline-flex items-center gap-1 text-sm text-gray-600 disabled:opacity-30 disabled:cursor-default hover:text-gray-900 transition-colors"
            >
              Nächster Raum →
            </button>
          </div>
        )}

        {/* ── Abschluss-Panel ──────────────────────────────── */}
        {total > 0 && (
          <div className={`mt-8 mb-4 p-5 border rounded-2xl transition-all ${
            alleEntschieden
              ? 'bg-white border-wellbeing-green/40 shadow-md'
              : 'bg-gray-50 border-gray-200'
          }`}>
            {alleEntschieden ? (
              <>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Bereit zum Abschluss</h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Sie haben alle {total} Positionen entschieden ({freigegebenCount} freigegeben, {abgelehntCount} abgelehnt).
                  Mit einem Klick senden Sie Ihre finale Rückmeldung an uns.
                </p>
                <button
                  onClick={() => setAbschlussModalOffen(true)}
                  disabled={isPending}
                  style={{ backgroundColor: prim }}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Freigabe abschließen →
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Noch {offenCount} offen</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Bitte entscheiden Sie zu jedem Produkt (Freigeben, Ablehnen oder Alternative),
                  danach können Sie die Freigabe abschließen.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Abschluss-Modal ──────────────────────────────── */}
        <FreigabeAbschlussModal
          isOpen={abschlussModalOffen}
          onClose={() => setAbschlussModalOffen(false)}
          onErfolg={() => { setAbschlussModalOffen(false); setLokalAbgeschlossen(true) }}
          token={token}
          projektName={projektName}
          scopeBeschreibung={scopeBeschreibung}
          gesamtCount={total}
          freigegebenCount={freigegebenCount}
          abgelehntCount={abgelehntCount}
          brandingPrim={prim}
        />

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="text-center pt-8 pb-6 border-t border-gray-200 mt-4 space-y-2.5">
          <p className="text-xs text-gray-400">Alle Angaben sind unverbindlich.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {branding?.email && (
              <a href={`mailto:${branding.email}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{branding.email}</a>
            )}
            {branding?.email && (branding.telefon || branding.datenschutz_url || branding.impressum_text) && <span className="text-gray-300">·</span>}
            {branding?.telefon && (
              <a href={`tel:${branding.telefon}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{branding.telefon}</a>
            )}
            {branding?.datenschutz_url && (
              <>
                <span className="text-gray-300">·</span>
                <a href={branding.datenschutz_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
                  Datenschutz
                </a>
              </>
            )}
          </div>
          {branding?.impressum_text && (
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">{branding.impressum_text}</p>
          )}
          {(branding?.show_powered_by ?? true) && (
            <p className="text-[10px] text-gray-300">Powered by Wellbeing Spaces</p>
          )}
        </div>
      </div>

      {/* Fehler-Toast (z. B. Auswahl außerhalb des Bereichs) */}
      {fehlerMeldung && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-sm bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2">
          <X className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{fehlerMeldung}</span>
        </div>
      )}
    </div>
  )
}

// ── Produktkarte ──────────────────────────────────────────────
interface ProduktKarteProps {
  produkt: FreigabeProdukt
  produktState: ProduktState
  isPending: boolean
  mwst: number
  onFreigeben: () => void
  onAktionWaehlen: (a: 'ablehnen' | 'alternative') => void
  onKommentarChange: (t: string) => void
  onSpeichern: (s: ProduktStatus) => void
  onAbbrechen: () => void
}

function ProduktKarte({
  produkt, produktState, isPending, mwst,
  onFreigeben, onAktionWaehlen, onKommentarChange, onSpeichern, onAbbrechen,
}: ProduktKarteProps) {
  const { status, aktiveAktion, kommentarEingabe, kommentar } = produktState
  const [detailOffen, setDetailOffen] = useState(false)

  const vpBrutto      = r2((produkt.verkaufspreis ?? 0) * (1 + mwst))
  const gesamtBrutto  = r2(vpBrutto * produkt.menge)

  const statusCfg = {
    ausstehend:     { rand: 'border-gray-200',    bg: 'bg-white',         badgeCls: 'bg-gray-100 text-gray-500',        label: 'Ausstehend' },
    freigegeben:    { rand: 'border-emerald-200', bg: 'bg-emerald-50/40', badgeCls: 'bg-emerald-100 text-emerald-700',  label: 'Freigegeben' },
    abgelehnt:      { rand: 'border-red-200',     bg: 'bg-red-50/40',     badgeCls: 'bg-red-100 text-red-600',          label: 'Abgelehnt' },
    ueberarbeitung: { rand: 'border-amber-200',   bg: 'bg-amber-50/40',   badgeCls: 'bg-amber-100 text-amber-700',      label: 'Überarbeitung' },
  }
  const cfg = statusCfg[status] ?? statusCfg.ausstehend

  return (
    <div className={`border ${cfg.rand} ${cfg.bg} rounded-2xl overflow-hidden shadow-sm transition-all`}>

      {/* ── Produktbild (groß, oben) ──────────────────────── */}
      <div className="w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-gray-100">
        {produkt.bild_url ? (
          <Image
            src={produkt.bild_url}
            alt={produkt.name}
            width={800}
            height={400}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
      </div>

      <div className="p-5">
        {/* ── Kopf: Name + Status ───────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{produkt.name}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {produkt.kategorie && (
                <span className="text-xs text-gray-500">{produkt.kategorie}</span>
              )}
              <span className="text-xs text-gray-500">{produkt.menge} {produkt.einheit}</span>
              {produkt.produkt_url && (
                <a href={produkt.produkt_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  Produktlink
                </a>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.badgeCls}`}>
            {cfg.label}
          </span>
        </div>

        {/* ── Vermerk/Hinweis (nur wenn vom Designer freigegeben) ── */}
        {produkt.hinweis && (
          <div className="mb-3">
            <HinweisBanner text={produkt.hinweis} />
          </div>
        )}

        {/* ── Beschreibung (einklappbar) ────────────────── */}
        {produkt.beschreibung && (
          <button
            type="button"
            onClick={() => setDetailOffen((v) => !v)}
            className="w-full text-left mb-3"
          >
            <div className={`text-sm text-gray-600 leading-relaxed overflow-hidden transition-all ${detailOffen ? '' : 'line-clamp-2'}`}>
              {produkt.beschreibung}
            </div>
            {produkt.beschreibung.length > 120 && (
              <span className="text-xs text-wellbeing-green flex items-center gap-0.5 mt-0.5">
                {detailOffen ? 'Weniger' : 'Mehr'}
                <ChevronDown className={`w-3 h-3 transition-transform ${detailOffen ? 'rotate-180' : ''}`} />
              </span>
            )}
          </button>
        )}

        {/* ── Preise ────────────────────────────────────── */}
        {produkt.verkaufspreis != null ? (
          <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <PreisZeile label="Netto" wert={eur(produkt.verkaufspreis)} />
            <PreisZeile label="Brutto" wert={eur(vpBrutto)} />
            <PreisZeile label={produkt.menge > 1 ? `${produkt.menge}× Gesamt` : 'Gesamt'} wert={eur(gesamtBrutto)} hervorheben />
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Preis auf Anfrage</p>
        )}

        {/* ── Kommentar anzeigen ────────────────────────── */}
        {kommentar && !aktiveAktion && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">Ihr Kommentar</p>
            <p className="text-sm text-amber-900 leading-relaxed">{kommentar}</p>
          </div>
        )}

        {/* ── Aktions-Buttons ───────────────────────────── */}
        {!aktiveAktion && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onFreigeben}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                status === 'freigegeben'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-4 h-4" />
              Freigeben
            </button>
            <button
              onClick={() => onAktionWaehlen('ablehnen')}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                status === 'abgelehnt'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                  : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              }`}
            >
              <X className="w-4 h-4" />
              Ablehnen
            </button>
            <button
              onClick={() => onAktionWaehlen('alternative')}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                status === 'ueberarbeitung'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Alternative
            </button>
          </div>
        )}

        {/* ── Kommentarfeld ─────────────────────────────── */}
        {aktiveAktion && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {aktiveAktion === 'ablehnen' ? 'Grund für Ablehnung (optional)' : 'Was wünschen Sie stattdessen?'}
              </label>
              <textarea
                autoFocus
                rows={3}
                value={kommentarEingabe}
                onChange={(e) => onKommentarChange(e.target.value)}
                placeholder={
                  aktiveAktion === 'ablehnen'
                    ? 'z. B. Farbe passt nicht, anderes Modell gewünscht…'
                    : 'z. B. Bitte Alternative in Weiß…'
                }
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition resize-none"
              />
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => onSpeichern(aktiveAktion === 'ablehnen' ? 'abgelehnt' : 'ueberarbeitung')}
                disabled={isPending}
                className="flex-1 py-3.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
              >
                {isPending ? 'Wird gespeichert…' : 'Bestätigen'}
              </button>
              <button
                onClick={onAbbrechen}
                disabled={isPending}
                className="px-5 py-3.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PreisZeile({ label, wert, hervorheben }: { label: string; wert: string; hervorheben?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold ${hervorheben ? 'text-wellbeing-green' : 'text-gray-700'}`}>
        {wert}
      </p>
    </div>
  )
}

// ── Auswahl-Gruppen-Karte (Favorit/Alternative) ───────────────
interface ProduktGruppeKarteProps {
  gruppe: FreigabeProduktGruppe
  states: Record<string, ProduktState>
  isPending: boolean
  mwst: number
  prim: string
  onWaehle: (chosenId: string) => void
}

function ProduktGruppeKarte({ gruppe, states, isPending, mwst, prim, onWaehle }: ProduktGruppeKarteProps) {
  const gewaehlt = gruppe.produkte.find((p) => states[p.id]?.kundeFavorit)

  return (
    <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{gruppe.name}</h3>
            {gruppe.beschreibung && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{gruppe.beschreibung}</p>}
          </div>
          <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">Bitte eine Option wählen</span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {gruppe.produkte.map((p) => {
          const istGewaehlt = !!states[p.id]?.kundeFavorit
          const vpBrutto = r2((p.verkaufspreis ?? 0) * (1 + mwst))
          const gesamtBrutto = r2(vpBrutto * p.menge)
          return (
            <button
              key={p.id}
              type="button"
              disabled={isPending}
              onClick={() => onWaehle(p.id)}
              className={`w-full flex items-center gap-3 p-4 text-left transition-colors disabled:opacity-60 ${istGewaehlt ? 'bg-emerald-50/60' : 'hover:bg-gray-50'}`}
            >
              {/* Radio */}
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${istGewaehlt ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                {istGewaehlt && <Check className="w-3 h-3 text-white" />}
              </span>
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {p.bild_url ? (
                  <Image src={p.bild_url} alt={p.name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
                )}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                  {p.admin_favorit && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5" style={{ backgroundColor: `${prim}1a`, color: prim }}>
                      <Star className="w-2.5 h-2.5" /> Empfehlung
                    </span>
                  )}
                  {istGewaehlt && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Ihre Wahl</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                  {p.kategorie && <span>{p.kategorie}</span>}
                  <span>{p.menge} {p.einheit}</span>
                  {p.produkt_url && (
                    <a
                      href={p.produkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-wellbeing-green hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Link
                    </a>
                  )}
                </div>
              </div>
              {/* Preis */}
              <div className="text-right shrink-0">
                {p.verkaufspreis != null ? (
                  <>
                    <p className="text-sm font-mono font-semibold text-gray-900">{eur(gesamtBrutto)}</p>
                    <p className="text-[10px] text-gray-400">{p.menge > 1 ? `${p.menge}× · ` : ''}inkl. MwSt</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">auf Anfrage</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className={`px-5 py-2.5 border-t text-xs ${gewaehlt ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
        {gewaehlt
          ? <>&bdquo;{gewaehlt.name}&ldquo; ist freigegeben. Sie können jederzeit eine andere Option wählen.</>
          : <>Noch keine Auswahl getroffen — bitte wählen Sie eine Option.</>}
      </div>
    </div>
  )
}
