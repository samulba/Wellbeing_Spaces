'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { PartnerKondition, PartnerKonditionTyp, Json } from '@/lib/supabase/types'
import {
  konditionAnlegen,
  konditionAktualisieren,
  konditionLoeschen,
  type KonditionDaten,
} from '@/app/actions/partner'

// ── Hilfsdaten ────────────────────────────────────────────────

const TYP_LABEL: Record<PartnerKonditionTyp, string> = {
  prozent_fix:         'Provision % (fix)',
  prozent_gestaffelt:  'Provision % (gestaffelt)',
  fix_pro_produkt:     'Fix pro Produkt (€)',
  fix_pro_bestellung:  'Fix pro Bestellung (€)',
  kategorie_basiert:   'Kategorie-basiert',
  rabatt_einkauf:      'Einkaufsrabatt (%)',
  mindestbestellwert:  'Mindestbestellwert (€)',
}

const TYP_BADGE: Record<PartnerKonditionTyp, string> = {
  prozent_fix:         'bg-wellbeing-cream text-wellbeing-green-dark',
  prozent_gestaffelt:  'bg-emerald-50 text-emerald-700',
  fix_pro_produkt:     'bg-blue-50 text-blue-700',
  fix_pro_bestellung:  'bg-indigo-50 text-indigo-700',
  kategorie_basiert:   'bg-purple-50 text-purple-700',
  rabatt_einkauf:      'bg-amber-50 text-amber-700',
  mindestbestellwert:  'bg-orange-50 text-orange-700',
}

const TYPEN: PartnerKonditionTyp[] = [
  'prozent_fix', 'prozent_gestaffelt', 'fix_pro_produkt',
  'fix_pro_bestellung', 'kategorie_basiert', 'rabatt_einkauf', 'mindestbestellwert',
]

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

function formatWert(k: PartnerKondition): string {
  if (k.wert == null) return '–'
  if (k.typ === 'prozent_fix' || k.typ === 'prozent_gestaffelt' || k.typ === 'rabatt_einkauf') {
    return `${k.wert} %`
  }
  return eur(k.wert)
}

