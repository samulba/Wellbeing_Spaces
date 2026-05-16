'use client'

import { useRef, useState } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { onboardingDateiHochladen, onboardingDateiEntfernen } from '@/app/actions/onboarding-uploads'
import type { OnboardingDatei } from '@/lib/supabase/types'

interface Props {
  token:       string
  frageId:     string
  wert:        OnboardingDatei[]           // Liste hochgeladener Dateien
  onChange:    (next: OnboardingDatei[]) => void
  erlaubteTypen?: string[]                  // z.B. ['image/*','application/pdf']
  maxMb?:        number                      // Default 25
  maxDateien?:   number                      // Default 5
  fehler?:       string
}

function bytesLesbar(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function istBild(mime: string): boolean {
  return mime.startsWith('image/')
}

export default function OnboardingUploadFeld({
  token, frageId, wert, onChange,
  erlaubteTypen, maxMb = 50, maxDateien = 5, fehler,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fehlerNachricht, setFehlerNachricht] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const liste = Array.isArray(wert) ? wert : []
  const accept = erlaubteTypen?.join(',') || 'image/*,application/pdf'
  const limit  = maxDateien

  async function dateienHochladen(dateien: FileList | null) {
    if (!dateien || dateien.length === 0) return
    setFehlerNachricht(null)
    setIsUploading(true)

    try {
      // Limit pruefen
      const noch = limit - liste.length
      if (noch <= 0) {
        setFehlerNachricht(`Maximal ${limit} Dateien erlaubt.`)
        return
      }
      const dateienArray = Array.from(dateien).slice(0, noch)

      const neu: OnboardingDatei[] = []
      for (const file of dateienArray) {
        // FormData-Pattern fuer zuverlaessigen File-Transport ueber Server-Action
        const fd = new FormData()
        fd.append('file', file)
        fd.append('token', token)
        fd.append('frageId', frageId ?? '')
        if (erlaubteTypen?.length) fd.append('erlaubteTypen', erlaubteTypen.join(','))
        fd.append('maxMb', String(maxMb))

        const res = await onboardingDateiHochladen(fd)
        if (!res.erfolg || !res.datei) {
          setFehlerNachricht(res.fehler ?? `Upload von "${file.name}" fehlgeschlagen.`)
          continue
        }
        neu.push(res.datei)
      }
      if (neu.length > 0) onChange([...liste, ...neu])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload-Fehler.'
      setFehlerNachricht(msg)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    await dateienHochladen(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    await dateienHochladen(e.dataTransfer.files)
  }

  async function handleEntfernen(datei: OnboardingDatei) {
    const vorher = liste
    onChange(liste.filter((d) => d.id !== datei.id))
    const res = await onboardingDateiEntfernen(token, datei.id)
    if (!res.erfolg) {
      onChange(vorher) // Rollback
      setFehlerNachricht(res.fehler ?? 'Datei konnte nicht entfernt werden.')
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-colors text-center ${
          dragOver
            ? 'border-wellbeing-green bg-wellbeing-green/5'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
        } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleSelect}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen…
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-700">
              <span className="font-medium text-wellbeing-green">Dateien auswaehlen</span> oder hierher ziehen
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {liste.length}/{limit} Dateien · max. {maxMb} MB pro Datei
            </p>
          </>
        )}
      </div>

      {liste.length > 0 && (
        <ul className="space-y-1.5">
          {liste.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
            >
              {istBild(d.dateityp) ? (
                <ImageIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{d.dateiname}</p>
                <p className="text-[11px] text-gray-400">{bytesLesbar(d.dateigroesse ?? 0)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleEntfernen(d)}
                className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                aria-label="Datei entfernen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {fehlerNachricht && <p className="text-xs text-amber-600">{fehlerNachricht}</p>}
      {fehler && <p className="text-xs text-red-500">{fehler}</p>}
    </div>
  )
}
