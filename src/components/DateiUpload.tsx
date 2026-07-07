'use client'

import { useState, useCallback, useRef } from 'react'
import { dateiHochladen, dateiLoeschen, dateiSignierteUrl } from '@/app/actions/dateien'
import { Upload, File, FileImage, Trash2, Loader2, ExternalLink, Eye } from 'lucide-react'
import FilePreviewModal from '@/components/FilePreviewModal'
import { kannInlineVorschau } from '@/lib/file-mime'

export type DateiItem = {
  id: string
  datei_name: string
  datei_url: string
  datei_typ: string
  dateigroesse: number
  storage_pfad?: string
}

interface Props {
  projektId: string
  initialDateien: DateiItem[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DateiIcon({ typ }: { typ: string }) {
  if (typ.startsWith('image/')) return <FileImage className="w-4 h-4 text-wellbeing-green-light shrink-0" />
  return <File className="w-4 h-4 text-gray-400 shrink-0" />
}

export default function DateiUpload({ projektId, initialDateien }: Props) {
  const [dateien, setDateien] = useState<DateiItem[]>(initialDateien)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [preview, setPreview] = useState<DateiItem | null>(null)
  const [oeffneId, setOeffneId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadDatei = useCallback(async (file: File) => {
    const erlaubteTypen = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!erlaubteTypen.includes(file.type)) {
      setFehler('Nur JPG, PNG, WebP und PDF sind erlaubt.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFehler('Datei darf maximal 10 MB groß sein.')
      return
    }

    setFehler(null)
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('projektId', projektId)

    const result = await dateiHochladen(fd)
    if (!result.id) {
      setFehler(result.fehler ?? 'Upload fehlgeschlagen. Bitte erneut versuchen.')
      setUploading(false)
      return
    }
    const neu: DateiItem = {
      id: result.id,
      datei_name: file.name,
      datei_url: result.storage_pfad ?? '',
      datei_typ: file.type,
      dateigroesse: file.size,
      storage_pfad: result.storage_pfad,
    }
    setDateien((prev) => [...prev, neu])
    setUploading(false)
  }, [projektId])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    for (const file of Array.from(e.dataTransfer.files)) {
      await uploadDatei(file)
    }
  }, [uploadDatei])

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(e.target.files ?? [])) {
      await uploadDatei(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [uploadDatei])

  const handleLoeschen = useCallback(async (datei: DateiItem) => {
    setDateien((prev) => prev.filter((d) => d.id !== datei.id))
    await dateiLoeschen(datei.id)
  }, [])

  const oeffnen = useCallback(async (datei: DateiItem) => {
    setOeffneId(datei.id)
    const res = await dateiSignierteUrl(datei.id)
    setOeffneId(null)
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer')
    else setFehler('Datei konnte nicht geöffnet werden.')
  }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
        Dateien {dateien.length > 0 && <span className="text-gray-400 font-normal">({dateien.length})</span>}
      </h2>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 ${
          dragOver
            ? 'border-wellbeing-green-light bg-wellbeing-cream'
            : 'border-gray-200 hover:border-wellbeing-green-light hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-wellbeing-green py-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Wird hochgeladen…</span>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Hierher ziehen oder{' '}
              <span className="text-wellbeing-green font-medium">klicken</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG · PNG · PDF · max. 10 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {fehler && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <span>⚠</span> {fehler}
        </p>
      )}

      {/* Dateiliste */}
      {dateien.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {dateien.map((datei) => {
            const vorschauOk = kannInlineVorschau(datei.datei_typ)
            return (
              <li
                key={datei.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 group"
              >
                <button
                  type="button"
                  onClick={() => vorschauOk && setPreview(datei)}
                  disabled={!vorschauOk}
                  className={`flex items-center gap-3 flex-1 min-w-0 text-left ${vorschauOk ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <DateiIcon typ={datei.datei_typ} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium text-gray-700 truncate leading-snug ${vorschauOk ? 'group-hover:text-wellbeing-green' : ''}`}>
                      {datei.datei_name}
                    </p>
                    <p className="text-[10px] text-gray-400">{formatSize(datei.dateigroesse)}</p>
                  </div>
                </button>
                {vorschauOk && (
                  <button
                    type="button"
                    onClick={() => setPreview(datei)}
                    className="text-gray-300 hover:text-wellbeing-green transition-colors shrink-0"
                    aria-label="Vorschau"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => oeffnen(datei)}
                  disabled={oeffneId === datei.id}
                  className="text-gray-300 hover:text-wellbeing-green transition-colors shrink-0 disabled:opacity-50"
                  aria-label="In neuem Tab öffnen"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleLoeschen(datei)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  aria-label="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {preview && (
        <FilePreviewModal
          dateiname={preview.datei_name}
          mimeType={preview.datei_typ}
          urlFetcher={() => dateiSignierteUrl(preview.id).then((r) => r.url ?? null)}
          groesse={preview.dateigroesse}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