function formatDatum(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Formular ──────────────────────────────────────────────────

interface FormState {
  name: string
  typ: PartnerKonditionTyp
  wert: string
  staffelung: string
  kategorie_werte: string
  gueltig_von: string
  gueltig_bis: string
  zahlungsziel_tage: string
  skonto_prozent: string
  skonto_tage: string
  notizen: string
  aktiv: boolean
}

const leereFormState: FormState = {
  name: 'Standard',
  typ: 'prozent_fix',
  wert: '',
  staffelung: '',
  kategorie_werte: '',
  gueltig_von: '',
  gueltig_bis: '',
  zahlungsziel_tage: '30',
  skonto_prozent: '',
  skonto_tage: '',
  notizen: '',
  aktiv: true,
}

function konditionZuForm(k: PartnerKondition): FormState {
  return {
    name:              k.name,
    typ:               k.typ,
    wert:              k.wert?.toString() ?? '',
    staffelung:        k.staffelung ? JSON.stringify(k.staffelung, null, 2) : '',
    kategorie_werte:   k.kategorie_werte ? JSON.stringify(k.kategorie_werte, null, 2) : '',
    gueltig_von:       k.gueltig_von ?? '',
    gueltig_bis:       k.gueltig_bis ?? '',
    zahlungsziel_tage: k.zahlungsziel_tage?.toString() ?? '30',
    skonto_prozent:    k.skonto_prozent?.toString() ?? '',
    skonto_tage:       k.skonto_tage?.toString() ?? '',
    notizen:           k.notizen ?? '',
    aktiv:             k.aktiv,
  }
}

function formZuDaten(f: FormState): KonditionDaten {
  let staffelung: Json | null = null
  let kategorie_werte: Json | null = null
  try { if (f.staffelung.trim()) staffelung = JSON.parse(f.staffelung) as Json } catch { /* ignorieren */ }
  try { if (f.kategorie_werte.trim()) kategorie_werte = JSON.parse(f.kategorie_werte) as Json } catch { /* ignorieren */ }

  return {
    name:              f.name || 'Standard',
    typ:               f.typ,
    wert:              f.wert ? parseFloat(f.wert) : null,
    staffelung,
    kategorie_werte,
    gueltig_von:       f.gueltig_von || null,
    gueltig_bis:       f.gueltig_bis || null,
    zahlungsziel_tage: f.zahlungsziel_tage ? parseInt(f.zahlungsziel_tage) : null,
    skonto_prozent:    f.skonto_prozent ? parseFloat(f.skonto_prozent) : null,
    skonto_tage:       f.skonto_tage ? parseInt(f.skonto_tage) : null,
    notizen:           f.notizen || null,
    aktiv:             f.aktiv,
  }
}

// ── Haupt-Komponente ──────────────────────────────────────────

interface Props {
  partnerId: string
  initialKonditionen: PartnerKondition[]
}

export default function PartnerKonditionenBlock({ partnerId, initialKonditionen }: Props) {
  const [konditionen, setKonditionen] = useState(initialKonditionen)
  const [modalOffen, setModalOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(leereFormState)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erweitert, setErweitert] = useState(false)
  const [, startTransition] = useTransition()

  function oeffneNeu() {
    setBearbeitenId(null)
    setForm(leereFormState)
    setFehler(null)
    setModalOffen(true)
  }

  function oeffneBearbeiten(k: PartnerKondition) {
    setBearbeitenId(k.id)
    setForm(konditionZuForm(k))
    setFehler(null)
    setModalOffen(true)
  }

  function schliesseModal() {
    setModalOffen(false)
    setBearbeitenId(null)
    setFehler(null)
  }

  function handleSpeichern() {
    const daten = formZuDaten(form)
    startTransition(async () => {
      if (bearbeitenId) {
        const res = await konditionAktualisieren(bearbeitenId, partnerId, daten)
        if (res.fehler) { setFehler(res.fehler); return }
        setKonditionen((prev) =>
          prev.map((k) =>
            k.id === bearbeitenId
              ? { ...k, ...daten, updated_at: new Date().toISOString() }
              : k
          )
        )
      } else {
        const res = await konditionAnlegen(partnerId, daten)
        if (res.fehler) { setFehler(res.fehler); return }
        // Pessimistisch: Seite lädt neu via revalidatePath
        const optimistisch: PartnerKondition = {
          id: crypto.randomUUID(),
          organisation_id: '',
          partner_id: partnerId,
          name: daten.name,
          typ: daten.typ,
          wert: daten.wert,
          staffelung: daten.staffelung as Json | null,
          kategorie_werte: daten.kategorie_werte as Json | null,
          gueltig_von: daten.gueltig_von,
          gueltig_bis: daten.gueltig_bis,
          zahlungsziel_tage: daten.zahlungsziel_tage,
          skonto_prozent: daten.skonto_prozent,
          skonto_tage: daten.skonto_tage,
          notizen: daten.notizen,
          aktiv: daten.aktiv,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setKonditionen((prev) => [optimistisch, ...prev])
      }
      schliesseModal()
    })
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await konditionLoeschen(id, partnerId)
      if (!res.fehler) {
        setKonditionen((prev) => prev.filter((k) => k.id !== id))
      }
    })
  }

  const istGestaffelt     = form.typ === 'prozent_gestaffelt'
  const istKategorieBas   = form.typ === 'kategorie_basiert'
  const zeigeWertFeld     = !istGestaffelt && !istKategorieBas

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Konditionen{' '}
          <span className="text-gray-400 font-normal">({konditionen.length})</span>
        </h2>
        <button
          type="button"
          onClick={oeffneNeu}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Kondition hinzufügen
        </button>
      </div>

      {/* Liste */}
      {konditionen.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-400">Noch keine Konditionen hinterlegt.</p>
          <button
            type="button"
            onClick={oeffneNeu}
            className="mt-2 text-xs text-wellbeing-green hover:underline underline-offset-2"
          >
            Erste Kondition anlegen
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {konditionen.map((k) => (
            <div key={k.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors group">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{k.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TYP_BADGE[k.typ]}`}>
                    {TYP_LABEL[k.typ]}
                  </span>
                  {!k.aktiv && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                      Inaktiv
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  {k.wert != null && (
                    <span className="font-mono font-medium text-gray-700">{formatWert(k)}</span>
                  )}
                  {k.zahlungsziel_tage != null && (
                    <span>Ziel: {k.zahlungsziel_tage} Tage</span>
                  )}
                  {k.skonto_prozent != null && k.skonto_tage != null && (
                    <span>{k.skonto_prozent}% Skonto bei {k.skonto_tage} Tagen</span>
                  )}
                  {(k.gueltig_von || k.gueltig_bis) && (
                    <span>
                      {k.gueltig_von ? formatDatum(k.gueltig_von) : '–'}
                      {' bis '}
                      {k.gueltig_bis ? formatDatum(k.gueltig_bis) : 'offen'}
                    </span>
                  )}
                </div>
                {k.notizen && (
                  <p className="text-xs text-gray-400 truncate max-w-sm">{k.notizen}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                <button
                  type="button"
                  onClick={() => oeffneBearbeiten(k)}
                  className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-wellbeing-cream/60 rounded-lg transition-colors"
                  title="Bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Kondition „${k.name}" wirklich löschen?`)) handleLoeschen(k.id)
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={schliesseModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal-Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {bearbeitenId ? 'Kondition bearbeiten' : 'Neue Kondition'}
              </h3>
              <button type="button" onClick={schliesseModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal-Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {fehler && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {fehler}
                </div>
              )}

              {/* Name */}
              <div>
                <label className={lbl}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inp}
                  placeholder="z. B. Standardkondition 2025"
                />
              </div>

              {/* Typ */}
              <div>
                <label className={lbl}>Typ <span className="text-red-400">*</span></label>
                <select
                  value={form.typ}
                  onChange={(e) => setForm((f) => ({ ...f, typ: e.target.value as PartnerKonditionTyp }))}
                  className={inp}
                >
                  {TYPEN.map((t) => (
                    <option key={t} value={t}>{TYP_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              {/* Wert (abhängig vom Typ) */}
              {zeigeWertFeld && (
                <div>
                  <label className={lbl}>
                    {form.typ === 'prozent_fix' || form.typ === 'rabatt_einkauf'
                      ? 'Prozentsatz (%)'
                      : 'Betrag (€)'}
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.wert}
                    onChange={(e) => setForm((f) => ({ ...f, wert: e.target.value }))}
                    className={`${inp} font-mono`}
                    placeholder={form.typ === 'mindestbestellwert' ? '500,00' : '0,00'}
                  />
                </div>
              )}

              {/* Staffelung (JSON) */}
              {istGestaffelt && (
                <div>
                  <label className={lbl}>Staffelung (JSON)</label>
                  <textarea
                    rows={4}
                    value={form.staffelung}
                    onChange={(e) => setForm((f) => ({ ...f, staffelung: e.target.value }))}
                    className={`${inp} resize-none font-mono text-xs`}
                    placeholder={`[\n  { "ab_umsatz": 1000, "prozent": 5 },\n  { "ab_umsatz": 5000, "prozent": 8 }\n]`}
                  />
                </div>
              )}

              {/* Kategorie-Werte (JSON) */}
              {istKategorieBas && (
                <div>
                  <label className={lbl}>Kategorie-Werte (JSON)</label>
                  <textarea
                    rows={4}
                    value={form.kategorie_werte}
                    onChange={(e) => setForm((f) => ({ ...f, kategorie_werte: e.target.value }))}
                    className={`${inp} resize-none font-mono text-xs`}
                    placeholder={`{\n  "Möbel": 10,\n  "Beleuchtung": 8\n}`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Format: Kategorie-Name → Prozentsatz</p>
                </div>
              )}

              {/* Gültigkeit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Gültig von</label>
                  <input
                    type="date"
                    value={form.gueltig_von}
                    onChange={(e) => setForm((f) => ({ ...f, gueltig_von: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Gültig bis</label>
                  <input
                    type="date"
                    value={form.gueltig_bis}
                    onChange={(e) => setForm((f) => ({ ...f, gueltig_bis: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              {/* Erweiterte Felder (Zahlungsziel + Skonto) */}
              <button
                type="button"
                onClick={() => setErweitert((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {erweitert ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Zahlungsbedingungen
              </button>

              {erweitert && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Zahlungsziel (Tage)</label>
                      <input
                        type="number" min="0"
                        value={form.zahlungsziel_tage}
                        onChange={(e) => setForm((f) => ({ ...f, zahlungsziel_tage: e.target.value }))}
                        className={`${inp} font-mono`}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Skonto (%)</label>
                      <input
                        type="number" min="0" step="0.1"
                        value={form.skonto_prozent}
                        onChange={(e) => setForm((f) => ({ ...f, skonto_prozent: e.target.value }))}
                        className={`${inp} font-mono`} placeholder="2,0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Skonto bei … Tagen</label>
                    <input
                      type="number" min="0"
                      value={form.skonto_tage}
                      onChange={(e) => setForm((f) => ({ ...f, skonto_tage: e.target.value }))}
                      className={`${inp} font-mono`} placeholder="14"
                    />
                  </div>
                </div>
              )}

              {/* Notizen */}
              <div>
                <label className={lbl}>Notizen</label>
                <textarea
                  rows={2}
                  value={form.notizen}
                  onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
                  className={`${inp} resize-none`}
                  placeholder="Interne Anmerkungen zur Kondition…"
                />
              </div>

              {/* Aktiv */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.aktiv}
                  onChange={(e) => setForm((f) => ({ ...f, aktiv: e.target.checked }))}
                  className="w-4 h-4 rounded accent-wellbeing-green"
                />
                <span className="text-sm text-gray-700">Kondition aktiv</span>
              </label>
            </div>

            {/* Modal-Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={schliesseModal}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSpeichern}
                className="px-5 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
              >
                {bearbeitenId ? 'Speichern' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
