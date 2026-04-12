'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Upload } from 'lucide-react'
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

export default function LogoUpload({ typ, entityId, initialLogoUrl, name }: Props) {
  const [logoUrl, setLogoUrl]   = useState(initialLogoUrl)
  const [preview, setPreview]   = useState<string | null>(null)
  const [fehler, setFehler]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setFehler('Datei ist zu groß (max. 2 MB).'); return }

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('logo', file)

    setFehler(null)
    startTransition(async () => {
      const action = typ === 'kunde'
        ? kundeLogoHochladen.bind(null, entityId)
        : partnerLogoHochladen.bind(null, entityId)
      const result = await action(null, formData)
      if (result?.fehler) {
        setFehler(result.fehler)
        setPreview(null)
      } else if (result?.url) {
        setLogoUrl(result.url)
        setPreview(null)
      }
    })
  }

  const anzeigeUrl = preview ?? logoUrl

  return (
    <div className="flex items-center gap-4">
      {/* Avatar / Logo */}
      <div className="relative group">
        {anzeigeUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
            <Image src={anzeigeUrl} alt={name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
          </div>
        ) : (
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0 ${avatarFarbe(name)}`}>
            {initials(name)}
          </div>
        )}

        {/* Upload-Overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Logo hochladen"
        >
          {isPending
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Upload className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
        >
          {isPending ? 'Wird hochgeladen…' : logoUrl ? 'Logo ändern' : 'Logo hochladen'}
        </button>
        <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG, WebP · max. 2 MB</p>
        {fehler && <p className="text-[11px] text-red-500 mt-0.5">{fehler}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
