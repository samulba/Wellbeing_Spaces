'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Save, Upload, Eye, EyeOff, RotateCcw, Loader2, Check } from 'lucide-react'
import { brandingAktualisieren, brandingLogoHochladen, brandingHeroHochladen, type BrandingDaten } from '@/app/actions/branding'
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
  // Migration 066
  support_email:        null,
  footer_text:          null,
  hero_image_url:       null,
  accent_gradient_from: null,
  accent_gradient_to:   null,
  corner_style:         'soft',
  social_instagram:     null,
  social_website:       null,
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
  const bg        = branding.background_color  ?? DEFAULTS.background_color
  const prim      = branding.primary_color     ?? DEFAULTS.primary_color
  const sec       = branding.secondary_color   ?? DEFAULTS.secondary_color
  const accent    = branding.accent_color      ?? DEFAULTS.accent_color
  const text      = branding.text_color        ?? DEFAULTS.text_color
  const buttonTxt = branding.button_text_color ?? DEFAULTS.button_text_color
  const name      = branding.firmenname        ?? DEFAULTS.firmenname
  const slogan    = branding.slogan
  const font      = branding.font_family       ?? DEFAULTS.font_family
  const corner    = branding.corner_style      ?? 'soft'
  const radius    = corner === 'sharp' ? '6px' : corner === 'rounded' ? '20px' : '14px'
  const radiusSm  = corner === 'sharp' ? '4px' : corner === 'rounded' ? '14px' : '10px'
  const heroBg    = branding.hero_image_url
    ? `url("${branding.hero_image_url}") center/cover`
    : `linear-gradient(135deg, ${branding.accent_gradient_from ?? prim}, ${branding.accent_gradient_to ?? sec})`

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ fontFamily: font }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ backgroundColor: bg, borderColor: 'rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={26} height={26} className="rounded object-contain" />
          ) : (
            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: prim, color: buttonTxt }}>
              {name.charAt(0)}
            </div>
          )}
          <span className="text-sm font-bold tracking-tight" style={{ color: text }}>{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 font-medium" style={{ backgroundColor: accent, color: text, borderRadius: radiusSm }}>
            Mein Bereich
          </span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: prim, color: buttonTxt }}>
            MM
          </div>
        </div>
      </div>

      {/* Hero / Welcome */}
      <div className="relative px-5 py-6 text-white" style={{ background: heroBg }}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mb-1">Willkommen</p>
          <p className="text-base font-bold leading-tight">{slogan ?? `Schön, dass Sie bei ${name} sind.`}</p>
          <p className="text-[11px] opacity-80 mt-1.5 leading-snug">
            {branding.welcome_text ?? 'Hier finden Sie alle Produkte und Dokumente Ihres Projekts an einem Ort.'}
          </p>
          <button
            type="button"
            className="mt-3 text-[11px] font-semibold px-3 py-1.5"
            style={{ backgroundColor: prim, color: buttonTxt, borderRadius: radius }}
          >
            Zu meinen Produkten →
          </button>
        </div>
      </div>

      {/* Karten-Sektion */}
      <div className="px-4 py-4 grid grid-cols-2 gap-2.5" style={{ backgroundColor: bg }}>
        {[
          { label: 'Produkte',   wert: '12', sub: '8 freigegeben' },
          { label: 'Räume',      wert: '4',  sub: 'Wohn- & Schlafber.' },
        ].map((k) => (
          <div key={k.label} className="bg-white p-3 border border-gray-100" style={{ borderRadius: radiusSm }}>
            <p className="text-[9px] uppercase tracking-widest font-semibold text-gray-400">{k.label}</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: text }}>{k.wert}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Produkt-Karte mit Aktion */}
      <div className="px-4 pb-4" style={{ backgroundColor: bg }}>
        <div className="bg-white p-3 border border-gray-100" style={{ borderRadius: radiusSm }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0" style={{ backgroundColor: accent, borderRadius: radiusSm }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: text }}>Eames Lounge Chair</p>
              <p className="text-[10px] text-gray-400">Sessel · Wohnzimmer</p>
              <p className="text-[11px] font-bold mt-0.5" style={{ color: prim }}>4.290 €</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-3">
            <button
              type="button"
              className="flex-1 text-[10px] font-semibold py-1.5"
              style={{ backgroundColor: prim, color: buttonTxt, borderRadius: radiusSm }}
            >
              Freigeben
            </button>
            <button
              type="button"
              className="flex-1 text-[10px] font-medium py-1.5 border border-gray-200 text-gray-500"
              style={{ borderRadius: radiusSm }}
            >
              Ablehnen
            </button>
          </div>
        </div>
      </div>

      {/* Sekundär-Akzent + Tag */}
      <div className="px-4 pb-4 flex items-center gap-1.5 flex-wrap" style={{ backgroundColor: bg }}>
        <span className="text-[10px] px-2 py-0.5 font-medium" style={{ backgroundColor: prim, color: buttonTxt, borderRadius: radiusSm }}>
          Primärfarbe
        </span>
        <span className="text-[10px] px-2 py-0.5 font-medium" style={{ backgroundColor: sec, color: text, borderRadius: radiusSm }}>
          Sekundär
        </span>
        <span className="text-[10px] px-2 py-0.5 font-medium border" style={{ backgroundColor: accent, color: text, borderColor: 'rgba(0,0,0,0.06)', borderRadius: radiusSm }}>
          Akzent
        </span>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ backgroundColor: bg, borderColor: 'rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]" style={{ color: text, opacity: 0.7 }}>
          <span>{branding.footer_text ?? `© ${new Date().getFullYear()} ${name}`}</span>
          {branding.support_email && <span className="truncate">{branding.support_email}</span>}
        </div>
        {branding.show_powered_by && (
          <p className="text-[9px] text-center mt-1.5" style={{ color: text, opacity: 0.4 }}>
            Powered by Wellbeing Spaces
          </p>
        )}
      </div>
    </div>
  )
}

