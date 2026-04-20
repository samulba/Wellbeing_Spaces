'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import Image from 'next/image'
import { Save, Upload, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { brandingAktualisieren, brandingLogoHochladen, type BrandingDaten } from '@/app/actions/branding'
import type { Branding } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

// ── Konstanten ────────────────────────────────────────────────
const GOOGLE_FONTS = [
  'Inter', 'Syne', 'Poppins', 'Raleway', 'Lato', 'Montserrat',
  'Playfair Display', 'Cormorant Garamond', 'DM Sans', 'Nunito',
]

const FARBEN_FELDER: { key: keyof BrandingDaten; label: string; beschreibung: string }[] = [
  { key: 'primary_color',     label: 'Primärfarbe',      beschreibung: 'Buttons, Badges, Akzente im Portal' },
  { key: 'button_text_color', label: 'Button-Textfarbe', beschreibung: 'Schriftfarbe auf Primary-Buttons (bei hellen Farben auf dunkel setzen)' },
  { key: 'secondary_color',   label: 'Sekundärfarbe',    beschreibung: 'Hover-Zustände, sekundäre Elemente' },
  { key: 'accent_color',      label: 'Akzentfarbe',      beschreibung: 'Hintergründe, Hervorhebungen' },
  { key: 'background_color',  label: 'Hintergrundfarbe', beschreibung: 'Seitenhintergrund im Kunden-Portal' },
  { key: 'text_color',        label: 'Textfarbe',        beschreibung: 'Firmenname, Überschriften' },
]

const DEFAULTS: Omit<Branding, 'id' | 'logo_url' | 'favicon_url' | 'created_at' | 'updated_at'> = {
  firmenname:        'Wellbeing Spaces',
  primary_color:     '#445c49',
  secondary_color:   '#94c1a4',
  accent_color:      '#f6ede2',
  background_color:  '#f6ede2',
  text_color:        '#1a2e1e',
  button_text_color: '#ffffff',
  font_family:       'Inter',
  welcome_text:      null,
  slogan:            null,
  email:             null,
  telefon:           null,
  website:           null,
  adresse:           null,
  impressum_text:    null,
  datenschutz_url:   null,
  show_powered_by:   true,
  custom_css:        null,
}

// ── Farbfeld ─────────────────────────────────────────────────
function FarbFeld({
  label,
  beschreibung,
  value,
  onChange,
}: {
  label: string
  beschreibung: string
  value: string
  onChange: (v: string) => void
}) {
  const [hex, setHex] = useState(value)

  function handleHexChange(v: string) {
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  function handleColorPicker(v: string) {
    setHex(v)
    onChange(v)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-lg border-2 border-white shadow-md cursor-pointer overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => handleColorPicker(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{beschreibung}</p>
      </div>
      <input
        type="text"
        value={hex}
        onChange={(e) => handleHexChange(e.target.value)}
        maxLength={7}
        className="w-24 px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
        placeholder="#000000"
      />
    </div>
  )
}

// ── Vorschau ──────────────────────────────────────────────────
function Vorschau({ branding, logoUrl }: { branding: Partial<Branding>; logoUrl: string | null }) {
  const bg   = branding.background_color ?? DEFAULTS.background_color
  const prim = branding.primary_color    ?? DEFAULTS.primary_color
  const text = branding.text_color       ?? DEFAULTS.text_color
  const name = branding.firmenname       ?? DEFAULTS.firmenname

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header-Vorschau */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: bg }}>
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={28} height={28} className="rounded object-contain" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <rect x="0" y="0" width="10" height="10" rx="2" fill={prim} opacity="0.30" />
              <rect x="4" y="4" width="10" height="10" rx="2" fill={prim} opacity="0.55" />
              <rect x="8" y="8" width="10" height="10" rx="2" fill={prim} />
            </svg>
          )}
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: text, fontFamily: branding.font_family ?? DEFAULTS.font_family }}
          >
            {name}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: prim }}>
          Musterraum
        </span>
      </div>

      {/* Body-Vorschau */}
      <div className="px-5 py-5 bg-white">
        <div className="h-2 rounded bg-gray-100 w-3/4 mb-2" />
        <div className="h-2 rounded bg-gray-100 w-1/2 mb-5" />
        <div className="flex gap-2">
          <div
            className="h-8 px-4 rounded-lg text-xs text-white font-medium flex items-center"
            style={{ backgroundColor: prim }}
          >
            Freigeben
          </div>
          <div className="h-8 px-4 rounded-lg text-xs font-medium flex items-center border border-gray-200 text-gray-500">
            Ablehnen
          </div>
        </div>
      </div>

      {/* Footer */}
      {branding.show_powered_by && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <span className="text-[10px] text-gray-400">Powered by Wellbeing Spaces</span>
        </div>
      )}
    </div>
  )
}

