'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { KundeActionState } from '@/app/actions/kunden'
import type { Kunde } from '@/lib/supabase/types'

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
  aktion: (prevState: KundeActionState, formData: FormData) => Promise<KundeActionState>
  initialData?: Kunde
  abbrechen: string
}

export default function KundeFormular({ aktion, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Firmenname */}
      <div>
        <label htmlFor="name" className={lbl}>
          Firmenname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inp}
          placeholder="Musterfirma GmbH"
        />
      </div>

      {/* Ansprechpartner */}
      <div>
        <label htmlFor="ansprechpartner" className={lbl}>
          Ansprechpartner
        </label>
        <input
          id="ansprechpartner"
          name="ansprechpartner"
          type="text"
          defaultValue={initialData?.ansprechpartner ?? ''}
          className={inp}
          placeholder="Max Mustermann"
        />
      </div>

      {/* E-Mail & Telefon nebeneinander */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className={lbl}>E-Mail</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email ?? ''}
            className={inp}
            placeholder="kontakt@musterfirma.de"
          />
        </div>
        <div>
          <label htmlFor="telefon" className={lbl}>Telefon</label>
          <input
            id="telefon"
            name="telefon"
            type="tel"
            defaultValue={initialData?.telefon ?? ''}
            className={inp}
            placeholder="+49 123 456789"
          />
        </div>
      </div>

      {/* Adresse */}
      <div>
        <label htmlFor="adresse" className={lbl}>Adresse</label>
        <input
          id="adresse"
          name="adresse"
          type="text"
          defaultValue={initialData?.adresse ?? ''}
          className={inp}
          placeholder="Musterstraße 1, 12345 Berlin"
        />
      </div>

      {/* Notizen */}
      <div>
        <label htmlFor="notizen" className={lbl}>Notizen</label>
        <textarea
          id="notizen"
          name="notizen"
          rows={4}
          defaultValue={initialData?.notizen ?? ''}
          className={`${inp} resize-none`}
          placeholder="Interne Notizen zum Kunden…"
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
