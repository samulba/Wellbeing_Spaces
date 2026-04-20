'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserCircle2, CheckCircle2, X, Copy, Check, RefreshCw, PowerOff, ExternalLink, Mail, MailX } from 'lucide-react'
import { kundeEinladen, portalZuganDeaktivieren } from '@/app/actions/portal'
import { ConfirmModal } from '@/components/ConfirmModal'

interface PortalUser {
  id: string
  email: string
  vorname: string
  nachname: string
  aktiv: boolean
  letzter_login: string | null
  preise_anzeigen: boolean
  einladungs_token: string | null
  token_gueltig_bis: string | null
}

export default function KundenPortalSection({
  kundeId,
  kundeName,
  initialPortalUser,
}: {
  kundeId: string
  kundeName: string
  initialPortalUser: PortalUser | null
}) {
  const router = useRouter()
  const [portalUser, setPortalUser]     = useState(initialPortalUser)
  const [modalOffen, setModalOffen]     = useState(false)
  const [confirmDeaktiv, setConfirmDeaktiv] = useState(false)
  const [einladungsLink, setLink]       = useState('')
  const [mailGesendet, setMailGesendet] = useState<boolean | null>(null)
  const [kopiert, setKopiert]           = useState(false)
  const [fehler, setFehler]             = useState('')
  const [isPending, startTransition]    = useTransition()

  // Formular-Felder
  const [email,    setEmail]    = useState(initialPortalUser?.email    ?? '')
  const [vorname,  setVorname]  = useState(initialPortalUser?.vorname  ?? '')
  const [nachname, setNachname] = useState(initialPortalUser?.nachname ?? '')
  const [preise,   setPreise]   = useState(initialPortalUser?.preise_anzeigen ?? true)

  function kopieren(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    })
  }

  function handleEinladen() {
    setFehler('')
    setMailGesendet(null)
    startTransition(async () => {
      const result = await kundeEinladen(kundeId, email, vorname, nachname, preise)
      if (result.fehler) { setFehler(result.fehler); return }
      setLink(result.einladungsLink ?? '')
      setMailGesendet(result.mailGesendet ?? false)
      // Optimistic Update: Karte zeigt sofort "aktiv" + gespeicherte Daten
      setPortalUser({
        id:                portalUser?.id ?? 'pending',
        email:             email.toLowerCase().trim(),
        vorname:           vorname.trim(),
        nachname:          nachname.trim(),
        aktiv:             true,
        letzter_login:     null,
        preise_anzeigen:   preise,
        einladungs_token:  'pending',
        token_gueltig_bis: new Date(Date.now() + 7 * 864e5).toISOString(),
      })
      // Server-Daten refreshen (neue IDs, revalidatePath)
      router.refresh()
    })
  }

  function handleDeaktivieren() {
    startTransition(async () => {
      await portalZuganDeaktivieren(kundeId)
      setPortalUser((prev) => prev ? { ...prev, aktiv: false } : null)
    })
    setConfirmDeaktiv(false)
  }

  const hatAktivenLink = portalUser?.einladungs_token &&
    portalUser.token_gueltig_bis &&
    new Date(portalUser.token_gueltig_bis) > new Date()

  return (
    <>
      <ConfirmModal
        isOpen={confirmDeaktiv}
        onClose={() => setConfirmDeaktiv(false)}
        onConfirm={handleDeaktivieren}
        title="Portal-Zugang deaktivieren"
        message="Der Kunde kann sich nicht mehr im Kunden-Portal anmelden. Der Zugang kann jederzeit erneut aktiviert werden."
        confirmText="Deaktivieren"
        variant="warning"
        isLoading={isPending}
      />
      {/* Einladungs-Modal */}
      {modalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                {portalUser?.aktiv ? 'Neue Einladung senden' : 'Portal-Zugang einrichten'}
              </h2>
              <button onClick={() => { setModalOffen(false); setLink(''); setFehler('') }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {einladungsLink ? (
              <div>
                {mailGesendet ? (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      E-Mail wurde an <strong>{email}</strong> verschickt. Der Link ist 7 Tage gültig.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl mb-4">
                    <MailX className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>Keine E-Mail verschickt</strong> — RESEND_API_KEY ist nicht konfiguriert.
                      Kopiere den Link unten und sende ihn manuell. (7 Tage gültig.)
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4">
                  <code className="flex-1 text-xs text-gray-600 truncate">{einladungsLink}</code>
                  <button onClick={() => kopieren(einladungsLink)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 rounded-lg hover:bg-wellbeing-green/5 transition">
                    {kopiert ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {kopiert ? 'Kopiert!' : 'Kopieren'}
                  </button>
                  <a href={einladungsLink} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 p-1.5 text-gray-400 hover:text-wellbeing-green rounded-lg hover:bg-gray-50 transition">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <button onClick={() => { setModalOffen(false); setLink('') }}
                  className="w-full py-2.5 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-xl transition">
                  Fertig
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Vorname</label>
                    <input value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Max"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Nachname</label>
                    <input value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Mustermann"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">E-Mail-Adresse</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="max@example.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setPreise((v) => !v)}
                    className="relative shrink-0 cursor-pointer" style={{ width: 36, height: 20 }}>
                    <div className={`w-9 h-5 rounded-full transition-colors ${preise ? 'bg-wellbeing-green' : 'bg-gray-200'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${preise ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Preise anzeigen</p>
                    <p className="text-xs text-gray-400">Verkaufspreise für den Kunden sichtbar</p>
                  </div>
                </label>

                {fehler && <p className="text-xs text-red-500">{fehler}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setModalOffen(false); setFehler('') }}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition">
                    Abbrechen
                  </button>
                  <button onClick={handleEinladen} disabled={isPending || !email}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition">
                    {isPending ? 'Wird erstellt…' : 'Einladungslink erstellen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Karte */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Kunden-Portal</h2>
          {portalUser?.aktiv && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Aktiv
            </span>
          )}
        </div>

        {!portalUser || !portalUser.aktiv ? (
          /* Nicht aktiviert */
          <div>
            <div className="flex items-start gap-3 mb-4">
              <UserCircle2 className="w-8 h-8 text-gray-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Noch nicht aktiviert</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Mit dem Kunden-Portal bekommt <strong>{kundeName}</strong> einen eigenen Login-Bereich
                  wo er Projekte verfolgen, Produkte freigeben und mit Ihnen kommunizieren kann.
                </p>
              </div>
            </div>
            <button onClick={() => setModalOffen(true)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-xl transition">
              Kunde zum Portal einladen
            </button>
          </div>
        ) : (
          /* Aktiviert */
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-gray-400 text-xs">E-Mail</span>
                <span className="font-medium">{portalUser.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Letzter Login</span>
                <span>{portalUser.letzter_login
                  ? new Date(portalUser.letzter_login).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Noch nie'}</span>
              </div>
              {hatAktivenLink && (
                <p className="text-xs text-amber-600">⏳ Einladung noch nicht angenommen</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setModalOffen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition">
                <RefreshCw className="w-3 h-3" />
                Neue Einladung
              </button>
              <a
                href={`/api/portal-preview/${kundeId}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Als dieser Kunde ins Portal einloggen"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition"
              >
                <ExternalLink className="w-3 h-3" />
                Portal-Vorschau
              </a>
              <button onClick={() => setConfirmDeaktiv(true)} disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                <PowerOff className="w-3 h-3" />
                Deaktivieren
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
