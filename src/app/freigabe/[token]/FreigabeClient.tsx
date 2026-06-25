'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Check, X, RefreshCw, ExternalLink, ChevronDown, Package, Star, Clock, Eye, ListChecks, ArrowRight, ArrowLeft, Plus, Minus, StickyNote, Maximize2, Boxes, MessageSquare } from 'lucide-react'
import { freigabeBearbeitungMarkieren, type FreigabeEntscheidung, type FreigabeBlockNotiz } from '@/app/actions/freigaben'
import type { FreigabeRaum, FreigabeProdukt, FreigabeProduktGruppe, FreigabeBereich, ProduktStatus, Branding } from '@/lib/supabase/types'
import { dedupeBundleKomponenten } from '@/lib/freigabe-baum'
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
  // Wunsch-Menge des Kunden (Migration 119) — init aus kunde_menge ?? menge.
  menge: number
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
// Alle Auswahl-Blöcke eines Projekts flach (für Block-Notizen)
function alleGruppen(raeume: FreigabeRaum[]): FreigabeProduktGruppe[] {
  return raeume.flatMap((r) => raumBuckets(r).flatMap((b) => b.bloecke))
}

// Kurzer Hash (djb2) — für den Server-Status-Fingerprint.
function hashStr(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}
// Fingerprint der Server-Freigabe-Status. Ändert sich, sobald der Admin
// irgendeinen Status setzt/zurücksetzt → ein veralteter lokaler Entwurf wird
// beim Öffnen verworfen (Server/Admin gewinnt). raum_produkte hat kein
// updated_at, daher dienen die Status-Werte selbst als Fingerprint.
function statusFingerprint(raeume: FreigabeRaum[]): string {
  return hashStr(flacheProdukte(raeume).map((p) => `${p.id}:${p.status}`).sort().join('|'))
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
  /** Optionale Nachricht des Admins an den Kunden (Migration 136). */
  begleitNachricht?: string | null
  bereitsAbgeschlossen?: boolean
  abgeschlossenDurch?: string | null
  /** Admin-Vorschau zum Testen: kein Live-Schreiben, kein Absenden, kein Entwurf. */
  vorschau?: boolean
}

// ── Logo ────────────────────────────────────────────
function Logo() {
  return (
    <Image src="/logo-klein.png" alt="Wellbeing Spaces" width={20} height={20} className="w-5 h-5 object-contain" />
  )
}

