'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { User, Building2, Users as UsersIcon } from 'lucide-react'
import type { KundeActionState } from '@/app/actions/kunden'
import type { Kunde, KundenTyp } from '@/lib/supabase/types'

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

const TYP_OPTIONEN: { id: KundenTyp; label: string; beschreibung: string; icon: typeof User }[] = [
  { id: 'privat', label: 'Privatkunde',   beschreibung: 'Eine Person',                icon: User },
  { id: 'firma',  label: 'Firma',         beschreibung: 'Nur Firmenname',            icon: Building2 },
  { id: 'beide',  label: 'Kunde + Firma', beschreibung: 'Person + zugehörige Firma', icon: UsersIcon },
]

export default function KundeFormular({ aktion, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)
  const [typ, setTyp]                 = useState<KundenTyp>(initialData?.kunden_typ ?? 'firma')
  const [kundenname, setKundenname]   = useState<string>(initialData?.kunden_typ === 'firma' ? '' : (initialData?.name ?? ''))
  const [firmenname, setFirmenname]   = useState<string>(initialData?.firmenname ?? (initialData?.kunden_typ === 'firma' ? (initialData?.name ?? '') : ''))

  const zeigeKundenname = typ === 'privat' || typ === 'beide'
  const zeigeFirmenname = typ === 'firma'  || typ === 'beide'

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Kundentyp-Auswahl */}
      <div>
        <label className={lbl}>Kundentyp <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-3 gap-2">
          {TYP_OPTIONEN.map((opt) => {
            const aktiv = typ === opt.id
            const Icon  = opt.icon
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTyp(opt.id)}
                className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg border text-left transition-all ${
                  aktiv
                    ? 'border-wellbeing-green bg-wellbeing-green/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${aktiv ? 'text-wellbeing-green' : 'text-gray-400'}`} />
                  <span className={`text-xs font-semibold ${aktiv ? 'text-wellbeing-green-dark' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{opt.beschreibung}</p>
              </button>
            )
          })}
        </div>
        <input type="hidden" name="kunden_typ" value={typ} />
      </div>

      {/* Kundenname (Privat / Beide) */}
      {zeigeKundenname && (
        <div>
          <label htmlFor="kundenname" className={lbl}>
            Kundenname {typ === 'privat' && <span className="text-red-400">*</span>}
          </label>
          <input
            id="kundenname"
            name="kundenname"
            type="text"
            required={typ === 'privat'}
            value={kundenname}
            onChange={(e) => setKundenname(e.target.value)}
            className={inp}
            placeholder="Max Mustermann"
          />
        </div>
      )}

      {/* Firmenname (Firma / Beide) */}
      {zeigeFirmenname && (
        <div>
          <label htmlFor="firmenname" className={lbl}>
            Firmenname {typ === 'firma' && <span className="text-red-400">*</span>}
          </label>
          <input
            id="firmenname"
            name="firmenname"
            type="text"
            required={typ === 'firma'}
            value={firmenname}
            onChange={(e) => setFirmenname(e.target.value)}
            className={inp}
            placeholder="Musterfirma GmbH"
          />
        </div>
      )}

      {/* Hinweis: Ansprechpartner pflegt man jetzt im Kontakte-Block */}
      <div className="rounded-lg bg-wellbeing-cream/50 border border-wellbeing-green/20 px-3 py-2.5">
        <p className="text-[12px] text-wellbeing-green-dark">
          <span className="font-medium">Ansprechpartner</span> pflegst du nach dem Speichern auf der Detailseite — pro Person mit eigener E-Mail und Mobilnummer.
        </p>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className={lbl}>Website</label>
        <input
          id="website"
          name="website"
          type="url"
          defaultValue={initialData?.website ?? ''}
          className={inp}
          placeholder="https://musterfirma.de"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Wenn ein Logo noch fehlt, wird automatisch das Favicon der Domain übernommen.
        </p>
      </div>

      {/* Adresse — strukturiert (Straße / PLZ / Ort), damit Teile einzeln kopierbar sind */}
      <div className="space-y-3">
        <div>
          <label htmlFor="strasse" className={lbl}>Straße & Hausnummer</label>
          <input
            id="strasse"
            name="strasse"
            type="text"
            defaultValue={initialData?.strasse ?? ''}
            className={inp}
            placeholder="Musterstraße 1"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="plz" className={lbl}>PLZ</label>
            <input
              id="plz"
              name="plz"
              type="text"
              inputMode="numeric"
              defaultValue={initialData?.plz ?? ''}
              className={inp}
              placeholder="12345"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="ort" className={lbl}>Ort</label>
            <input
              id="ort"
              name="ort"
              type="text"
              defaultValue={initialData?.ort ?? ''}
              className={inp}
              placeholder="Berlin"
            />
          </div>
        </div>
        {/* Bestandskunden: bisher gespeicherte Freitext-Adresse als Hinweis, falls noch nicht aufgeteilt */}
        {!initialData?.strasse && !initialData?.plz && !initialData?.ort && initialData?.adresse && (
          <p className="text-[11px] text-gray-400">
            Bisher gespeichert: <span className="text-gray-600">{initialData.adresse}</span> — bitte auf Straße / PLZ / Ort aufteilen.
          </p>
        )}
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