// ── Logo-Upload ───────────────────────────────────────────────
function LogoUpload({ currentUrl, onChange }: { currentUrl: string | null; onChange: (url: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const anzeigeUrl = preview ?? currentUrl

  function handleFile(file: File) {
    setFehler(null)
    setErfolg(false)
    if (!file.type.startsWith('image/')) { setFehler('Nur Bilddateien sind erlaubt.'); return }
    if (file.size > 50 * 1024 * 1024)    { setFehler('Datei ist zu groß (max. 50 MB).'); return }

    // Live-Vorschau
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('logo', file)

    startTransition(async () => {
      const res = await brandingLogoHochladen(null, formData)
      if (res?.fehler) {
        setFehler(res.fehler)
        setPreview(null)
      } else if (res?.url) {
        onChange(res.url)
        setPreview(null)  // echte URL übernimmt
        setErfolg(true)
        setTimeout(() => setErfolg(false), 2200)
      }
    })
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Logo</label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => !isPending && inputRef.current?.click()}
          className="relative group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-wellbeing-green/40 rounded-xl"
          title="Logo hochladen"
        >
          {anzeigeUrl ? (
            <div className="w-20 h-20 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center shadow-sm">
              <Image src={anzeigeUrl} alt="Logo" width={80} height={80} className="max-w-full max-h-full object-contain" unoptimized />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 hover:border-wellbeing-green hover:bg-wellbeing-cream/30 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-500 font-medium">Hochladen</span>
            </div>
          )}
          {anzeigeUrl && (
            <span className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {isPending
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Upload className="w-5 h-5" />}
            </span>
          )}
          {erfolg && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white shadow">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => !isPending && inputRef.current?.click()}
            disabled={isPending}
            className="text-sm font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
          >
            {isPending ? 'Wird hochgeladen…' : anzeigeUrl ? 'Logo ändern' : 'Logo hochladen'}
          </button>
          <p className="text-[11px] text-gray-400 mt-0.5">
            PNG, JPG, SVG, WebP · max. 50 MB · wird bei Auswahl automatisch gespeichert
          </p>
          {fehler && <p className="text-[11px] text-red-500 mt-1">{fehler}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          // Input zurücksetzen — damit dieselbe Datei nochmal gewählt werden kann
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── Hero-Image-Upload ────────────────────────────────────────
function HeroImageUpload({ currentUrl, onChange }: { currentUrl: string | null; onChange: (url: string | null) => void }) {
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler]   = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const anzeigeUrl = preview ?? currentUrl

  function handleFile(file: File) {
    setFehler(null)
    if (!file.type.startsWith('image/')) { setFehler('Nur Bilddateien sind erlaubt.'); return }
    if (file.size > 50 * 1024 * 1024)    { setFehler('Datei ist zu groß (max. 50 MB).'); return }

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('hero', file)

    startTransition(async () => {
      const res = await brandingHeroHochladen(null, formData)
      if (res?.fehler) { setFehler(res.fehler); setPreview(null) }
      else if (res?.url) { onChange(res.url); setPreview(null) }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => !isPending && inputRef.current?.click()}
        className="relative group block w-full aspect-[16/6] rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 hover:border-wellbeing-green transition-colors"
        title="Hero-Bild hochladen"
      >
        {anzeigeUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={anzeigeUrl} alt="Hero-Vorschau" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Hero-Bild hochladen</span>
            <span className="text-[10px] text-gray-400">empfohlen: 1600×600</span>
          </div>
        )}
        {anzeigeUrl && (
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            {isPending
              ? <Loader2 className="w-6 h-6 animate-spin" />
              : <Upload className="w-6 h-6" />}
          </span>
        )}
      </button>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-gray-400">
          PNG, JPG, WebP · max. 50 MB · wird automatisch gespeichert
        </p>
        {anzeigeUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={isPending}
            className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Entfernen
          </button>
        )}
      </div>
      {fehler && <p className="text-[11px] text-red-500 mt-1">{fehler}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
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
    // Migration 066
    support_email:        initial?.support_email        ?? null,
    footer_text:          initial?.footer_text          ?? null,
    hero_image_url:       initial?.hero_image_url       ?? null,
    accent_gradient_from: initial?.accent_gradient_from ?? null,
    accent_gradient_to:   initial?.accent_gradient_to   ?? null,
    corner_style:         initial?.corner_style         ?? 'soft',
    social_instagram:     initial?.social_instagram     ?? null,
    social_website:       initial?.social_website       ?? null,
  })
  const [logoUrl,      setLogoUrl]      = useState(initial?.logo_url ?? null)
  const [vorschau,     setVorschau]     = useState(true)
  const [gespeichert,  setGespeichert]  = useState(false)
  const [fehler,       setFehler]       = useState<string | null>(null)
  const [confirmReset,      setConfirmReset]      = useState(false)
  const [confirmResetAlles, setConfirmResetAlles] = useState(false)
  const [isPending,         startTransition]      = useTransition()

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
        // Migration 066
        support_email:        form.support_email        ?? null,
        footer_text:          form.footer_text          ?? null,
        hero_image_url:       form.hero_image_url       ?? null,
        accent_gradient_from: form.accent_gradient_from ?? null,
        accent_gradient_to:   form.accent_gradient_to   ?? null,
        corner_style:         form.corner_style         ?? 'soft',
        social_instagram:     form.social_instagram     ?? null,
        social_website:       form.social_website       ?? null,
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

  /** Alles komplett auf Wellbeing-Spaces-Default zurücksetzen. */
  function handleResetAlles() {
    setForm({
      firmenname:        def.firmenname,
      button_text_color: def.button_text_color,
      welcome_text:      def.welcome_text,
      slogan:            def.slogan,
      primary_color:     def.primary_color,
      secondary_color:   def.secondary_color,
      accent_color:      def.accent_color,
      background_color:  def.background_color,
      text_color:        def.text_color,
      font_family:       def.font_family,
      email:             null,
      telefon:           null,
      website:           null,
      adresse:           null,
      impressum_text:    null,
      datenschutz_url:   null,
      show_powered_by:   def.show_powered_by,
      custom_css:        null,
      support_email:        null,
      footer_text:          null,
      hero_image_url:       null,
      accent_gradient_from: null,
      accent_gradient_to:   null,
      corner_style:         def.corner_style,
      social_instagram:     null,
      social_website:       null,
    })
    setLogoUrl(null)
    setGespeichert(false)
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
    <ConfirmModal
      isOpen={confirmResetAlles}
      onClose={() => setConfirmResetAlles(false)}
      onConfirm={() => { handleResetAlles(); setConfirmResetAlles(false) }}
      title="Alles auf Wellbeing Spaces Standard zurücksetzen"
      message="Firmenname, Slogan, Farben, Schriftart, Hero-Bild, Logo, Kontaktdaten und alle anderen Felder werden auf die Wellbeing-Spaces-Standardwerte zurückgesetzt. Die Änderung wird erst aktiv wenn du danach auf „Speichern“ klickst — du kannst sie also noch zurückrollen."
      confirmText="Ja, alles zurücksetzen"
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

        {/* Layout & Ecken */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Layout-Stil</h2>
          <p className="text-xs text-gray-500 mb-4">Wie stark sollen Ecken im Portal gerundet sein?</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { w: 'sharp',   l: 'Kantig',   r: '6px',   desc: 'Minimalistisch, streng' },
              { w: 'soft',    l: 'Weich',    r: '14px',  desc: 'Ausgewogen (Standard)' },
              { w: 'rounded', l: 'Rundlich', r: '20px',  desc: 'Verspielt, weich' },
            ] as const).map((opt) => {
              const aktiv = (form.corner_style ?? 'soft') === opt.w
              return (
                <button
                  key={opt.w}
                  type="button"
                  onClick={() => set('corner_style', opt.w)}
                  className={`text-left p-4 border transition-all ${
                    aktiv
                      ? 'border-wellbeing-green bg-wellbeing-cream/50 ring-2 ring-wellbeing-green/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  style={{ borderRadius: opt.r }}
                >
                  <div
                    className="w-full h-8 bg-gray-100 mb-2"
                    style={{ borderRadius: opt.r }}
                  />
                  <p className="text-xs font-semibold text-gray-800">{opt.l}</p>
                  <p className="text-[10px] text-gray-400">{opt.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Hero-Bild + Akzent-Gradient */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Hero-Hintergrund</h2>
            <p className="text-xs text-gray-500 mb-4">
              Optionaler Bild-Hintergrund für Portal-Login + Dashboard-Hero.
              Alternativ zum Primary-Gradient.
            </p>
            <HeroImageUpload
              currentUrl={form.hero_image_url ?? null}
              onChange={(url) => set('hero_image_url', url)}
            />
          </div>

          <div className="pt-5 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-800 mb-3">Akzent-Verlauf (Gradient)</h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Zwei Farben für Brand-Verläufe auf Hero-Kacheln. Leer lassen → Primärfarbe + Sekundärfarbe werden genutzt.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FarbFeld
                label="Von"
                beschreibung="Start-Farbe"
                value={form.accent_gradient_from ?? ''}
                onChange={(v) => set('accent_gradient_from', v || null)}
              />
              <FarbFeld
                label="Bis"
                beschreibung="End-Farbe"
                value={form.accent_gradient_to ?? ''}
                onChange={(v) => set('accent_gradient_to', v || null)}
              />
            </div>
          </div>
        </section>

        {/* Portal-Texte & Support */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Portal-Texte</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Support-E-Mail <span className="text-gray-400 font-normal">im Portal-Footer sichtbar</span>
            </label>
            <input
              type="email"
              value={form.support_email ?? ''}
              onChange={(e) => set('support_email', e.target.value || null)}
              placeholder="hello@dein-studio.de"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Footer-Text <span className="text-gray-400 font-normal">optional</span>
            </label>
            <textarea
              value={form.footer_text ?? ''}
              onChange={(e) => set('footer_text', e.target.value || null)}
              rows={2}
              maxLength={200}
              placeholder="© 2026 Mein Studio · Alle Rechte vorbehalten"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Instagram</label>
              <input
                type="text"
                value={form.social_instagram ?? ''}
                onChange={(e) => set('social_instagram', e.target.value || null)}
                placeholder="@mein_studio oder URL"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Website</label>
              <input
                type="text"
                value={form.social_website ?? ''}
                onChange={(e) => set('social_website', e.target.value || null)}
                placeholder="https://dein-studio.de"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
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

        {/* Speichern + Zurücksetzen */}
        <div className="flex items-center gap-3 pb-2 flex-wrap">
          <button
            onClick={handleSpeichern}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Wird gespeichert…' : gespeichert ? 'Gespeichert ✓' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmResetAlles(true)}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-xl transition-colors disabled:opacity-50"
            title="Alle Branding-Einstellungen auf Wellbeing Spaces Standard zurücksetzen"
          >
            <RotateCcw className="w-4 h-4" />
            Auf Standard zurücksetzen
          </button>
          {fehler && <p className="text-sm text-red-500">{fehler}</p>}
        </div>
      </div>

      {/* ── Rechte Spalte: Vorschau (sticky beim Scrollen) ── */}
      <div className="xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-92px)] xl:overflow-y-auto xl:pr-1 self-start space-y-4">
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
