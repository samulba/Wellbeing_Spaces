'use client'

import { useState, useTransition } from 'react'
import {
  Plus, FileText, ChevronDown, Eye, Trash2, CheckCircle,
  Send, XCircle, Clock, PenLine, Download, Link2, Copy, Check,
  PenSquare, AlertCircle, ShieldCheck, Archive, Ban, Flag,
} from 'lucide-react'
import type { Vertrag, VertragStatus, VertragsVorlage } from '@/lib/supabase/types'
import { vertragErstellen, vertragStatusAendern, vertragLoeschen } from '@/app/actions/vertraege'
import { signaturTokenErstellen, firmaUnterschreiben } from '@/app/actions/signatur'
import SignaturCanvas from '@/components/SignaturCanvas'
import VertragMeilensteineModal from '@/components/VertragMeilensteineModal'

// ── Status-Konfiguration ──────────────────────────────────────

const statusConfig: Record<VertragStatus, { label: string; farbe: string; Icon: React.FC<{ className?: string }> }> = {
  entwurf:               { label: 'Entwurf',              farbe: 'bg-gray-100 text-gray-600',     Icon: PenLine },
  gesendet:              { label: 'Gesendet',             farbe: 'bg-blue-50 text-blue-700',      Icon: Send },
  zur_unterschrift:      { label: 'Zur Unterschrift',     farbe: 'bg-purple-50 text-purple-700',  Icon: PenSquare },
  unterschrieben_kunde:  { label: 'Sign. Kunde',          farbe: 'bg-amber-50 text-amber-700',    Icon: CheckCircle },
  kunde_unterschrieben:  { label: 'Sign. Kunde',          farbe: 'bg-amber-50 text-amber-700',    Icon: CheckCircle },
  unterschrieben_beide:  { label: 'Unterschrieben',       farbe: 'bg-green-50 text-green-700',    Icon: CheckCircle },
  aktiv:                 { label: 'Aktiv',                farbe: 'bg-green-100 text-green-800',   Icon: ShieldCheck },
  abgeschlossen:         { label: 'Abgeschlossen',        farbe: 'bg-gray-100 text-gray-600',     Icon: Archive },
  abgelaufen:            { label: 'Abgelaufen',           farbe: 'bg-gray-100 text-gray-500',     Icon: Clock },
  storniert:             { label: 'Storniert',            farbe: 'bg-red-50 text-red-600',        Icon: XCircle },
  gekuendigt:            { label: 'Gekündigt',            farbe: 'bg-red-100 text-red-700',       Icon: Ban },
}

const STATUS_REIHENFOLGE: VertragStatus[] = [
  'entwurf', 'gesendet', 'zur_unterschrift',
  'unterschrieben_kunde', 'aktiv', 'abgeschlossen', 'abgelaufen', 'storniert', 'gekuendigt',
]

// ── Vertrag-Vorschau Modal ────────────────────────────────────

