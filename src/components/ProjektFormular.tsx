'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import type { ProjektActionState } from '@/app/actions/projekte'
import type { Kunde, Projekt } from '@/lib/supabase/types'

export const PROJEKT_STATUS = [
  { wert: 'offen', label: 'Offen' },
  { wert: 'in_bearbeitung', label: 'In Bearbeitung' },
  { wert: 'freigegeben', label: 'Freigegeben' },
  { wert: 'abgeschlossen', label: 'Abgeschlossen' },
]

function SpeichernButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

interface Props {
  aktion: (prevState: ProjektActionState, formData: FormData) => Promise<ProjektActionState>
  kunden: Pick<Kunde, 'id' | 'name'>[]
  projektarten: { name: string }[]
  initialData?: Projekt
  abbrechen: string
  istBearbeiten?: boolean
  vorausgewaehlterKundeId?: string
}

export default function ProjektFormular({
  aktion,
  kunden,
  projektarten,
  initialData,
  abbrechen,
  istBearbeiten = false,
  vorausgewaehlterKundeId,
}: Props) {
  const [state, formAction] = useFormState(aktion, null)
  const [serviceModell, setServiceModell] = useState<string>(initialData?.service_modell ?? '')

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Projektname */}
      <div>
        <label htmlFor="name" className={lbl}>
          Projektname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inp}
          placeholder="z. B. Hotel Seeblick – Zimmer 101–120"
        />
      </div>

      {/* Kunde */}
      <div>
        <label htmlFor="kunde_id" className={lbl}>
          Kunde <span className="text-red-400">*</span>
        </label>
        <select
          id="kunde_id"
          name="kunde_id"
          required
          defaultValue={initialData?.kunde_id ?? vorausgewaehlterKundeId ?? ''}
          className={inp}
        >
          <option value="" disabled>Kunde auswählen…</option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </div>

      {/* Standort & Projektart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="standort" className={lbl}>Standort</label>
          <input
            id="standort"
            name="standort"
            type="text"
            defaultValue={initialData?.standort ?? ''}
            className={inp}
            placeholder="z. B. München, Berlin…"
          />
        </div>
        <div>
          <label htmlFor="projektart" className={lbl}>Projektart</label>
          <select
            id="projektart"
            name="projektart"
            defaultValue={initialData?.projektart ?? ''}
            className={inp}
          >
            <option value="">Bitte wählen…</option>
            {projektarten.map((art) => (
              <option key={art.name} value={art.name}>{art.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gesamtbudget */}
      <div>
        <label htmlFor="gesamtbudget" className={lbl}>
          Gesamtbudget (€){' '}
          <span className="text-gray-400 normal-case font-normal">(intern, inkl. Service)</span>
        </label>
        <input
          id="gesamtbudget"
          name="gesamtbudget"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initialData?.gesamtbudget ?? ''}
          className={inp}
          placeholder="0.00"
        />
      </div>

      {/* Status (nur beim Bearbeiten) */}
      {istBearbeiten && (
        <div>
          <label htmlFor="status" className={lbl}>Status</label>
          <select
            id="status"
            name="status"
            defaultValue={initialData?.status ?? 'offen'}
            className={inp}
          >
            {PROJEKT_STATUS.map((s) => (
              <option key={s.wert} value={s.wert}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Service & Abrechnung ───────────────────────────────── */}
      <div className="border-t border-gray-100 pt-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          Service & Abrechnung
        </p>
      </div>

      {/* Abrechnungsmodell + Wert */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="service_modell" className={lbl}>Abrechnungsmodell</label>
          <select
            id="service_modell"
            name="service_modell"
            value={serviceModell}
            onChange={(e) => setServiceModell(e.target.value)}
            className={inp}
          >
            <option value="">Keins</option>
            <option value="pauschale">Pauschale</option>
            <option value="stundensatz">Stundensatz</option>
          </select>
        </div>

        {serviceModell === 'pauschale' && (
          <div>
            <label htmlFor="service_pauschale" className={lbl}>Pauschale (€)</label>
            <input
              id="service_pauschale"
              name="service_pauschale"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initialData?.service_pauschale ?? ''}
              className={`${inp} font-mono`}
              placeholder="5.000,00"
            />
          </div>
        )}

        {serviceModell === 'stundensatz' && (
          <div>
            <label htmlFor="service_stundensatz" className={lbl}>Stundensatz (€/h)</label>
            <input
              id="service_stundensatz"
              name="service_stundensatz"
              type="number"
              min="0"
              step="0.5"
              defaultValue={initialData?.service_stundensatz ?? ''}
              className={`${inp} font-mono`}
              placeholder="120,00"
            />
          </div>
        )}
      </div>

      {/* Produkt-Budget */}
      <div>
        <label htmlFor="produkt_budget" className={lbl}>
          Produkt-Budget (€){' '}
          <span className="text-wellbeing-green/70 normal-case font-normal">(klientenseitig sichtbar)</span>
        </label>
        <input
          id="produkt_budget"
          name="produkt_budget"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initialData?.produkt_budget ?? ''}
          className={inp}
          placeholder="0.00"
        />
        <p className="text-xs text-gray-400 mt-1">
          Das Budget, das dem Klienten für Einrichtungsprodukte mitgeteilt wird.
        </p>
      </div>

      {/* Notizen */}
      <div>
        <label htmlFor="beschreibung" className={lbl}>Notizen</label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={4}
          defaultValue={initialData?.beschreibung ?? ''}
          className={`${inp} resize-none`}
          placeholder="Interne Notizen zum Projekt…"
        />
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-2">
        <SpeichernButton />
        <a
          href={abbrechen}
          className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Abbrechen
        </a>
      </div>
    </form>
  )
}

const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
