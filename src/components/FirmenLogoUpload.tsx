'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, AlertCircle, Check, Building2 } from 'lucide-react'
import { firmenLogoHochladen } from '@/app/actions/logo-upload'

const MAX_MB = 50
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

export default function FirmenLogoUpload({
  initialUrl,
  firmenname,
  disabled,
}: {
  initialUrl: string | null
  firmenname: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [url, setUrl]       = useState<string | null>(initialUrl)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function onPick(file: File) {
    setFehler(null)
    setErfolg(false)
    if (!file.type.startsWith('image/')) { setFehler('Nur Bilddateien sind erlaubt.'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setFehler(`Datei ist zu groß (max. ${MAX_MB} MB).`); return }

    // Live-Preview
    const reader = new FileReader()
    reader.onload = (ev) => setUrl(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('logo', file)
    startTransition(async () => {
      const res = await firmenLogoHochladen(null, formData)
      if (res?.fehler) {
        setFehler(res.fehler)
        setUrl(initialUrl)
      } else if (res?.url) {
        setUrl(res.url)
        setErfolg(true)
        setTimeout(() => setErfolg(false), 2200)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => !disabled && !isPending && inputRef.current?.click()}
        disabled={disabled}
        className="relative group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-wellbeing-green/40 rounded-2xl disabled:cursor-not-allowed"
        title={disabled ? 'Nur Admins dürfen das Firmenlogo ändern' : 'Firmenlogo ändern'}
      >
        {url ? (
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm flex items-center justify-center p-2">
            <Image
              src={url}
              alt={`Logo ${firmenname}`}
              width={76}
              height={76}
              className="max-w-full max-h-full object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-wellbeing-green/10 flex items-center justify-center border border-wellbeing-green/20">
            <Building2 className="w-8 h-8 text-wellbeing-green" />
          </div>
        )}

        {/* Hover-Overlay (nur wenn nicht disabled) */}
        {!disabled && (
          <span className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            {isPending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Camera className="w-5 h-5" />}
          </span>
        )}

        {/* Success-State */}
        {erfolg && (
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white shadow">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </span>
        )}
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => !disabled && !isPending && inputRef.current?.click()}
          disabled={disabled || isPending}
          className="text-sm font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Wird hochgeladen…' : url ? 'Firmenlogo ändern' : 'Firmenlogo hochladen'}
        </button>
        <p className="text-[11px] text-gray-400 mt-0.5">
          PNG, JPG, WebP, SVG · max. {MAX_MB} MB
        </p>
        {fehler && (
          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fehler}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
        }}
      />
    </div>
  )
}
