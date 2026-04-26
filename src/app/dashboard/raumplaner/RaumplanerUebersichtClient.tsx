'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, LayoutDashboard, PenTool, FileDown, LayoutGrid, List, ChevronDown,
  Download, X, FileText, Image as ImageIcon, Palette,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import GrundrissVorschau from '@/components/raumplaner/GrundrissVorschau'
import type { RaumMitProjekt } from './page'

type SortBy      = 'name' | 'updated' | 'created'
type ViewMode    = 'grid' | 'list'
type ExportFmt   = 'pdf' | 'png' | 'jpg'
type ExportRes   = 1 | 2 | 4

interface Projekt {
  id: string
  name: string
  kunden: { id: string; name: string } | null
}

interface Props {
  raeume: RaumMitProjekt[]
  projekte: Projekt[]
}

// ── PDF-Export ─────────────────────────────────────────────────

async function grundrissPdfExport(raum: RaumMitProjekt) {
  if (!raum.grundriss_json) return

  const [fabric, { default: jsPDF }] = await Promise.all([
    import('fabric'),
    import('jspdf'),
  ])
  const { Canvas, Rect } = fabric

  const el = document.createElement('canvas')
  el.style.display = 'none'
  document.body.appendChild(el)

  const PDF_W = 1120
  const PDF_H = 792
  el.width  = PDF_W
  el.height = PDF_H

  const canvas = new Canvas(el, {
    width: PDF_W, height: PDF_H,
    selection: false, interactive: false,
    renderOnAddRemove: false,
    backgroundColor: '#ffffff',
  })

  try {
    const parsed = raum.grundriss_json as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SKIP = new Set(['outline', 'preview', 'gridLine', 'floor', 'dimension', 'collision'])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects = ((parsed.objects ?? []) as any[]).filter((o: any) => !SKIP.has(o.data?.type))
    await canvas.loadFromJSON({ ...parsed, objects })

    const SCALE = 100
    if (raum.breite_m && raum.laenge_m) {
      const outline = new Rect({
        left: 0, top: 0,
        width: raum.breite_m * SCALE, height: raum.laenge_m * SCALE,
        fill: 'transparent', stroke: '#374151', strokeWidth: 20,
        selectable: false, evented: false,
      })
      canvas.add(outline)
      canvas.sendObjectToBack(outline)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allObjs = canvas.getObjects() as any[]
    if (allObjs.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      allObjs.forEach((o) => {
        const b = o.getBoundingRect()
        minX = Math.min(minX, b.left);       minY = Math.min(minY, b.top)
        maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
      })
      const pad = 60
      const z = Math.min(
        (PDF_W - pad * 2) / (maxX - minX || 1),
        (PDF_H - pad * 2) / (maxY - minY || 1),
        1
      )
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
      canvas.setViewportTransform([z, 0, 0, z, PDF_W / 2 - cx * z, PDF_H / 2 - cy * z])
    }

    canvas.requestRenderAll()
    const imgData = canvas.toDataURL({ format: 'png', multiplier: 1 })

    const pdf   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    pdf.setFillColor(68, 92, 73)
    pdf.rect(0, 0, pageW, 14, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(raum.name, 10, 9.5)

    if (raum.breite_m && raum.laenge_m) {
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      const massText = `${raum.breite_m} m × ${raum.laenge_m} m${raum.hoehe_m ? ` · H ${raum.hoehe_m} m` : ''}`
      pdf.text(massText, pageW - 10, 9.5, { align: 'right' })
    }

    const imgY = 18
    pdf.addImage(imgData, 'PNG', 0, imgY, pageW, pageH - imgY - 4, undefined, 'FAST')
    pdf.save(`Grundriss-${raum.name}.pdf`)
  } finally {
    canvas.dispose()
    document.body.removeChild(el)
  }
}

// ── Bild-Export ────────────────────────────────────────────────

async function grundrissImageExport(raum: RaumMitProjekt, format: 'png' | 'jpg', resolution: ExportRes) {
  if (!raum.grundriss_json) return

  const fabric = await import('fabric')
  const { Canvas, Rect } = fabric

  const el = document.createElement('canvas')
  el.style.display = 'none'
  document.body.appendChild(el)

  const BASE_W = 1120
  const BASE_H = 792
  el.width  = BASE_W
  el.height = BASE_H

  const canvas = new Canvas(el, {
    width: BASE_W, height: BASE_H,
    selection: false, interactive: false,
    renderOnAddRemove: false,
    backgroundColor: '#ffffff',
  })

  try {
    const parsed = raum.grundriss_json as Record<string, unknown>
    const SKIP = new Set(['outline', 'preview', 'gridLine', 'floor', 'dimension', 'collision'])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects = ((parsed.objects ?? []) as any[]).filter((o: any) => !SKIP.has(o.data?.type))
    await canvas.loadFromJSON({ ...parsed, objects })

    const SCALE = 100
    if (raum.breite_m && raum.laenge_m) {
      const outline = new Rect({
        left: 0, top: 0,
        width: raum.breite_m * SCALE, height: raum.laenge_m * SCALE,
        fill: 'transparent', stroke: '#374151', strokeWidth: 20,
        selectable: false, evented: false,
      })
      canvas.add(outline)
      canvas.sendObjectToBack(outline)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allObjs = canvas.getObjects() as any[]
    if (allObjs.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      allObjs.forEach((o) => {
        const b = o.getBoundingRect()
        minX = Math.min(minX, b.left);       minY = Math.min(minY, b.top)
        maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
      })
      const pad = 40
      const z = Math.min(
        (BASE_W - pad * 2) / (maxX - minX || 1),
        (BASE_H - pad * 2) / (maxY - minY || 1),
        1
      )
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
      canvas.setViewportTransform([z, 0, 0, z, BASE_W / 2 - cx * z, BASE_H / 2 - cy * z])
    }

    canvas.requestRenderAll()
    const dataUrl = canvas.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', multiplier: resolution })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `Grundriss-${raum.name}.${format}`
    a.click()
  } finally {
    canvas.dispose()
    document.body.removeChild(el)
  }
}

// ── Haupt-Komponente ───────────────────────────────────────────

export default function RaumplanerUebersichtClient({ raeume, projekte }: Props) {
  const [searchQuery,      setSearchQuery]      = useState('')
  const [selectedProjekt,  setSelectedProjekt]  = useState('')
  const [sortBy,           setSortBy]           = useState<SortBy>('updated')
  const [viewMode,         setViewMode]         = useState<ViewMode>('grid')

  // Export-Modal State (auf Haupt-Ebene, damit kein Re-mount)
  const [exportRaum,       setExportRaum]       = useState<RaumMitProjekt | null>(null)
  const [exportFormat,     setExportFormat]     = useState<ExportFmt>('pdf')
  const [exportResolution, setExportResolution] = useState<ExportRes>(2)
  const [exportLoading,    setExportLoading]    = useState(false)

  function openExportModal(raum: RaumMitProjekt) {
    setExportRaum(raum)
    setExportFormat('pdf')
    setExportResolution(2)
  }

  async function handleExport() {
    if (!exportRaum) return
    setExportLoading(true)
    try {
      if (exportFormat === 'pdf') {
        await grundrissPdfExport(exportRaum)
      } else {
        await grundrissImageExport(exportRaum, exportFormat, exportResolution)
      }
    } finally {
      setExportLoading(false)
      setExportRaum(null)
    }
  }

  const gefiltert = useMemo(() => {
    let result = [...raeume]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (selectedProjekt) {
      result = result.filter((r) => r.projekte?.id === selectedProjekt)
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'de'))
    } else if (sortBy === 'updated') {
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    } else if (sortBy === 'created') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [raeume, searchQuery, selectedProjekt, sortBy])

  const mitGrundriss   = gefiltert.filter((r) =>  r.grundriss_json)
  const ohneGrundriss  = gefiltert.filter((r) => !r.grundriss_json)
  const totalGrundriss = raeume.filter((r) =>  r.grundriss_json).length

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">

      {/* Sticky Header (Titel + Toolbar) — deckt oben vollständig ab, kein Gap */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100 px-6 pt-4 pb-3">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Raumplaner</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {raeume.length} {raeume.length === 1 ? 'Raum' : 'Räume'} gesamt
            {' · '}{totalGrundriss} mit Grundriss
            {' · '}{raeume.length - totalGrundriss} ohne Grundriss
          </p>
        </div>

        {/* Toolbar: Suche + Filter + Sortierung + View-Toggle */}
        <div className="flex flex-wrap gap-2">
          {/* Suchfeld */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Raum suchen..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49] transition-colors"
            />
          </div>

          {/* Projekt-Filter */}
          <div className="relative">
            <select
              value={selectedProjekt}
              onChange={(e) => setSelectedProjekt(e.target.value)}
              className="appearance-none pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49] transition-colors"
            >
              <option value="">Alle Projekte</option>
              {projekte.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Sortierung */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="appearance-none pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49] transition-colors"
            >
              <option value="updated">Zuletzt bearbeitet</option>
              <option value="name">Name A–Z</option>
              <option value="created">Erstelldatum</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Grid / Listen-Toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Kachelansicht"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Listenansicht"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">

      {/* Keine Räume insgesamt */}
      {raeume.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <LayoutDashboard className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Noch keine Räume vorhanden</p>
          <p className="text-xs text-gray-400 mt-1">Lege zuerst ein Projekt mit Räumen an</p>
          <Link href="/dashboard/projekte" className="inline-block mt-4 text-sm text-[#445c49] underline underline-offset-2">
            Zu den Projekten
          </Link>
        </div>
      )}

      {/* Keine Treffer nach Filter/Suche */}
      {raeume.length > 0 && gefiltert.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Kein Raum entspricht der Suche</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedProjekt('') }}
            className="mt-3 text-sm text-[#445c49] underline underline-offset-2"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* ── GRID-ANSICHT ── */}
      {viewMode === 'grid' && (
        <>
          {mitGrundriss.length > 0 && (
            <section className="mb-8">
              <SektionsTitel label="Grundrisse" count={mitGrundriss.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mitGrundriss.map((raum) => (
                  <RaumCard key={raum.id} raum={raum} onExport={openExportModal} />
                ))}
              </div>
            </section>
          )}
          {ohneGrundriss.length > 0 && (
            <section>
              <SektionsTitel label="Ohne Grundriss" count={ohneGrundriss.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ohneGrundriss.map((raum) => (
                  <RaumCard key={raum.id} raum={raum} onExport={openExportModal} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── LISTEN-ANSICHT ── */}
      {viewMode === 'list' && gefiltert.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {gefiltert.map((raum, idx) => (
            <RaumListRow
              key={raum.id}
              raum={raum}
              isLast={idx === gefiltert.length - 1}
              onExport={openExportModal}
            />
          ))}
        </div>
      )}

      </div>

      {/* ── EXPORT-MODAL ── */}
      {exportRaum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Grundriss exportieren</h3>
              <button onClick={() => setExportRaum(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Raum-Info */}
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{exportRaum.name}</span>
                {exportRaum.projekte && <> · {exportRaum.projekte.name}</>}
              </p>

              {/* Format */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'pdf', label: 'PDF',  Icon: FileText },
                    { value: 'png', label: 'PNG',  Icon: ImageIcon },
                    { value: 'jpg', label: 'JPG',  Icon: ImageIcon },
                  ] as { value: ExportFmt; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setExportFormat(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        exportFormat === value
                          ? 'border-[#445c49] bg-[#445c49]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${exportFormat === value ? 'text-[#445c49]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${exportFormat === value ? 'text-[#445c49]' : 'text-gray-600'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auflösung (nur für Bilder) */}
              {exportFormat !== 'pdf' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Auflösung</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 1, label: '1×', desc: 'Standard' },
                      { value: 2, label: '2×', desc: 'Hoch' },
                      { value: 4, label: '4×', desc: 'Sehr hoch' },
                    ] as { value: ExportRes; label: string; desc: string }[]).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => setExportResolution(value)}
                        className={`py-2.5 px-3 rounded-xl border-2 text-center transition-all ${
                          exportResolution === value
                            ? 'border-[#445c49] bg-[#445c49]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`text-base font-bold ${exportResolution === value ? 'text-[#445c49]' : 'text-gray-700'}`}>
                          {label}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setExportRaum(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex-1 px-4 py-2.5 bg-[#445c49] hover:bg-[#354a3a] disabled:opacity-60 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exportiere…' : 'Exportieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hilfsfunktionen ────────────────────────────────────────────

function SektionsTitel({ label, count }: { label: string; count: number }) {
  return (
    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
      {label}
      <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">({count})</span>
    </h2>
  )
}

function bearbeitetText(updatedAt: string) {
  return formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: de })
}

// ── Karten-Ansicht ─────────────────────────────────────────────

function RaumCard({ raum, onExport }: { raum: RaumMitProjekt; onExport: (r: RaumMitProjekt) => void }) {
  const planerHref    = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}/planer`
  const moodboardHref = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}/moodboard`
  const raumHref      = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}`
  const projekt       = raum.projekte
  const hatGrundriss  = !!raum.grundriss_json
  const hatMoodboard  = !!raum.hat_moodboard

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md hover:border-[#445c49]/30 transition-all duration-200">
      {/* Vorschau oder Platzhalter */}
      {raum.grundriss_json ? (
        <Link href={planerHref} className="block">
          <div className="p-3 bg-gray-50 flex justify-center border-b border-gray-100">
            <GrundrissVorschau
              grundrissJson={JSON.stringify(raum.grundriss_json)}
              breiteM={raum.breite_m}
              laengeM={raum.laenge_m}
              vorschauBreite={320}
              className="shadow-sm"
            />
          </div>
        </Link>
      ) : (
        <Link href={planerHref} className="block group">
          <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-dashed border-2 border-gray-200 flex items-center justify-center transition-colors group-hover:border-[#445c49]/30">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:border-[#445c49]/40 transition-colors">
                <PenTool className="w-4 h-4 text-gray-400 group-hover:text-[#445c49]/60 transition-colors" />
              </div>
              <p className="text-xs font-medium text-gray-500">Noch kein Grundriss</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Klicke auf Planer um zu starten</p>
            </div>
          </div>
        </Link>
      )}

      {/* Infos */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={raumHref} className="text-sm font-medium text-gray-900 hover:text-[#445c49] transition-colors truncate block">
              {raum.name}
            </Link>
            {projekt && <p className="text-xs text-gray-400 mt-0.5 truncate">{projekt.name}</p>}
            <p className="text-[10px] text-gray-400 mt-1">Bearbeitet {bearbeitetText(raum.updated_at)}</p>
            {(raum.breite_m || raum.laenge_m) && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {raum.breite_m ?? '?'} m × {raum.laenge_m ?? '?'} m
                {raum.hoehe_m ? ` · H ${raum.hoehe_m} m` : ''}
              </p>
            )}
          </div>

          <div className="shrink-0">
            {raum.grundriss_json && (
              <button
                onClick={() => onExport(raum)}
                title="Grundriss exportieren"
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap"
              >
                <FileDown className="w-3 h-3" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Tool-Status + Direkt-Buttons */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <Link
            href={planerHref}
            className={`group flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
              hatGrundriss
                ? 'bg-[#445c49] hover:bg-[#354a3a] text-white border-[#445c49]'
                : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
            title="2D-Raumplaner"
          >
            <LayoutDashboard className="w-3 h-3" />
            <span>Planer</span>
            <span className={`w-1.5 h-1.5 rounded-full ${hatGrundriss ? 'bg-white/80' : 'bg-gray-300'}`} />
          </Link>
          <Link
            href={moodboardHref}
            className={`group flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
              hatMoodboard
                ? 'bg-wellbeing-cream hover:bg-wellbeing-sand/40 text-wellbeing-green-dark border-wellbeing-sand/60'
                : 'bg-white hover:bg-wellbeing-cream/40 text-gray-600 border-gray-200'
            }`}
            title="Moodboard"
          >
            <Palette className="w-3 h-3" />
            <span>Moodboard</span>
            <span className={`w-1.5 h-1.5 rounded-full ${hatMoodboard ? 'bg-wellbeing-green' : 'bg-gray-300'}`} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Listen-Ansicht ─────────────────────────────────────────────

function RaumListRow({ raum, isLast, onExport }: { raum: RaumMitProjekt; isLast: boolean; onExport: (r: RaumMitProjekt) => void }) {
  const planerHref    = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}/planer`
  const moodboardHref = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}/moodboard`
  const raumHref      = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}`
  const projekt       = raum.projekte
  const hatMoodboard  = !!raum.hat_moodboard

  return (
    <div className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}>

      {/* Kleine Vorschau */}
      <div className="shrink-0 w-16 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
        {raum.grundriss_json ? (
          <GrundrissVorschau
            grundrissJson={JSON.stringify(raum.grundriss_json)}
            breiteM={raum.breite_m}
            laengeM={raum.laenge_m}
            vorschauBreite={64}
            className="!rounded-none !border-0 !shadow-none"
          />
        ) : (
          <PenTool className="w-4 h-4 text-gray-300" />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <Link href={raumHref} className="text-sm font-medium text-gray-900 hover:text-[#445c49] transition-colors truncate">
            {raum.name}
          </Link>
          {!raum.grundriss_json && (
            <span className="shrink-0 text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
              Kein Grundriss
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {projekt && <p className="text-xs text-gray-400 truncate">{projekt.name}</p>}
          {(raum.breite_m || raum.laenge_m) && (
            <p className="text-xs text-gray-400 shrink-0">
              {raum.breite_m ?? '?'} × {raum.laenge_m ?? '?'} m
            </p>
          )}
        </div>
      </div>

      {/* Datum */}
      <p className="shrink-0 text-xs text-gray-400 hidden sm:block w-32 text-right">
        {bearbeitetText(raum.updated_at)}
      </p>

      {/* Buttons */}
      <div className="shrink-0 flex items-center gap-1.5">
        {raum.grundriss_json && (
          <button
            onClick={() => onExport(raum)}
            title="Exportieren"
            className="inline-flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
          >
            <FileDown className="w-3 h-3" />
            Export
          </button>
        )}
        <Link
          href={moodboardHref}
          title="Moodboard öffnen"
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border ${
            hatMoodboard
              ? 'bg-wellbeing-cream hover:bg-wellbeing-sand/40 text-wellbeing-green-dark border-wellbeing-sand/60'
              : 'bg-white hover:bg-wellbeing-cream/40 text-gray-600 border-gray-200'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span className={`w-1.5 h-1.5 rounded-full ${hatMoodboard ? 'bg-wellbeing-green' : 'bg-gray-300'}`} />
        </Link>
        <Link
          href={planerHref}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#445c49] hover:bg-[#354a3a] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          <LayoutDashboard className="w-3 h-3" />
          Planer
        </Link>
      </div>
    </div>
  )
}

