'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import type { PartnerActionState } from '@/app/actions/partner'
import type { Partner } from '@/lib/supabase/types'

function SpeichernButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

interface Props {
  aktion: (prevState: PartnerActionState, formData: FormData) => Promise<PartnerActionState>
  initialData?: Partner
  abbrechen: string
}

export default function PartnerFormular({ aktion, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)
  const [modell, setModell] = useState<string>(initialData?.provisionsmodell ?? '')

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className={lbl}>
          Partnername <span className="text-red-400">*</span>
        </label>
        <input
          id="name" name="name" type="text" required
          defaultValue={initialData?.name ?? ''}
          className={inp}
          placeholder="z. B. Musterleuchten GmbH"
        />
      </div>

      {/* Ansprechpartner + E-Mail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="ansprechpartner" className={lbl}>Ansprechpartner</label>
          <input
            id="ansprechpartner" name="ansprechpartner" type="text"
            defaultValue={initialData?.ansprechpartner ?? ''}
            className={inp} placeholder="Max Mustermann"
          />
        </div>
        <div>
          <label htmlFor="email" className={lbl}>E-Mail</label>
          <input
            id="email" name="email" type="email"
            defaultValue={initialData?.email ?? ''}
            className={inp} placeholder="kontakt@partner.de"
          />
        </div>
      </div>

      {/* Telefon + Website */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="telefon" className={lbl}>Telefon</label>
          <input
            id="telefon" name="telefon" type="tel"
            defaultValue={initialData?.telefon ?? ''}
            className={inp} placeholder="+49 123 456789"
          />
        </div>
        <div>
          <label htmlFor="website" className={lbl}>Website</label>
          <input
            id="website" name="website" type="url"
            defaultValue={initialData?.website ?? ''}
            className={inp} placeholder="https://partner.de"
          />
        </div>
      </div>

      {/* Provisionsmodell */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="provisionsmodell" className={lbl}>Provisionsmodell</label>
          <select
            id="provisionsmodell" name="provisionsmodell"
            value={modell}
            onChange={(e) => setModell(e.target.value)}
            className={inp}
          >
            <option value="">Kein Provisionsmodell</option>
            <option value="Prozent">Prozent vom VP netto</option>
            <option value="Fix">Fixbetrag pro Einheit (€)</option>
            <option value="Individuell">Individuell</option>
          </select>
        </div>

        {modell === 'Prozent' && (
          <div>
            <label htmlFor="provisions_wert" className={lbl}>Provisionssatz (%)</label>
            <input
              id="provisions_wert" name="provisions_wert"
              type="number" min="0" step="0.1"
              defaultValue={initialData?.provisions_wert ?? ''}
              className={`${inp} font-mono`} placeholder="0,0"
            />
          </div>
        )}

        {modell === 'Fix' && (
          <div>
            <label htmlFor="provisions_wert" className={lbl}>Fixbetrag (€)</label>
            <input
              id="provisions_wert" name="provisions_wert"
              type="number" min="0" step="0.01"
              defaultValue={initialData?.provisions_wert ?? ''}
              className={`${inp} font-mono`} placeholder="0,00"
            />
          </div>
        )}

        {modell === 'Individuell' && (
          <div className="flex items-end">
            <p className="text-xs text-stone-400 pb-2.5">
              Details in den Einkaufskonditionen beschreiben.
            </p>
          </div>
        )}
      </div>

      {/* Einkaufskonditionen */}
      <div>
        <label htmlFor="einkaufskonditionen" className={lbl}>
          Einkaufskonditionen{' '}
          <span className="text-stone-300 normal-case tracking-normal">(intern)</span>
        </label>
        <textarea
          id="einkaufskonditionen" name="einkaufskonditionen" rows={3}
          defaultValue={initialData?.einkaufskonditionen ?? ''}
          className={`${inp} resize-none`}
          placeholder="Rabattstaffel, Mindestbestellwert, Zahlungsziel, besondere Konditionen…"
        />
      </div>

      {/* Notizen */}
      <div>
        <label htmlFor="notizen" className={lbl}>Notizen</label>
        <textarea
          id="notizen" name="notizen" rows={3}
          defaultValue={initialData?.notizen ?? ''}
          className={`${inp} resize-none`}
          placeholder="Allgemeine Anmerkungen zum Partner…"
        />
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-2">
        <SpeichernButton />
        <a href={abbrechen} className="px-5 py-2.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          Abbrechen
        </a>
      </div>
    </form>
  )
}

const lbl = 'block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition'