// ── Logo-Upload ───────────────────────────────────────────────
function LogoUpload({ currentUrl, onChange }: { currentUrl: string | null; onChange: (url: string) => void }) {
  const [state, formAction] = useFormState(brandingLogoHochladen, null)
  const [isPending, startTransition] = useTransition()

  if (state?.url && state.url !== currentUrl) {
    onChange(state.url)
  }

  return (
    <form
      action={(formData) => startTransition(() => formAction(formData))}
      className="flex items-center gap-3"
    >
      {currentUrl ? (
        <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          <Image src={currentUrl} alt="Logo" width={56} height={56} className="object-contain" />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
          <Upload className="w-5 h-5 text-gray-300" />
        </div>
      )}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Logo hochladen
          <span className="ml-1 font-normal text-gray-400">(PNG/SVG, max. 3 MB)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            name="logo"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-wellbeing-green/10 file:text-wellbeing-green hover:file:bg-wellbeing-green/20 transition"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark disabled:opacity-50 transition"
          >
            {isPending ? '…' : 'Upload'}
          </button>
        </div>
        {state?.fehler && <p className="text-xs text-red-500 mt-1">{state.fehler}</p>}
        {state?.url    && <p className="text-xs text-emerald-600 mt-1">Logo gespeichert.</p>}
      </div>
    </form>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function BrandingEditor({ branding: initial }: { branding: Branding | null }) {
  const def = DEFAULTS
  const [form, setForm] = useState<Partial<Branding>>({
    firmenname:        initial?.firmenname        ?? def.firmenname,
    button_text_color: initial?.button_text_color ?? def.button_text_color,
    welcome_text:      initial?.welcome_text      ?? def.welcome_text,
    slogan:            initial?.slogan            ?? def.slogan,
    primary_color:   initial?.primary_color   ?? def.primary_color,
    secondary_color: initial?.secondary_color ?? def.secondary_color,
    accent_color:    initial?.accent_color    ?? def.accent_color,
    background_color:initial?.background_color?? def.background_color,
    text_color:      initial?.text_color      ?? def.text_color,
    font_family:     initial?.font_family     ?? def.font_family,
    email:           initial?.email           ?? null,
    telefon:         initial?.telefon         ?? null,
    website:         initial?.website         ?? null,
    adresse:         initial?.adresse         ?? null,
    impressum_text:  initial?.impressum_text   ?? null,
    datenschutz_url: initial?.datenschutz_url  ?? null,
    show_powered_by: initial?.show_powered_by  ?? def.show_powered_by,
    custom_css:      initial?.custom_css       ?? null,
  })
  const [logoUrl,      setLogoUrl]      = useState(initial?.logo_url ?? null)
  const [vorschau,     setVorschau]     = useState(true)
  const [gespeichert,  setGespeichert]  = useState(false)
  const [fehler,       setFehler]       = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [isPending,    startTransition] = useTransition()

  function set<K extends keyof Partial<Branding>>(key: K, value: Partial<Branding>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setGespeichert(false)
  }

  function handleSpeichern() {
    startTransition(async () => {
      setFehler(null)
      const daten: BrandingDaten = {
        firmenname:        form.firmenname        ?? def.firmenname,
        button_text_color: form.button_text_color ?? def.button_text_color,
        welcome_text:      form.welcome_text      ?? def.welcome_text,
        slogan:            form.slogan            ?? def.slogan,
        primary_color:   form.primary_color   ?? def.primary_color,
        secondary_color: form.secondary_color ?? def.secondary_color,
        accent_color:    form.accent_color    ?? def.accent_color,
        background_color:form.background_color?? def.background_color,
        text_color:      form.text_color      ?? def.text_color,
        font_family:     form.font_family     ?? def.font_family,
        email:           form.email           ?? null,
        telefon:         form.telefon         ?? null,
        website:         form.website         ?? null,
        adresse:         form.adresse         ?? null,
        impressum_text:  form.impressum_text   ?? null,
        datenschutz_url: form.datenschutz_url  ?? null,
        show_powered_by: form.show_powered_by  ?? true,
        custom_css:      form.custom_css       ?? null,
      }
      const result = await brandingAktualisieren(daten)
      if (result.fehler) {
        setFehler(result.fehler)
      } else {
        setGespeichert(true)
        setTimeout(() => setGespeichert(false), 3000)
      }
    })
  }

  function handleReset() {
    setForm((prev) => ({
      ...prev,
      primary_color:    def.primary_color,
      secondary_color:  def.secondary_color,
      accent_color:     def.accent_color,
      background_color: def.background_color,
      text_color:       def.text_color,
    }))
  }

  return (
    <>
    <ConfirmModal
      isOpen={confirmReset}
      onClose={() => setConfirmReset(false)}
      onConfirm={() => { handleReset(); setConfirmReset(false) }}
      title="Farben zurücksetzen"
      message="Alle Farbeinstellungen werden auf die Standard-Werte zurückgesetzt. Deine aktuellen Farben gehen verloren."
      confirmText="Zurücksetzen"
      variant="warning"
    />
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
      {/* ── Linke Spalte: Einstellungen ── */}
      <div className="space-y-6">
        {/* Firmenname & Logo */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Identität</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Firmenname</label>
              <input
                type="text"
                value={form.firmenname ?? ''}
                onChange={(e) => set('firmenname', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                placeholder="Ihr Firmenname"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Slogan <span className="text-gray-400 font-normal">optional</span>
              </label>
              <input
                type="text"
                value={form.slogan ?? ''}
                onChange={(e) => set('slogan', e.target.value || null)}
                maxLength={80}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                placeholder="z.B. „Interior Design für Wellbeing Spaces"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Erscheint im Kunden-Portal unterhalb des Firmennamens (Login + Header).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Begrüßungstext <span className="text-gray-400 font-normal">optional</span>
              </label>
              <textarea
                value={form.welcome_text ?? ''}
                onChange={(e) => set('welcome_text', e.target.value || null)}
                maxLength={240}
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
                placeholder="Schön, dass Sie hier sind — wir halten Sie auf dem Laufenden…"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Persönliche Nachricht an Ihre Kunden auf dem Portal-Dashboard.
              </p>
            </div>

            <LogoUpload currentUrl={logoUrl} onChange={setLogoUrl} />
          </div>
        </section>

        {/* Farben */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Farben</h2>
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Standard
            </button>
          </div>
          <div className="space-y-4">
            {FARBEN_FELDER.map((f) => (
              <FarbFeld
                key={f.key}
                label={f.label}
                beschreibung={f.beschreibung}
                value={(form[f.key] as string | null) ?? (def[f.key] as string)}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </section>

        {/* Schrift */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Schrift</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Schriftfamilie</label>
            <select
              value={form.font_family ?? def.font_family}
              onChange={(e) => set('font_family', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
            >
              {GOOGLE_FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">Wird im Firmenname-Label auf Freigabe- und Onboarding-Seiten verwendet.</p>
          </div>
        </section>

        {/* Kontaktdaten */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Kontaktdaten</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'email',    label: 'E-Mail',    placeholder: 'kontakt@beispiel.de', type: 'email' },
              { key: 'telefon',  label: 'Telefon',   placeholder: '+49 30 12345678',     type: 'tel'   },
              { key: 'website',  label: 'Website',   placeholder: 'https://beispiel.de', type: 'url'   },
              { key: 'adresse',  label: 'Adresse',   placeholder: 'Musterstraße 1, Berlin', type: 'text' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={(form[key as keyof typeof form] as string | null) ?? ''}
                  onChange={(e) => set(key as keyof Partial<Branding>, e.target.value || null)}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Impressum / Rechtliche Info</label>
              <textarea
                rows={2}
                value={form.impressum_text ?? ''}
                onChange={(e) => set('impressum_text', e.target.value || null)}
                placeholder="Optionaler Impressum-Text im Footer…"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Datenschutz-URL</label>
              <input
                type="url"
                value={form.datenschutz_url ?? ''}
                onChange={(e) => set('datenschutz_url', e.target.value || null)}
                placeholder="https://beispiel.de/datenschutz"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
          </div>
        </section>

        {/* Extras */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Extras</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('show_powered_by', !form.show_powered_by)}
                className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
                  form.show_powered_by ? 'bg-wellbeing-green' : 'bg-gray-200'
                }`}
                style={{ height: '22px' }}
              >
                <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${
                  form.show_powered_by ? 'translate-x-[18px]' : 'translate-x-0'
                }`}
                style={{ width: '18px', height: '18px' }}
                />
              </div>
              <div>
                <p className="text-sm text-gray-700 font-medium">&bdquo;Powered by Wellbeing Spaces&ldquo; anzeigen</p>
                <p className="text-xs text-gray-400">Footer-Hinweis auf Freigabe- und Onboarding-Seiten</p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Custom CSS
                <span className="ml-1 font-normal text-gray-400">(Erweitert)</span>
              </label>
              <textarea
                rows={4}
                value={form.custom_css ?? ''}
                onChange={(e) => set('custom_css', e.target.value || null)}
                placeholder=".freigabe-header { border-bottom: 2px solid var(--brand-primary); }"
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
              />
            </div>
          </div>
        </section>

        {/* Speichern */}
        <div className="flex items-center gap-3 pb-2">
          <button
            onClick={handleSpeichern}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Wird gespeichert…' : gespeichert ? 'Gespeichert ✓' : 'Speichern'}
          </button>
          {fehler && <p className="text-sm text-red-500">{fehler}</p>}
        </div>
      </div>

      {/* ── Rechte Spalte: Vorschau ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Live-Vorschau</h2>
          <button
            onClick={() => setVorschau((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            {vorschau ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {vorschau ? 'Ausblenden' : 'Einblenden'}
          </button>
        </div>
        {vorschau && (
          <Vorschau
            branding={{ ...form, logo_url: logoUrl } as Partial<Branding>}
            logoUrl={logoUrl}
          />
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700 font-medium mb-1">Hinweis</p>
          <p className="text-xs text-amber-600 leading-relaxed">
            Das Branding wird auf alle Freigabe-Links und Onboarding-Formulare angewendet. Änderungen sind sofort aktiv.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
