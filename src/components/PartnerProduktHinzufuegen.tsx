'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Plus, X, Link2 } from 'lucide-react'
import { produktFuerPartnerAnlegen } from '@/app/actions/produkte'
import KategorieDropdown, { type KategorieOption } from '@/components/KategorieDropdown'

// Sentinel für erfolgreiche Speicherung
type ModalState = { fehler: string } | { erfolg: true } | null

async function wrapAction(
  partnerId: string,
  _prev: ModalState,
  formData: FormData
): Promise<ModalState> {
  const result = await produktFuerPartnerAnlegen(partnerId, null, formData)
  if (result === null) return { erfolg: true }
  return result
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="px-4 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors">
      {pending ? 'Speichern…' : 'Produkt hinzufügen'}
    </button>
  )
}

export default function PartnerProduktHinzufuegen({
  partnerId,
  kategorienListe,
}: {
  partnerId: string
  kategorienListe: KategorieOption[]
}) {
  const [open, setOpen] = useState(false)
  const [kategorie, setKategorie] = useState('')
  const isMount = useRef(true)

  const aktion = wrapAction.bind(null, partnerId)
  const [state, formAction] = useFormState(aktion, null)

  // Modal schließen bei Erfolg
  useEffect(() => {
    if (isMount.current) { isMount.current = false; return }
    if (state && 'erfolg' in state) {
      setOpen(false)
      setKategorie('')
    }
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green-light rounded-lg hover:bg-wellbeing-cream transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Produkt hinzufügen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Produkt hinzufügen</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form action={formAction} className="px-6 py-5 space-y-4">
              {/* Produktlink */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Produktlink <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="produkt_url"
                    type="url"
                    placeholder="https://…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light bg-white"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Produktname <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="z.B. Eames Lounge Chair"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light bg-white"
                />
              </div>

              {/* Kategorie */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Kategorie</label>
                {/* hidden input für FormData */}
                <input type="hidden" name="kategorie" value={kategorie} />
                <KategorieDropdown
                  optionen={kategorienListe}
                  value={kategorie}
                  onChange={setKategorie}
                  placeholder="Keine Kategorie"
                  minWidth="100%"
                />
              </div>

              {state && 'fehler' in state && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {state.fehler}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <SubmitBtn />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
