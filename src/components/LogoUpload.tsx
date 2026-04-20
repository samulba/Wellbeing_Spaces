'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Pencil, UploadCloud, X, ImageIcon, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { kundeLogoHochladen, partnerLogoHochladen } from '@/app/actions/logo-upload'

interface Props {
  typ: 'kunde' | 'partner'
  entityId: string
  initialLogoUrl: string | null
  name: string
}

const avatarFarben = [
  'bg-wellbeing-green', 'bg-violet-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
]
function avatarFarbe(s: string) { return avatarFarben[s.charCodeAt(0) % avatarFarben.length] }
function initials(name: string) { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) }

const MAX_MB = 10
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

export default function LogoUpload({ typ, entityId, initialLogoUrl, name }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <AvatarTrigger logoUrl={logoUrl} name={name} onOpen={() => setModalOpen(true)} />
      {modalOpen && (
        <UploadModal
          typ={typ}
          entityId={entityId}
          name={name}
          currentLogoUrl={logoUrl}
          onClose={() => setModalOpen(false)}
          onUploaded={(url) => setLogoUrl(url)}
        />
      )}
    </>
  )
}

// ── Avatar im Header ────────────────────────────────────────────

function AvatarTrigger({ logoUrl, name, onOpen }: { logoUrl: string | null; name: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Logo bearbeiten"
      className="relative group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-wellbeing-green/40 rounded-xl"
    >
      {logoUrl ? (
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <Image src={logoUrl} alt={name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
        </div>
      ) : (
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm ${avatarFarbe(name)}`}>
          {initials(name)}
        </div>
      )}
      <span
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 group-hover:border-wellbeing-green group-hover:text-wellbeing-green transition-colors"
        aria-hidden
      >
        <Pencil className="w-3 h-3" strokeWidth={2.2} />
      </span>
    </button>
  )
}

// ── Upload Modal ────────────────────────────────────────────────

function UploadModal({
  typ, entityId, name, currentLogoUrl, onClose, onUploaded,
}: {
  typ: 'kunde' | 'partner'
  entityId: string
  name: string
  currentLogoUrl: string | null
  onClose: () => void
  onUploaded: (url: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function validateAndUpload(file: File) {
    setFehler(null)
    setErfolg(false)
    if (!file.type.startsWith('image/')) { setFehler('Nur Bilddateien sind erlaubt.'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setFehler(`Datei ist zu groß (max. ${MAX_MB} MB).`); return }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('logo', file)

    startTransition(async () => {
      const action = typ === 'kunde'
        ? kundeLogoHochladen.bind(null, entityId)
        : partnerLogoHochladen.bind(null, entityId)
      const result = await action(null, formData)
      if (result?.fehler) {
        setFehler(result.fehler)
        setPreview(null)
        setFileName(null)
      } else if (result?.url) {
        onUploaded(result.url)
        setErfolg(true)
        setTimeout(onClose, 900)
      }
    })
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndUpload(file)
  }

  const anzeigeUrl = preview ?? currentLogoUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logo-upload-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 id="logo-upload-title" className="font-syne font-bold text-[18px] text-wellbeing-green-dark">Logo verwalten</h3>
            <p className="text-[12px] text-gray-400 mt-0.5 truncate max-w-[320px]">{name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Preview + Drop-Zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !isPending && inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              dragActive
                ? 'border-wellbeing-green bg-wellbeing-green/5'
                : erfolg
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : fehler
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-wellbeing-green-light hover:bg-wellbeing-cream/30'
            }`}
          >
            {anzeigeUrl ? (
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                  <Image src={anzeigeUrl} alt="Logo Vorschau" width={112} height={112} className="w-full h-full object-cover" unoptimized />
                </div>
                {isPending && (
                  <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-wellbeing-green animate-spin" />
                  </div>
                )}
                {erfolg && (
                  <div className="absolute inset-0 bg-emerald-500/90 rounded-2xl flex items-center justify-center">
                    <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <ImageIcon className="w-10 h-10 text-gray-300" strokeWidth={1.4} />
              </div>
            )}

            <div className="text-center pointer-events-none">
              <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-wellbeing-green-dark">
                <UploadCloud className="w-4 h-4" />
                {anzeigeUrl ? 'Anderes Logo wählen' : 'Logo hochladen'}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Ziehen & ablegen oder klicken
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                PNG · JPG · WebP · SVG · max. {MAX_MB} MB
              </p>
            </div>

            {fileName && !erfolg && (
              <p className="text-[11px] text-gray-500 truncate max-w-full pointer-events-none">{fileName}</p>
            )}
          </div>

          {fehler && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-600">{fehler}</p>
            </div>
          )}

          {erfolg && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              <p className="text-[13px] text-emerald-700 font-medium">Logo erfolgreich hochgeladen</p>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex items-center justify-between pt-1">
            {currentLogoUrl ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  // Löschen nicht implementiert auf Server-Seite; User soll einfach neues Logo hochladen.
                  setFehler('Zum Entfernen bitte ein neues Logo hochladen – Löschen ist aktuell nicht verfügbar.')
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Logo entfernen
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) validateAndUpload(f)
          }}
        />
      </div>
    </div>
  )
}