function VorschauModal({ vertrag, onClose }: { vertrag: Vertrag; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{vertrag.titel}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Vorschau · HTML-Inhalt</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Schließen
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: vertrag.inhalt_html }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Neue Vertrag Modal ────────────────────────────────────────

function NeuerVertragModal({
  vorlagen,
  onErstellen,
  onClose,
}: {
  vorlagen: VertragsVorlage[]
  onErstellen: (vorlageId: string) => void
  onClose: () => void
}) {
  const [gewaehlt, setGewaehlt] = useState(vorlagen[0]?.id ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Vertrag aus Vorlage erstellen</h3>
          <p className="text-xs text-gray-400 mt-0.5">Platzhalter werden automatisch mit Projektdaten befüllt.</p>
        </div>
        <div className="px-6 py-4 space-y-3">
          {vorlagen.length === 0 ? (
            <p className="text-xs text-gray-400">Noch keine Vorlagen vorhanden. Bitte zuerst unter Einstellungen → Vorlagen eine Vorlage anlegen.</p>
          ) : (
            <div className="space-y-2">
              {vorlagen.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    gewaehlt === v.id
                      ? 'border-wellbeing-green bg-wellbeing-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="vorlage"
                    value={v.id}
                    checked={gewaehlt === v.id}
                    onChange={() => setGewaehlt(v.id)}
                    className="mt-0.5 accent-wellbeing-green"
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{v.name}</p>
                    {v.beschreibung && <p className="text-[11px] text-gray-400 mt-0.5">{v.beschreibung}</p>}
                    {v.kategorie && (
                      <span className="text-[10px] text-gray-500 capitalize">{v.kategorie.replace('_', ' ')}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors">
            Abbrechen
          </button>
          {vorlagen.length > 0 && (
            <button
              type="button"
              onClick={() => onErstellen(gewaehlt)}
              className="px-4 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
            >
              Erstellen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Signatur-Link Modal ───────────────────────────────────────

function SignaturLinkModal({
  vertrag,
  onClose,
  onTokenErstellt,
}: {
  vertrag: Vertrag
  onClose: () => void
  onTokenErstellt: (id: string, token: string) => void
}) {
  const [token, setToken] = useState(vertrag.signatur_token ?? '')
  const [kopiert, setKopiert] = useState(false)
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const link = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/vertrag/${token}`
    : ''

  function handleTokenErstellen() {
    setFehler(null)
    setLaden(true)
    startTransition(async () => {
      const res = await signaturTokenErstellen(vertrag.id)
      setLaden(false)
      if (res.fehler) { setFehler(res.fehler); return }
      if (res.token) {
        setToken(res.token)
        onTokenErstellt(vertrag.id, res.token)
      }
    })
  }

  function handleKopieren() {
    navigator.clipboard.writeText(link)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  const signaturStatus = (() => {
    if (vertrag.signatur_kunde_datum && vertrag.signatur_firma_datum) return 'beide'
    if (vertrag.signatur_kunde_datum) return 'nur_kunde'
    if (vertrag.signatur_firma_datum) return 'nur_firma'
    return 'keine'
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Signatur-Link</h3>
          <p className="text-xs text-gray-400 mt-0.5">{vertrag.titel}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Unterschriften-Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 border ${vertrag.signatur_kunde_datum ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-[11px] text-gray-500 mb-0.5">Kunde</p>
              <p className={`text-xs font-medium ${vertrag.signatur_kunde_datum ? 'text-green-700' : 'text-gray-400'}`}>
                {vertrag.signatur_kunde_datum
                  ? `Unterschrieben ${new Date(vertrag.signatur_kunde_datum).toLocaleDateString('de-DE')}`
                  : 'Noch ausstehend'}
              </p>
            </div>
            <div className={`rounded-xl p-3 border ${vertrag.signatur_firma_datum ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-[11px] text-gray-500 mb-0.5">Firma</p>
              <p className={`text-xs font-medium ${vertrag.signatur_firma_datum ? 'text-green-700' : 'text-gray-400'}`}>
                {vertrag.signatur_firma_datum
                  ? `Unterschrieben ${new Date(vertrag.signatur_firma_datum).toLocaleDateString('de-DE')}`
                  : 'Noch ausstehend'}
              </p>
            </div>
          </div>

          {signaturStatus === 'beide' && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              Beide Parteien haben unterschrieben.
            </div>
          )}

          {/* Link */}
          {!vertrag.signatur_kunde_datum && (
            <>
              {token ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Diesen Link mit dem Kunden teilen:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate">
                      {link}
                    </div>
                    <button
                      type="button"
                      onClick={handleKopieren}
                      className="shrink-0 p-2 text-gray-400 hover:text-wellbeing-green hover:bg-gray-100 rounded-lg transition-colors"
                      title="Link kopieren"
                    >
                      {kopiert ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleTokenErstellen}
                    disabled={laden}
                    className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Neuen Link generieren
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Generieren Sie einen Link für die digitale Unterschrift des Kunden (gültig 30 Tage).</p>
                  {fehler && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {fehler}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleTokenErstellen}
                    disabled={laden}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {laden ? 'Wird erstellt…' : 'Signatur-Link erstellen'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors">
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Firma-Signatur Modal ───────────────────────────────────────

function FirmaSignaturModal({
  vertrag,
  onUnterschrieben,
  onClose,
}: {
  vertrag: Vertrag
  onUnterschrieben: (id: string) => void
  onClose: () => void
}) {
  const [signatur, setSignatur] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleUnterschreiben() {
    if (!signatur) { setFehler('Bitte zuerst unterschreiben.'); return }
    setFehler(null)
    startTransition(async () => {
      const res = await firmaUnterschreiben(vertrag.id, signatur)
      if (res.fehler) { setFehler(res.fehler); return }
      onUnterschrieben(vertrag.id)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Als Firma unterschreiben</h3>
          <p className="text-xs text-gray-400 mt-0.5">{vertrag.titel}</p>
        </div>
        <div className="px-6 py-5">
          <SignaturCanvas onExport={setSignatur} />
          {fehler && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              {fehler}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleUnterschreiben}
            disabled={!signatur}
            className="px-4 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors"
          >
            Unterschrift speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────

interface Props {
  projektId: string
  kundeId: string
  initialVertraege: Vertrag[]
  vorlagen: VertragsVorlage[]
}

export default function VertraegeClient({ projektId, kundeId, initialVertraege, vorlagen }: Props) {
  const [vertraege, setVertraege] = useState(initialVertraege)
  const [neuerVertragOffen, setNeuerVertragOffen] = useState(false)
  const [vorschau, setVorschau] = useState<Vertrag | null>(null)
  const [signaturLink, setSignaturLink] = useState<Vertrag | null>(null)
  const [meilensteineFuer, setMeilensteineFuer] = useState<Vertrag | null>(null)
  const [firmaSignatur, setFirmaSignatur] = useState<Vertrag | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleErstellen(vorlageId: string) {
    setFehler(null)
    setNeuerVertragOffen(false)
    startTransition(async () => {
      const res = await vertragErstellen(vorlageId, projektId, kundeId)
      if (res.fehler) { setFehler(res.fehler); return }

      const vorlage = vorlagen.find((v) => v.id === vorlageId)
      const neu: Vertrag = {
        id: res.id ?? crypto.randomUUID(),
        organisation_id: '',
        vorlage_id: vorlageId,
        projekt_id: projektId,
        kunde_id: kundeId,
        titel: vorlage?.name ?? 'Vertrag',
        inhalt_html: '',
        pdf_url: null,
        status: 'entwurf',
        signatur_kunde_url: null,
        signatur_kunde_datum: null,
        signatur_firma_url: null,
        signatur_firma_datum: null,
        signatur_token: null,
        signatur_token_gueltig: null,
        gesamtwert: null,
        gueltig_bis: null,
        angebot_id: null,
        vertragsnummer: null,
        vertragstyp: 'einzelauftrag',
        version: 1,
        startdatum: null,
        enddatum: null,
        kuendigungsfrist: null,
        gewaehrleistung_monate: 24,
        interne_notizen: null,
        erstellt_von: null,
        gesendet_am: null,
        kunde_unterschrift_ip: null,
        kunde_unterschrift_name: null,
        firma_unterschrift_von: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setVertraege((prev) => [neu, ...prev])
    })
  }

  function handleStatusAendern(id: string, status: VertragStatus) {
    startTransition(async () => {
      const res = await vertragStatusAendern(id, status, projektId)
      if (!res.fehler) setVertraege((prev) => prev.map((v) => v.id === id ? { ...v, status } : v))
    })
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await vertragLoeschen(id, projektId)
      if (!res.fehler) setVertraege((prev) => prev.filter((v) => v.id !== id))
    })
  }

  function handleTokenErstellt(id: string, token: string) {
    setVertraege((prev) => prev.map((v) =>
      v.id === id ? { ...v, signatur_token: token, status: 'gesendet' } : v
    ))
  }

  function handleFirmaUnterschrieben(id: string) {
    const now = new Date().toISOString()
    setVertraege((prev) => prev.map((v) => {
      if (v.id !== id) return v
      const neuerStatus: VertragStatus = v.signatur_kunde_datum ? 'unterschrieben_beide' : v.status
      return { ...v, signatur_firma_datum: now, status: neuerStatus }
    }))
  }

  return (
    <>
      {/* Fehler */}
      {fehler && <p className="mb-4 text-xs text-red-500">{fehler}</p>}

      {/* Header-Aktion */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{vertraege.length} {vertraege.length === 1 ? 'Vertrag' : 'Verträge'}</p>
        <button
          type="button"
          onClick={() => setNeuerVertragOffen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Vertrag erstellen
        </button>
      </div>

      {/* Liste */}
      {vertraege.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
          <FileText className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Noch keine Verträge für dieses Projekt.</p>
          <button
            type="button"
            onClick={() => setNeuerVertragOffen(true)}
            className="mt-4 inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Ersten Vertrag erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {vertraege.map((v) => {
            const { label, farbe, Icon } = statusConfig[v.status]
            return (
              <div
                key={v.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{v.titel}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(v.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {v.gueltig_bis && ` · Gültig bis ${new Date(v.gueltig_bis + 'T00:00:00').toLocaleDateString('de-DE')}`}
                    {v.gesamtwert && ` · ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v.gesamtwert)}`}
                  </p>
                </div>

                {/* Status Badge + Dropdown */}
                <div className="relative shrink-0">
                  <div className="group/status relative">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${farbe} transition-all`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    <div className="hidden group-hover/status:block absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                      {STATUS_REIHENFOLGE.filter((s) => s !== v.status).map((s) => {
                        const cfg = statusConfig[s]
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleStatusAendern(v.id, s)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <cfg.Icon className="w-3.5 h-3.5 text-gray-400" />
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setVorschau(v)}
                    title="Vorschau"
                    className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeilensteineFuer(v)}
                    title="Meilensteine"
                    className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignaturLink(v)}
                    title="Signatur-Link"
                    className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  {!v.signatur_firma_datum && (
                    <button
                      type="button"
                      onClick={() => setFirmaSignatur(v)}
                      title="Als Firma unterschreiben"
                      className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-gray-50 rounded-lg transition-all"
                    >
                      <PenSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <a
                    href={`/api/vertraege/${v.id}/pdf`}
                    download
                    title="PDF herunterladen"
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleLoeschen(v.id)}
                    title="Löschen"
                    className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {neuerVertragOffen && (
        <NeuerVertragModal
          vorlagen={vorlagen}
          onErstellen={handleErstellen}
          onClose={() => setNeuerVertragOffen(false)}
        />
      )}
      {vorschau && (
        <VorschauModal vertrag={vorschau} onClose={() => setVorschau(null)} />
      )}
      {signaturLink && (
        <SignaturLinkModal
          vertrag={signaturLink}
          onTokenErstellt={handleTokenErstellt}
          onClose={() => setSignaturLink(null)}
        />
      )}
      {firmaSignatur && (
        <FirmaSignaturModal
          vertrag={firmaSignatur}
          onUnterschrieben={handleFirmaUnterschrieben}
          onClose={() => setFirmaSignatur(null)}
        />
      )}
      {meilensteineFuer && (
        <VertragMeilensteineModal
          open={!!meilensteineFuer}
          vertragId={meilensteineFuer.id}
          vertragTitel={meilensteineFuer.titel}
          onClose={() => setMeilensteineFuer(null)}
        />
      )}
    </>
  )
}
