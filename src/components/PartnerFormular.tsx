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
      className="px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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

const PARTNER_TYPEN = [
  { value: 'lieferant',   label: 'Lieferant' },
  { value: 'hersteller',  label: 'Hersteller' },
  { value: 'handwerker',  label: 'Handwerker' },
  { value: 'planer',      label: 'Planer' },
  { value: 'sonstiges',   label: 'Sonstiges' },
]

export default function PartnerFormular({ aktion, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)
  const [bewertung, setBewertung] = useState<number>(initialData?.bewertung ?? 0)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Name + Typ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
        <div>
          <label htmlFor="partner_typ" className={lbl}>Partnertyp</label>
          <select
            id="partner_typ" name="partner_typ"
            defaultValue={initialData?.partner_typ ?? ''}
            className={inp}
          >
            <option value="">Kein Typ</option>
            {PARTNER_TYPEN.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className={lbl}>Website</label>
        <input
          id="website" name="website" type="url"
          defaultValue={initialData?.website ?? ''}
          className={inp} placeholder="https://partner.de"
        />
      </div>

      {/* Hinweis: Kontaktpersonen pflegt man jetzt im Kontakte-Tab */}
      <div className="rounded-lg bg-wellbeing-cream/50 border border-wellbeing-green/20 px-3 py-2.5">
        <p className="text-[12px] text-wellbeing-green-dark">
          <span className="font-medium">Kontaktpersonen</span> pflegst du nach dem Speichern auf der Detailseite im Tab <span className="font-medium">&bdquo;Kontakte&ldquo;</span> — pro Person mit eigener E-Mail, Telefon und Mobilnummer.
        </p>
      </div>

      {/* Adresse */}
      <div>
        <label htmlFor="adresse" className={lbl}>Adresse</label>
        <textarea
          id="adresse" name="adresse" rows={3}
          defaultValue={initialData?.adresse ?? ''}
          className={`${inp} resize-none`}
          placeholder="Musterstr. 12&#10;12345 Musterstadt&#10;Deutschland"
        />
      </div>

      {/* USt-IdNr + IBAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="ust_id" className={lbl}>
            USt-IdNr.{' '}
            <span className="text-red-400/60 normal-case font-normal">(intern)</span>
          </label>
          <input
            id="ust_id" name="ust_id" type="text"
            defaultValue={initialData?.ust_id ?? ''}
            className={inp} placeholder="DE123456789"
          />
        </div>
        <div>
          <label htmlFor="iban" className={lbl}>
            IBAN{' '}
            <span className="text-red-400/60 normal-case font-normal">(intern)</span>
          </label>
          <input
            id="iban" name="iban" type="text"
            defaultValue={initialData?.iban ?? ''}
            className={`${inp} font-mono tracking-wide`} placeholder="DE89 3704 0044 0532 0130 00"
          />
        </div>
      </div>

      {/* Bewertung */}
      <div>
        <label className={lbl}>Bewertung</label>
        <input type="hidden" name="bewertung" value={bewertung || ''} />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setBewertung(bewertung === s ? 0 : s)}
              className={`text-2xl transition-colors ${s <= bewertung ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
            >
              ★
            </button>
          ))}
          {bewertung > 0 && (
            <button
              type="button"
              onClick={() => setBewertung(0)}
              className="ml-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Provision & Konditionen → eigener Bereich */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Provision &amp; Konditionen</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Provision, Einkaufsrabatt, Staffelungen und Zahlungsbedingungen werden unter{' '}
          <span className="font-medium text-gray-700">&bdquo;Konditionen&ldquo;</span> gepflegt (auf der Partner-Seite nach dem Speichern).
          Diese lassen sich per Knopfdruck ins Produkt übernehmen.
        </p>
      </div>

      {/* Zahlungsziel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="zahlungsziel_tage" className={lbl}>
            Zahlungsziel (Tage)
          </label>
          <input
            id="zahlungsziel_tage" name="zahlungsziel_tage"
            type="number" min="0"
            defaultValue={initialData?.zahlungsziel_tage ?? 30}
            className={`${inp} font-mono`}
          />
        </div>
      </div>

      {/* Einkaufskonditionen */}
      <div>
        <label htmlFor="einkaufskonditionen" className={lbl}>
          Einkaufskonditionen{' '}
          <span className="text-red-400/60 normal-case font-normal">(intern)</span>
        </label>
        <textarea
          id="einkaufskonditionen" name="einkaufskonditionen" rows={3}
          defaultValue={initialData?.einkaufskonditionen ?? ''}
          className={`${inp} resize-none`}
          placeholder="Rabattstaffel, Mindestbestellwert, Zahlungsziel, besondere Konditionen…"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Längere Anmerkungen zum Partner kannst du auf der Detailseite im Notizen-Block ablegen.
        </p>
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-2">
        <SpeichernButton />
        <a href={abbrechen} className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Abbrechen
        </a>
      </div>
    </form>
  )
}

const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