// Bild-Vergrößerung (Lightbox) — Klick außerhalb oder ESC schließt.
function BildLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl" />
    </div>
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
  begleitNachricht = null,
  bereitsAbgeschlossen = false,
  abgeschlossenDurch = null,
  vorschau = false,
}: Props) {
  const prim       = branding?.primary_color    ?? '#445c49'
  const bg         = branding?.background_color ?? '#f6ede2'
  const firmenname = branding?.firmenname       ?? 'Wellbeing Spaces'
  const fontFamily = branding?.font_family      ?? 'Inter'
  // Server-Status-Fingerprint (gegen veraltete localStorage-Entwürfe nach Admin-Änderungen).
  const serverFingerprint = statusFingerprint(raeume)
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
        menge: (p.kunde_menge ?? p.menge) || 1,
      }
    }
    return init
  })

  // Sammelnotiz je Auswahl-Block (Migration 119) — eigener State.
  const [blockNotizen, setBlockNotizen] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const g of alleGruppen(raeume)) init[g.id] = g.kunde_notiz ?? ''
    return init
  })

  const [isPending] = useTransition()
  const [abschlussModalOffen, setAbschlussModalOffen] = useState(false)
  const [zeigeReview, setZeigeReview] = useState(false)
  const [lokalAbgeschlossen, setLokalAbgeschlossen] = useState(false)
  const [aktiverRaumIndex, setAktiverRaumIndex] = useState(0)
  // Innerer Bereich-Pager (Migration 116) — bei Raumwechsel auf 0 zurück.
  const [aktiverBereichIndex, setAktiverBereichIndex] = useState(0)
  useEffect(() => { setAktiverBereichIndex(0) }, [aktiverRaumIndex])

  // Beim Wechsel von Raum/Bereich nach oben scrollen — sonst landet man bei
  // „Weiter"/„Nächster Raum" mitten/unten auf der Seite und übersieht Produkte.
  const navTopRef = useRef<HTMLDivElement>(null)
  const navMountRef = useRef(false)
  useEffect(() => {
    if (!navMountRef.current) { navMountRef.current = true; return }
    navTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [aktiverRaumIndex, aktiverBereichIndex])

  // ── Entwurf: Klicks schreiben NICHT mehr live, nur lokal (localStorage).
  //    Erst beim finalen Absenden (freigabeAbsenden) wird committet. ──────
  const bearbeitungMarkiertRef = useRef(false)
  function markiereBearbeitung() {
    if (vorschau || bearbeitungMarkiertRef.current) return
    bearbeitungMarkiertRef.current = true
    freigabeBearbeitungMarkieren(token).catch(() => {})
  }
  function persistDraft(s: Record<string, ProduktState>, notes: Record<string, string>) {
    if (vorschau) return
    try {
      const d: Record<string, { status: ProduktStatus; kommentar: string; kundeFavorit: boolean; menge: number }> = {}
      for (const id of Object.keys(s)) d[id] = { status: s[id].status, kommentar: s[id].kommentar, kundeFavorit: s[id].kundeFavorit, menge: s[id].menge }
      localStorage.setItem(`freigabe_draft_${token}`, JSON.stringify({ v: 3, fp: serverFingerprint, produkte: d, blockNotizen: notes }))
    } catch { /* ignore */ }
  }
  function draftLeeren() {
    try { localStorage.removeItem(`freigabe_draft_${token}`) } catch { /* ignore */ }
  }
  // Entwurf beim Öffnen wiederherstellen (gleiches Gerät) — nach Mount.
  useEffect(() => {
    if (vorschau) return
    try {
      const raw = localStorage.getItem(`freigabe_draft_${token}`)
      if (!raw) return
      const parsed = JSON.parse(raw)
      // Server-Status hat sich seit dem Entwurf geändert (Admin hat etwas gesetzt/
      // zurückgesetzt) ODER Freigabe bereits abgeschlossen → Entwurf verwerfen,
      // Server/Admin gewinnt. Legacy-Entwürfe ohne Fingerprint werden ebenfalls verworfen.
      if (bereitsAbgeschlossen || parsed?.fp !== serverFingerprint) { draftLeeren(); return }
      // v3: { fp, produkte, blockNotizen }
      const prod = (parsed?.produkte ?? parsed) as Record<string, { status: ProduktStatus; kommentar: string; kundeFavorit: boolean; menge?: number }>
      const notes = (parsed?.blockNotizen ?? null) as Record<string, string> | null
      setState((prev) => {
        const next = { ...prev }
        for (const id of Object.keys(prod)) {
          if (!next[id]) continue
          const d = prod[id]
          next[id] = {
            ...next[id],
            status: d.status, kommentar: d.kommentar, kommentarEingabe: d.kommentar,
            kundeFavorit: !!d.kundeFavorit,
            menge: typeof d.menge === 'number' && d.menge >= 1 ? d.menge : next[id].menge,
          }
        }
        return next
      })
      if (notes && typeof notes === 'object') setBlockNotizen((prev) => ({ ...prev, ...notes }))
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
        if (g.ist_bundle) {
          // Set = all-or-nothing: freigegeben nur wenn ALLE Komponenten freigegeben.
          if (members.every((p) => state[p.id]?.status === 'freigegeben')) freigegebenCount++
          else if (members.some((p) => state[p.id]?.status === 'abgelehnt' || state[p.id]?.status === 'ueberarbeitung')) abgelehntCount++
          else offenCount++
        } else if (members.some((p) => state[p.id]?.status === 'freigegeben')) {
          freigegebenCount++
        } else offenCount++
      }
    }
  }
  const entschiedenCount = total - offenCount
  const fortschritt      = total > 0 ? Math.round((entschiedenCount / total) * 100) : 0
  const alleDone         = freigegebenCount === total && total > 0
  const alleEntschieden  = offenCount === 0 && total > 0

  // Endzustand aller Produkte für den Sammel-Commit (freigabeAbsenden).
  // menge nur, wenn der Kunde sie geändert hat (sonst null = geplante Menge gilt).
  const entscheidungen: FreigabeEntscheidung[] = flacheProdukte(raeume).map((p) => {
    const chosenMenge = state[p.id]?.menge ?? p.menge
    return {
      raumProduktId: p.id,
      status: (state[p.id]?.status ?? 'ausstehend') as FreigabeEntscheidung['status'],
      kommentar: state[p.id]?.kommentar || null,
      kundeFavorit: !!state[p.id]?.kundeFavorit,
      menge: chosenMenge !== p.menge ? chosenMenge : null,
    }
  })
  // Block-Sammelnotizen für den Commit (nur nicht-leere).
  const blockNotizenCommit: FreigabeBlockNotiz[] = Object.entries(blockNotizen)
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([gruppeId, notiz]) => ({ gruppeId, notiz: notiz.trim() }))

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

  // Entwurf (lokal): nur State + localStorage, KEIN Live-Schreiben.
  function speichereStatus(produktId: string, status: ProduktStatus, kommentar = '') {
    markiereBearbeitung()
    const next = {
      ...state,
      [produktId]: { ...state[produktId], status, kommentar, aktiveAktion: null, kommentarEingabe: kommentar },
    }
    setState(next)
    persistDraft(next, blockNotizen)
  }

  // Mehrfachauswahl (Migration 119): Kunde schaltet ein Produkt eines Auswahl-
  // Blocks an/aus. Gewählt = freigegeben + kunde_favorit; mehrere möglich.
  function toggleBlockMember(produktId: string) {
    markiereBearbeitung()
    const istGewaehlt = !!state[produktId]?.kundeFavorit
    const next = {
      ...state,
      [produktId]: {
        ...state[produktId],
        status: (istGewaehlt ? 'ausstehend' : 'freigegeben') as ProduktStatus,
        kundeFavorit: !istGewaehlt,
        aktiveAktion: null,
      },
    }
    setState(next)
    persistDraft(next, blockNotizen)
  }

  // Wunsch-Menge ändern (Migration 119).
  function setMenge(produktId: string, menge: number) {
    markiereBearbeitung()
    const m = Math.max(1, Math.min(999, Math.round(menge || 1)))
    const next = { ...state, [produktId]: { ...state[produktId], menge: m } }
    setState(next)
    persistDraft(next, blockNotizen)
  }

  // Sammelnotiz eines Auswahl-Blocks ändern (Migration 119).
  function setBlockNotiz(gruppeId: string, text: string) {
    markiereBearbeitung()
    const next = { ...blockNotizen, [gruppeId]: text }
    setBlockNotizen(next)
    persistDraft(state, next)
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

  // ── Review / letzter Check-up vor dem verbindlichen Absenden ──
  if (zeigeReview) {
    const reviewStatus = {
      freigegeben:    { text: 'Freigegeben', Icon: Check,     pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
      ueberarbeitung: { text: 'Änderung',    Icon: RefreshCw, pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
      abgelehnt:      { text: 'Abgelehnt',   Icon: X,         pill: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
      ausstehend:     { text: 'Offen',       Icon: Clock,     pill: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
    } as const

    // Mini-Thumbnail (kein eigenes Component → keine Remounts beim Re-Render)
    const thumb = (url: string | null, name: string) => (
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200/70 shrink-0">
        {url
          ? <Image src={url} alt={name} width={96} height={96} className="w-full h-full object-cover" unoptimized />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>}
      </div>
    )

    // Zusammenfassungs-Zähler (Produkte + gewählte Blöcke)
    let revFrei = 0, revAend = 0, revAbl = 0
    for (const r of raeume) for (const b of raumBuckets(r)) {
      for (const p of b.produkte) {
        if (!state[p.id]) continue
        const s = state[p.id].status
        if (s === 'freigegeben') revFrei++
        else if (s === 'ueberarbeitung') revAend++
        else if (s === 'abgelehnt') revAbl++
      }
      for (const g of b.bloecke) {
        const members = g.produkte.filter((p) => state[p.id])
        if (members.length === 0) continue
        if (g.ist_bundle) {
          if (members.every((p) => state[p.id]?.status === 'freigegeben')) revFrei++
          else if (members.some((p) => state[p.id]?.status === 'abgelehnt')) revAbl++
          else if (members.some((p) => state[p.id]?.status === 'ueberarbeitung')) revAend++
        } else if (members.some((p) => state[p.id]?.status === 'freigegeben')) {
          revFrei++
        }
      }
    }

    // Geschätzte Kosten der freigegebenen Positionen (mit den gewünschten Mengen).
    let summeNetto = 0
    for (const p of flacheProdukte(raeume)) {
      if (state[p.id]?.status === 'freigegeben' && p.verkaufspreis != null) {
        summeNetto += p.verkaufspreis * (state[p.id]?.menge ?? p.menge)
      }
    }
    summeNetto = r2(summeNetto)
    const summeBrutto = r2(summeNetto * (1 + mwst))

    // Wiederverwendbare Bausteine (Mobile: über den Räumen · Desktop: in der Sidebar)
    const zusammenfassungBand = (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { wert: revFrei, label: 'Freigegeben', dot: 'bg-emerald-500', val: 'text-emerald-600' },
          { wert: revAend, label: 'Änderung',    dot: 'bg-amber-500',   val: 'text-amber-600' },
          { wert: revAbl,  label: 'Abgelehnt',   dot: 'bg-red-500',     val: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white ring-1 ring-gray-200 rounded-2xl px-3 py-3.5 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={`text-2xl font-bold tabular-nums ${s.val}`}>{s.wert}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    )

    const kostenCard = summeNetto > 0 ? (
      <div className="bg-white ring-1 ring-gray-200 rounded-2xl px-4 sm:px-5 py-4 shadow-sm">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Geschätzte Kosten Ihrer Freigaben</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Zwischensumme (netto)</span>
            <span className="font-mono text-gray-700 tabular-nums">{eur(summeNetto)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">zzgl. MwSt ({Math.round(mwst * 100)} %)</span>
            <span className="font-mono text-gray-700 tabular-nums">{eur(r2(summeBrutto - summeNetto))}</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Gesamt (brutto)</span>
            <span className="font-mono text-lg font-bold tabular-nums" style={{ color: prim }}>{eur(summeBrutto)}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed">
          Enthält nur <strong className="text-gray-500 font-medium">freigegebene</strong> Positionen mit Ihren gewünschten Mengen. Abgelehnte Positionen und Alternativ-Wünsche sind nicht eingerechnet.
        </p>
      </div>
    ) : null

    return (
      <div className="min-h-screen" style={{ backgroundColor: bg, fontFamily }}>
        {vorschau && (
          <div className="sticky top-0 z-40 bg-amber-500 text-white text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 text-center">
            <Eye className="w-4 h-4 shrink-0" />
            Vorschau-Modus — nur zum Testen. Eingaben werden nicht gespeichert oder gesendet.
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-7 pb-32 lg:pb-12">
          {/* Zurück (oben links) */}
          <button
            type="button"
            onClick={() => setZeigeReview(false)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zum Bearbeiten
          </button>

          {/* Hero */}
          <div className="mb-6">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-3 px-2.5 py-1 rounded-full"
              style={{ color: prim, backgroundColor: `${prim}14` }}
            >
              <ListChecks className="w-3.5 h-3.5" /> Letzter Schritt
            </span>
            <h1 className="font-syne text-2xl sm:text-[28px] font-bold tracking-tight leading-tight" style={{ color: prim }}>
              Bitte prüfen Sie Ihre Auswahl
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Sehen Sie Ihre Entscheidungen in Ruhe durch. Erst mit <strong className="text-gray-700">&bdquo;Verbindlich absenden&ldquo;</strong> wird alles an {firmenname} übermittelt — vorher bleibt nichts sichtbar.
            </p>
          </div>

          {/* Desktop: 2-spaltig (Räume + sticky Sidebar) · Mobile: gestapelt */}
          <div className="lg:grid lg:grid-cols-[1fr_336px] lg:gap-8 lg:items-start">
          <div className="min-w-0">

          {/* Mobile: Zusammenfassung + Kosten über den Räumen */}
          <div className="lg:hidden space-y-4 mb-6">
            {zusammenfassungBand}
            {kostenCard}
          </div>

          {/* Räume */}
          <div className="space-y-4">
            {sichtbareRaeume.map((raum) => {
              const buckets = raumBuckets(raum).filter(
                (b) => b.bloecke.some((g) => g.produkte.some((p) => state[p.id])) || b.produkte.some((p) => state[p.id]),
              )
              const raumAnzahl = buckets.reduce(
                (sum, b) => sum + b.produkte.filter((p) => state[p.id]).length
                  + b.bloecke.filter((g) => g.produkte.some((p) => state[p.id])).length,
                0,
              )
              return (
                <div key={raum.id} className="bg-white ring-1 ring-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prim }} />
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{raum.name}</h3>
                    <span className="ml-auto text-[11px] text-gray-400 shrink-0">{raumAnzahl} Position{raumAnzahl !== 1 ? 'en' : ''}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {buckets.map((b) => {
                      const zeigeBereich = b.name && b.id !== '__all__' && b.id !== '__ohne__'
                      return (
                        <div key={b.id} className="px-4 sm:px-5 py-3">
                          {zeigeBereich && (
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{b.name}</p>
                          )}

                          {/* Auswahl-Blöcke → alle gewählten Optionen (Mehrfachauswahl) */}
                          {b.bloecke.filter((g) => g.produkte.some((p) => state[p.id])).map((g) => {
                            // Set/Bundle: als EINE Zeile mit all-or-nothing-Status (kein kundeFavorit).
                            if (g.ist_bundle) {
                              const members = g.produkte.filter((p) => state[p.id])
                              const allFrei = members.length > 0 && members.every((p) => state[p.id]?.status === 'freigegeben')
                              const anyAbl  = members.some((p) => state[p.id]?.status === 'abgelehnt')
                              const anyAend = members.some((p) => state[p.id]?.status === 'ueberarbeitung')
                              const label = allFrei ? 'Komplett freigegeben' : anyAbl ? 'Abgelehnt' : anyAend ? 'Änderung gewünscht' : 'Offen'
                              const pill  = allFrei ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                          : anyAbl  ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                                          : anyAend ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                          : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                              const kommentar = (state[members[0]?.id]?.kommentar ?? '').trim()
                              return (
                                <div key={g.id} className="py-2">
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{g.name} · Set</p>
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Boxes className="w-5 h-5" style={{ color: prim }} /></div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 truncate">{(g.bundle_komponenten_anzeige ?? dedupeBundleKomponenten(g.produkte)).length} Komponenten</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${pill}`}>{label}</span>
                                  </div>
                                  {kommentar && (
                                    <div className="mt-2 ml-[60px] pl-3 border-l-2 border-wellbeing-terracotta/30 flex items-start gap-1.5">
                                      <StickyNote className="w-3.5 h-3.5 text-wellbeing-terracotta/70 shrink-0 mt-0.5" />
                                      <p className="text-xs text-gray-500 italic leading-relaxed">&bdquo;{kommentar}&ldquo;</p>
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            const gewaehlte = g.produkte.filter((p) => state[p.id]?.kundeFavorit)
                            const notiz = (blockNotizen[g.id] ?? '').trim()
                            return (
                              <div key={g.id} className="py-2">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{g.name}</p>
                                {gewaehlte.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {gewaehlte.map((p) => {
                                      const m = state[p.id]?.menge ?? p.menge
                                      return (
                                        <div key={p.id} className="flex items-center gap-3">
                                          {thumb(p.bild_url, p.name)}
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                            <p className="text-[11px] text-gray-400">{m}× {p.einheit}</p>
                                          </div>
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shrink-0">
                                            <Check className="w-3 h-3" /> Gewählt
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-[13px] text-amber-700">
                                    <Package className="w-4 h-4 shrink-0 text-amber-400" /> Keine Option gewählt
                                  </div>
                                )}
                                {notiz && (
                                  <div className="mt-2 ml-[60px] pl-3 border-l-2 border-wellbeing-terracotta/30 flex items-start gap-1.5">
                                    <StickyNote className="w-3.5 h-3.5 text-wellbeing-terracotta/70 shrink-0 mt-0.5" />
                                    <p className="text-xs text-gray-500 italic leading-relaxed">&bdquo;{notiz}&ldquo;</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Einzelprodukte → Status + Menge + Kommentar */}
                          {b.produkte.filter((p) => state[p.id]).map((p) => {
                            const st = state[p.id]
                            const cfg = reviewStatus[st.status] ?? reviewStatus.ausstehend
                            const SIcon = cfg.Icon
                            const m = st.menge ?? p.menge
                            return (
                              <div key={p.id} className="py-2">
                                <div className="flex items-center gap-3">
                                  {thumb(p.bild_url, p.name)}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                    <p className="text-[11px] text-gray-400 truncate">
                                      {m}× {p.einheit}{p.kategorie ? ` · ${p.kategorie}` : ''}
                                    </p>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.pill}`}>
                                    <SIcon className="w-3 h-3" /> {cfg.text}
                                  </span>
                                </div>
                                {st.kommentar && (
                                  <div className="mt-1.5 ml-[60px] pl-3 border-l-2 border-wellbeing-terracotta/30">
                                    <p className="text-xs text-gray-500 italic leading-relaxed">&bdquo;{st.kommentar}&ldquo;</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {!alleEntschieden && (
            <div className="flex items-center justify-center gap-2 mt-5 text-sm text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 shrink-0" />
              {offenCount === 1 ? 'Es ist noch 1 Position offen' : `Es sind noch ${offenCount} Positionen offen`} — bitte erst alle entscheiden.
            </div>
          )}

          </div>{/* /linke Spalte */}

          {/* Desktop-Sidebar (sticky) */}
          <aside className="hidden lg:flex lg:flex-col gap-4 lg:sticky lg:top-6">
            {zusammenfassungBand}
            {kostenCard}
            <div className="bg-white ring-1 ring-gray-200 rounded-2xl p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setAbschlussModalOffen(true)}
                disabled={!alleEntschieden}
                style={{ backgroundColor: prim }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
              >
                Verbindlich absenden <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZeigeReview(false)}
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Zurück zum Bearbeiten
              </button>
              {!alleEntschieden && (
                <p className="text-[11px] text-amber-600 text-center mt-2">Bitte erst alle Positionen entscheiden.</p>
              )}
            </div>
          </aside>

          </div>{/* /grid */}
        </div>

        {/* Sticky Aktionsleiste — nur Mobile (Desktop nutzt die Sidebar) */}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 sm:px-5 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZeigeReview(false)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
            <div className="hidden sm:flex flex-1 items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{revFrei} freigegeben</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{revAend} Änderung</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{revAbl} abgelehnt</span>
            </div>
            <button
              type="button"
              onClick={() => setAbschlussModalOffen(true)}
              disabled={!alleEntschieden}
              style={{ backgroundColor: prim }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
            >
              Verbindlich absenden <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <FreigabeAbschlussModal
          isOpen={abschlussModalOffen}
          onClose={() => setAbschlussModalOffen(false)}
          onErfolg={() => { setAbschlussModalOffen(false); draftLeeren(); setLokalAbgeschlossen(true) }}
          token={token}
          projektName={projektName}
          scopeBeschreibung={scopeBeschreibung}
          gesamtCount={total}
          freigegebenCount={freigegebenCount}
          abgelehntCount={abgelehntCount}
          brandingPrim={prim}
          entscheidungen={entscheidungen}
          blockNotizen={blockNotizenCommit}
          vorschau={vorschau}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--brand-primary': prim, '--brand-bg': bg } as React.CSSProperties}>
      {branding?.custom_css && <style>{sauberesCss(branding.custom_css)}</style>}

      {vorschau && (
        <div className="sticky top-0 z-40 bg-amber-500 text-white text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 text-center">
          <Eye className="w-4 h-4 shrink-0" />
          Vorschau-Modus — nur zum Testen. Eingaben werden nicht gespeichert oder gesendet.
        </div>
      )}

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

        {/* Nachricht des Designers an den Kunden (Admin→Kunde, Migration 136) */}
        {begleitNachricht && begleitNachricht.trim() && (
          <div
            className="flex items-start gap-2.5 rounded-2xl px-5 py-4 mb-5 shadow-sm"
            style={{ backgroundColor: `${prim}14`, border: `1px solid ${prim}33` }}
          >
            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" style={{ color: prim }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: prim }}>
                Nachricht von {firmenname}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">{begleitNachricht}</p>
            </div>
          </div>
        )}

        {/* Entwurf-Hinweis: nichts wird gesendet, bis final abgesendet wird */}
        <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 mb-5 text-xs leading-relaxed">
          <span className="mt-0.5">✎</span>
          <span>
            Ihre Auswahl wird <strong>noch nicht gesendet</strong>. Sie können alles in Ruhe ändern — erst mit
            &bdquo;Freigabe prüfen → Verbindlich absenden&ldquo; geht es an {firmenname}.
          </span>
        </div>

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

        {/* Scroll-Anker: bei Raum-/Bereich-Wechsel hierher hochscrollen */}
        <div ref={navTopRef} className="scroll-mt-24" aria-hidden />

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
                {gruppen.map((g) => g.ist_bundle ? (
                  <BundleKarte
                    key={g.id}
                    bundle={g}
                    states={state}
                    isPending={isPending}
                    mwst={mwst}
                    prim={prim}
                    onSetStatus={(status, kommentar) => {
                      for (const p of g.produkte) speichereStatus(p.id, status, kommentar)
                    }}
                  />
                ) : (
                  <ProduktGruppeKarte
                    key={g.id}
                    gruppe={g}
                    states={state}
                    isPending={isPending}
                    mwst={mwst}
                    prim={prim}
                    notiz={blockNotizen[g.id] ?? ''}
                    onToggle={(id) => toggleBlockMember(id)}
                    onMenge={(id, n) => setMenge(id, n)}
                    onNotiz={(t) => setBlockNotiz(g.id, t)}
                  />
                ))}
                {/* Lose Produkte einer Gruppe: EINE kompakte Liste (Checkbox-Stil), klar von
                    den Auswahl-Blöcken („mehrere möglich") als Gruppe abgegrenzt. */}
                {aktiveProdukte.length > 0 && (
                  <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900">Einzelne Produkte</h3>
                      </div>
                      <p className="text-[12px] text-gray-500 mt-0.5">Bitte jedes Produkt einzeln freigeben oder ablehnen.</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {aktiveProdukte.map((p) => (
                        <ProduktZeile
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
                          onMengeChange={(n) => setMenge(p.id, n)}
                        />
                      ))}
                    </div>
                  </div>
                )}
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
                <h3 className="text-base font-semibold text-gray-900 mb-1">Alles entschieden</h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Sie haben alle {total} Positionen entschieden ({freigegebenCount} freigegeben, {abgelehntCount} abgelehnt/Änderung).
                  Im nächsten Schritt sehen Sie eine <strong>Übersicht zum Prüfen</strong> — gesendet wird erst danach.
                </p>
                <button
                  onClick={() => setZeigeReview(true)}
                  style={{ backgroundColor: prim }}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  Freigabe prüfen →
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Noch {offenCount} offen</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Bitte entscheiden Sie zu jedem Produkt (Freigeben, Ablehnen oder Alternative),
                  danach können Sie alles prüfen und absenden.
                </p>
              </>
            )}
          </div>
        )}

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
  onMengeChange: (n: number) => void
}

// Kompakte Produktzeile (lose Produkte / Gruppen). Checkbox = freigeben;
// „Ablehnen"/„Alternative" bleiben als kompakte Aktion pro Zeile mit Kommentarfeld.
// Props + Handler IDENTISCH zur früheren ProduktKarte → Status-/Gate-/Review-Logik unverändert.
function ProduktZeile({
  produkt, produktState, isPending, mwst,
  onFreigeben, onAktionWaehlen, onKommentarChange, onSpeichern, onAbbrechen, onMengeChange,
}: ProduktKarteProps) {
  const { status, aktiveAktion, kommentarEingabe, kommentar } = produktState
  const menge = produktState.menge ?? produkt.menge
  const [bildGross, setBildGross] = useState(false)
  const [detailOffen, setDetailOffen] = useState(false)

  const vpBrutto     = r2((produkt.verkaufspreis ?? 0) * (1 + mwst))
  const gesamtBrutto = r2(vpBrutto * menge)
  const istFrei = status === 'freigegeben'

  const tint =
    status === 'freigegeben'    ? 'bg-emerald-50/50'
      : status === 'abgelehnt'      ? 'bg-red-50/40'
      : status === 'ueberarbeitung' ? 'bg-amber-50/40'
      : ''
  const statusBadge =
    status === 'freigegeben'    ? { cls: 'bg-emerald-100 text-emerald-700', label: 'Freigegeben' }
      : status === 'abgelehnt'      ? { cls: 'bg-red-100 text-red-600',         label: 'Abgelehnt' }
      : status === 'ueberarbeitung' ? { cls: 'bg-amber-100 text-amber-700',     label: 'Änderung gewünscht' }
      : null

  return (
    <div className={`px-4 py-3.5 transition-colors ${tint}`}>
      <div className="flex items-start gap-3">
        {/* Thumbnail (klickbar → Vorschau) */}
        <button
          type="button"
          disabled={!produkt.bild_url}
          onClick={() => produkt.bild_url && setBildGross(true)}
          aria-label="Bild vergrößern"
          className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative group cursor-zoom-in disabled:cursor-default"
        >
          {produkt.bild_url ? (
            <>
              <Image src={produkt.bild_url} alt={produkt.name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
                <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
          )}
        </button>

        {/* Checkbox (= freigeben) + Infos */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => (istFrei ? onSpeichern('ausstehend') : onFreigeben())}
          aria-pressed={istFrei}
          title={istFrei ? 'Freigabe zurücknehmen' : 'Freigeben'}
          className="flex items-start gap-2.5 flex-1 min-w-0 text-left disabled:opacity-60"
        >
          <span className={`inline-flex items-center gap-1 shrink-0 mt-0.5 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${istFrei ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-gray-600 bg-white hover:border-emerald-300'}`}>
            {istFrei && <Check className="w-3 h-3" />}
            {istFrei ? 'Freigegeben' : 'Freigeben'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{produkt.name}</span>
              {statusBadge && status !== 'freigegeben' && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {produkt.kategorie ? `${produkt.kategorie} · ` : ''}Geplant: <span className="font-medium text-gray-600">{produkt.menge} {produkt.einheit}</span>
            </div>
          </div>
        </button>

        {/* Preis */}
        <div className="text-right shrink-0">
          {produkt.verkaufspreis != null ? (
            <>
              <p className="text-sm font-mono font-semibold text-gray-900">{eur(gesamtBrutto)}</p>
              <p className="text-[10px] text-gray-400">{menge > 1 ? `${menge}× · ` : ''}inkl. MwSt</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">auf Anfrage</p>
          )}
        </div>
      </div>

      {/* Hinweis vom Designer */}
      {produkt.hinweis && (
        <div className="mt-2 pl-8"><HinweisBanner text={produkt.hinweis} /></div>
      )}

      {/* Beschreibung (einklappbar, kompakt) */}
      {produkt.beschreibung && (
        <button type="button" onClick={() => setDetailOffen((v) => !v)} className="w-full text-left mt-2 pl-8">
          <div className={`text-xs text-gray-500 leading-relaxed overflow-hidden ${detailOffen ? '' : 'line-clamp-2'}`}>{produkt.beschreibung}</div>
          {produkt.beschreibung.length > 120 && (
            <span className="text-[11px] text-wellbeing-green inline-flex items-center gap-0.5 mt-0.5">
              {detailOffen ? 'Weniger' : 'Mehr'}
              <ChevronDown className={`w-3 h-3 transition-transform ${detailOffen ? 'rotate-180' : ''}`} />
            </span>
          )}
        </button>
      )}

      {/* Untere Zeile: Produktlink + Menge (wenn freigegeben) */}
      {(produkt.produkt_url || istFrei) && (
        <div className="flex items-center justify-between gap-3 mt-2.5 pl-8">
          {produkt.produkt_url ? (
            <a href={produkt.produkt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:underline">
              <ExternalLink className="w-3 h-3" /> Produktlink
            </a>
          ) : <span />}
          {istFrei && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Menge</span>
              <MengeStepper menge={menge} disabled={isPending} onChange={onMengeChange} />
              <span className="text-[11px] text-gray-400">{produkt.einheit}</span>
            </div>
          )}
        </div>
      )}

      {/* Aktionen: Ablehnen / Alternative (kompakt) ODER Kommentarfeld */}
      {!aktiveAktion ? (
        <div className="flex items-center gap-4 mt-2.5 pl-8 flex-wrap">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAktionWaehlen('ablehnen')}
            className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${status === 'abgelehnt' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
          >
            <X className="w-3 h-3" /> Ablehnen
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAktionWaehlen('alternative')}
            className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${status === 'ueberarbeitung' ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'}`}
          >
            <RefreshCw className="w-3 h-3" /> Alternative
          </button>
          {kommentar && (status === 'abgelehnt' || status === 'ueberarbeitung') && (
            <span className="text-[11px] text-gray-500 italic truncate min-w-0">„{kommentar}“</span>
          )}
        </div>
      ) : (
        <div className="mt-2.5 pl-8 space-y-2">
          <label className="block text-[11px] font-semibold text-gray-600">
            {aktiveAktion === 'ablehnen' ? 'Grund für Ablehnung (optional)' : 'Was wünschen Sie stattdessen?'}
          </label>
          <textarea
            autoFocus
            rows={2}
            value={kommentarEingabe}
            onChange={(e) => onKommentarChange(e.target.value)}
            placeholder={aktiveAktion === 'ablehnen' ? 'z. B. Farbe passt nicht…' : 'z. B. Bitte Alternative in Weiß…'}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onSpeichern(aktiveAktion === 'ablehnen' ? 'abgelehnt' : 'ueberarbeitung')}
              disabled={isPending}
              className="px-3 py-1.5 text-[11px] font-semibold bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isPending ? 'Speichern…' : 'Bestätigen'}
            </button>
            <button
              onClick={onAbbrechen}
              disabled={isPending}
              className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {bildGross && produkt.bild_url && (
        <BildLightbox src={produkt.bild_url} alt={produkt.name} onClose={() => setBildGross(false)} />
      )}
    </div>
  )
}

// ── Set/Bundle-Karte (Migration 128, Phase 2) — EINE Karte, all-or-nothing ──
function BundleKarte({
  bundle, states, isPending, mwst, prim, onSetStatus,
}: {
  bundle: FreigabeProduktGruppe
  states: Record<string, ProduktState>
  isPending: boolean
  mwst: number
  prim: string
  onSetStatus: (status: ProduktStatus, kommentar: string) => void
}) {
  const [offen, setOffen] = useState(false)
  const [aktiveAktion, setAktiveAktion] = useState<'ablehnen' | 'alternative' | null>(null)
  const [kommentarEingabe, setKommentarEingabe] = useState('')

  const statusOf = (id: string): ProduktStatus => states[id]?.status ?? 'ausstehend'
  // `komp` = ALLE zugrunde liegenden raum_produkte-Zeilen → Status/Submit (all-or-nothing).
  const komp = bundle.produkte
  const alleFrei = komp.length > 0 && komp.every((p) => statusOf(p.id) === 'freigegeben')
  const anyAbl   = komp.some((p) => statusOf(p.id) === 'abgelehnt')
  const anyAend  = komp.some((p) => statusOf(p.id) === 'ueberarbeitung')
  const setStatus: ProduktStatus = alleFrei ? 'freigegeben' : anyAbl ? 'abgelehnt' : anyAend ? 'ueberarbeitung' : 'ausstehend'
  // `anzeige` = pro produkt_id zusammengefasste Komponenten (Set kann seit Mig 134
  // mehrfach im Raum liegen) → NUR Darstellung (Liste/Anzahl/Preis), nicht der Status.
  const anzeige = bundle.bundle_komponenten_anzeige ?? dedupeBundleKomponenten(bundle.produkte)
  const instanzen = bundle.bundle_instanz_anzahl ?? 1

  const statusCfg = {
    ausstehend:     { rand: 'border-gray-200',    bg: 'bg-white',         badgeCls: 'bg-gray-100 text-gray-500',       label: 'Ausstehend' },
    freigegeben:    { rand: 'border-emerald-200', bg: 'bg-emerald-50/40', badgeCls: 'bg-emerald-100 text-emerald-700', label: 'Freigegeben' },
    abgelehnt:      { rand: 'border-red-200',     bg: 'bg-red-50/40',     badgeCls: 'bg-red-100 text-red-600',         label: 'Abgelehnt' },
    ueberarbeitung: { rand: 'border-amber-200',   bg: 'bg-amber-50/40',   badgeCls: 'bg-amber-100 text-amber-700',     label: 'Änderung' },
  }
  const cfg = statusCfg[setStatus] ?? statusCfg.ausstehend

  const setNetto  = bundle.bundle_set_preis_netto ?? anzeige.reduce((s, k) => s + (k.verkaufspreis ?? 0) * k.menge, 0)
  const setBrutto = r2(setNetto * (1 + mwst))
  const vorhandenerKommentar = states[komp[0]?.id]?.kommentar || null

  const bestaetigeKommentar = () => {
    onSetStatus(aktiveAktion === 'ablehnen' ? 'abgelehnt' : 'ueberarbeitung', kommentarEingabe)
    setAktiveAktion(null)
    setKommentarEingabe('')
  }

  const tint =
    setStatus === 'freigegeben'    ? 'bg-emerald-50/50'
      : setStatus === 'abgelehnt'      ? 'bg-red-50/40'
      : setStatus === 'ueberarbeitung' ? 'bg-amber-50/40'
      : ''

  return (
    <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className={`px-4 py-3.5 transition-colors ${tint}`}>
        {/* Kopf: Checkbox (= Set freigeben, all-or-nothing) + Set-Badge + Name + Status + Preis */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => (alleFrei ? onSetStatus('ausstehend', '') : onSetStatus('freigegeben', ''))}
            aria-pressed={alleFrei}
            title={alleFrei ? 'Set-Freigabe zurücknehmen' : 'Set freigeben'}
            className="flex items-start gap-2.5 flex-1 min-w-0 text-left disabled:opacity-60"
          >
            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${alleFrei ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
              {alleFrei && <Check className="w-3 h-3 text-white" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: prim }}>
                  <Boxes className="w-3 h-3" /> Set
                </span>
                <span className="text-sm font-semibold text-gray-900">{bundle.name}</span>
                {setStatus !== 'ausstehend' && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badgeCls}`}>{cfg.label}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{anzeige.length} Komponenten · komplett als Set{instanzen > 1 ? ` · ${instanzen}× hinzugefügt` : ''}</p>
            </div>
          </button>
          <div className="text-right shrink-0">
            <p className="text-sm font-mono font-semibold text-gray-900">{eur(setBrutto)}</p>
            <p className="text-[10px] text-gray-400">Set · inkl. MwSt</p>
          </div>
        </div>

        {/* Komponenten (ausklappbar) */}
        <div className="mt-2.5 pl-8">
          <button type="button" onClick={() => setOffen((v) => !v)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${offen ? 'rotate-180' : ''}`} /> Was ist enthalten? ({anzeige.length})
          </button>
          {offen && (
            <>
              <div className="grid grid-cols-2 gap-2 mt-2 bg-gray-50 rounded-xl px-3 py-2">
                <PreisZeile label="Set netto" wert={eur(setNetto)} />
                <PreisZeile label="Set brutto" wert={eur(setBrutto)} hervorheben />
              </div>
              <ul className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {anzeige.map((k) => {
                  const zeileBrutto = r2((k.verkaufspreis ?? 0) * (1 + mwst) * k.menge)
                  return (
                    <li key={k.produkt_id} className="flex items-center gap-3 px-3 py-2 bg-white">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {k.bild_url && <Image src={k.bild_url} alt="" width={36} height={36} className="w-full h-full object-cover" unoptimized />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 truncate">{k.name}</p>
                        <p className="text-[10px] text-gray-400">{k.menge} {k.einheit}</p>
                      </div>
                      <span className="text-[11px] font-mono text-gray-600">{eur(zeileBrutto)}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {/* Aktionen: Ablehnen / Alternative (kompakt) ODER Kommentarfeld */}
        {!aktiveAktion ? (
          <div className="flex items-center gap-4 mt-2.5 pl-8 flex-wrap">
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setAktiveAktion('ablehnen'); setKommentarEingabe(vorhandenerKommentar ?? '') }}
              className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${setStatus === 'abgelehnt' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
            >
              <X className="w-3 h-3" /> Ablehnen
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setAktiveAktion('alternative'); setKommentarEingabe(vorhandenerKommentar ?? '') }}
              className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${setStatus === 'ueberarbeitung' ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'}`}
            >
              <RefreshCw className="w-3 h-3" /> Alternative
            </button>
            {vorhandenerKommentar && (setStatus === 'abgelehnt' || setStatus === 'ueberarbeitung') && (
              <span className="text-[11px] text-gray-500 italic truncate min-w-0">„{vorhandenerKommentar}“</span>
            )}
          </div>
        ) : (
          <div className="mt-2.5 pl-8 space-y-2">
            <label className="block text-[11px] font-semibold text-gray-600">
              {aktiveAktion === 'ablehnen' ? 'Grund für Ablehnung (optional)' : 'Was wünschen Sie stattdessen?'}
            </label>
            <textarea autoFocus rows={2} value={kommentarEingabe} onChange={(e) => setKommentarEingabe(e.target.value)}
              placeholder={aktiveAktion === 'ablehnen' ? 'z. B. Set passt nicht…' : 'z. B. Bitte andere Komponenten…'}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition resize-none" />
            <div className="flex gap-2">
              <button onClick={bestaetigeKommentar} disabled={isPending}
                className="px-3 py-1.5 text-[11px] font-semibold bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors">
                {isPending ? 'Speichern…' : 'Bestätigen'}
              </button>
              <button onClick={() => { setAktiveAktion(null); setKommentarEingabe('') }} disabled={isPending}
                className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
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

// ── Mengen-Stepper (−/Eingabe/+) ──────────────────────────────
function MengeStepper({ menge, disabled, onChange }: { menge: number; disabled?: boolean; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden shrink-0">
      <button
        type="button"
        disabled={disabled || menge <= 1}
        onClick={() => onChange(menge - 1)}
        aria-label="Menge verringern"
        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        min={1}
        value={menge}
        disabled={disabled}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 1)}
        aria-label="Menge"
        className="w-10 h-8 text-center text-sm font-semibold text-gray-900 border-x border-gray-200 focus:outline-none focus:bg-wellbeing-green/5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(menge + 1)}
        aria-label="Menge erhöhen"
        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Auswahl-Block-Karte (Mehrfachauswahl + Wunsch-Menge + Sammelnotiz) ──
interface ProduktGruppeKarteProps {
  gruppe: FreigabeProduktGruppe
  states: Record<string, ProduktState>
  isPending: boolean
  mwst: number
  prim: string
  notiz: string
  onToggle: (id: string) => void
  onMenge: (id: string, n: number) => void
  onNotiz: (text: string) => void
}

function ProduktGruppeKarte({ gruppe, states, isPending, mwst, prim, notiz, onToggle, onMenge, onNotiz }: ProduktGruppeKarteProps) {
  const gewaehlteCount = gruppe.produkte.filter((p) => states[p.id]?.kundeFavorit).length
  const [lightboxBild, setLightboxBild] = useState<{ src: string; alt: string } | null>(null)

  return (
    <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm" style={{ borderLeftWidth: '4px', borderLeftColor: prim }}>
      <div className="px-5 py-3" style={{ backgroundColor: `${prim}0d`, borderBottom: `1px solid ${prim}22` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: prim }}>
              <ListChecks className="w-3 h-3" /> Auswahl
            </span>
            <h3 className="text-sm font-semibold text-gray-900 mt-1">{gruppe.name}</h3>
          </div>
          {gruppe.produkte.length > 1 && (
            <span className="text-[11px] font-medium shrink-0 mt-0.5" style={{ color: prim }}>Mehrere möglich</span>
          )}
        </div>
        <p className="text-[12px] font-medium mt-1" style={{ color: prim }}>
          {gruppe.produkte.length > 1 ? 'Bitte wählen Sie eine oder mehrere Varianten.' : 'Bitte bestätigen Sie Ihre Wahl.'}
        </p>
        {gruppe.beschreibung && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{gruppe.beschreibung}</p>}
      </div>

      <div className="divide-y divide-gray-100">
        {gruppe.produkte.map((p) => {
          const istGewaehlt = !!states[p.id]?.kundeFavorit
          const menge = states[p.id]?.menge ?? p.menge
          const vpBrutto = r2((p.verkaufspreis ?? 0) * (1 + mwst))
          const gesamtBrutto = r2(vpBrutto * menge)
          return (
            <div key={p.id} className={`px-4 py-3.5 transition-colors ${istGewaehlt ? 'bg-emerald-50/50' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Thumbnail (klickbar → Vorschau) */}
                <button
                  type="button"
                  disabled={!p.bild_url}
                  onClick={() => p.bild_url && setLightboxBild({ src: p.bild_url, alt: p.name })}
                  aria-label="Bild vergrößern"
                  className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative group cursor-zoom-in disabled:cursor-default"
                >
                  {p.bild_url ? (
                    <>
                      <Image src={p.bild_url} alt={p.name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
                        <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
                  )}
                </button>
                {/* Auswahl-Bereich (Checkbox + Infos) */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onToggle(p.id)}
                  aria-pressed={istGewaehlt}
                  className="flex items-start gap-2.5 flex-1 min-w-0 text-left disabled:opacity-60"
                >
                  {/* Checkbox */}
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${istGewaehlt ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                    {istGewaehlt && <Check className="w-3 h-3 text-white" />}
                  </span>
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
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Gewählt</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.kategorie ? `${p.kategorie} · ` : ''}Geplant: <span className="font-medium text-gray-600">{p.menge} {p.einheit}</span>
                    </div>
                  </div>
                </button>
                {/* Preis */}
                <div className="text-right shrink-0">
                  {p.verkaufspreis != null ? (
                    <>
                      <p className="text-sm font-mono font-semibold text-gray-900">{eur(gesamtBrutto)}</p>
                      <p className="text-[10px] text-gray-400">{menge > 1 ? `${menge}× · ` : ''}inkl. MwSt</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">auf Anfrage</p>
                  )}
                </div>
              </div>

              {/* Untere Zeile: Produktlink + Mengen-Stepper (wenn gewählt) */}
              {(p.produkt_url || istGewaehlt) && (
                <div className="flex items-center justify-between gap-3 mt-2.5 pl-8">
                  {p.produkt_url ? (
                    <a href={p.produkt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:underline">
                      <ExternalLink className="w-3 h-3" /> Produktlink
                    </a>
                  ) : <span />}
                  {istGewaehlt && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">Menge</span>
                      <MengeStepper menge={menge} disabled={isPending} onChange={(n) => onMenge(p.id, n)} />
                      <span className="text-[11px] text-gray-400">{p.einheit}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sammelnotiz für den ganzen Block */}
      <div className="px-5 py-3 border-t border-gray-100">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          <StickyNote className="w-3.5 h-3.5" /> Notiz zu dieser Auswahl <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={notiz}
          disabled={isPending}
          onChange={(e) => onNotiz(e.target.value)}
          placeholder="z. B. „Bitte 2× das graue und 1× das blaue Kissen.“"
          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition resize-none"
        />
      </div>

      <div className={`px-5 py-2.5 border-t text-xs ${gewaehlteCount > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
        {gewaehlteCount > 0
          ? (gruppe.produkte.length > 1
              ? <>{gewaehlteCount} von {gruppe.produkte.length} gewählt. Sie können mehrere wählen und die Mengen anpassen.</>
              : <>Gewählt. Menge bei Bedarf anpassen.</>)
          : (gruppe.produkte.length > 1
              ? <>Noch nichts gewählt — bitte mindestens eine Option auswählen.</>
              : <>Noch nicht gewählt — bitte bestätigen.</>)}
      </div>

      {lightboxBild && (
        <BildLightbox src={lightboxBild.src} alt={lightboxBild.alt} onClose={() => setLightboxBild(null)} />
      )}
    </div>
  )
}
