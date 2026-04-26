'use client'

/**
 * Layer-Panel — Liste aller Top-Level-Elemente am rechten Rand,
 * mit Eye/Lock-Toggle, Klick selektiert auf Canvas, Drag-Reorder via Buttons.
 */

import {
  Eye, EyeOff, Lock, Unlock, Image as ImageIcon, Type as TypeIcon,
  Square, Circle as CircleIcon, StickyNote, Link as LinkIcon, Layers,
  ChevronUp, ChevronDown, BoxSelect,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricObj = any

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objects: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeObj: any
  reloadKey: number
  onSelect:    (obj: FabricObj) => void
  onToggleVis: (obj: FabricObj) => void
  onToggleLock:(obj: FabricObj) => void
  onForward:   (obj: FabricObj) => void
  onBackward:  (obj: FabricObj) => void
  onClose:     () => void
}

function getLabel(obj: FabricObj): { name: string; icon: React.ReactNode } {
  // Sektion (BG-Rect)
  if (obj?.data?.type === 'section_bg')      return { name: 'Sektion',     icon: <BoxSelect    className="w-3.5 h-3.5" /> }
  if (obj?.data?.type === 'section_header')  return { name: 'Sektion-Kopf', icon: <BoxSelect    className="w-3.5 h-3.5" /> }
  if (obj?.data?.type === 'section_title')   return { name: obj.text ?? 'Sektion-Titel', icon: <BoxSelect className="w-3.5 h-3.5" /> }
  if (obj?.data?.type === 'sticky_note')     return { name: 'Notiz',        icon: <StickyNote className="w-3.5 h-3.5" /> }
  if (obj?.data?.type === 'link_card')       return { name: obj.data.domain ?? 'Link', icon: <LinkIcon className="w-3.5 h-3.5" /> }
  if (obj?.data?.produkt_name)               return { name: obj.data.produkt_name,    icon: <ImageIcon className="w-3.5 h-3.5" /> }

  const t = (obj?.type ?? '').toLowerCase()
  if (t === 'image' || t === 'fabricimage') return { name: 'Bild',     icon: <ImageIcon className="w-3.5 h-3.5" /> }
  if (t === 'i-text' || t === 'text' || t === 'textbox') {
    const txt = (obj?.text ?? '').toString().slice(0, 24).trim() || 'Text'
    return { name: txt, icon: <TypeIcon className="w-3.5 h-3.5" /> }
  }
  if (t === 'rect')   return { name: 'Rechteck', icon: <Square      className="w-3.5 h-3.5" /> }
  if (t === 'circle') return { name: 'Kreis',    icon: <CircleIcon  className="w-3.5 h-3.5" /> }
  if (t === 'group')  return { name: 'Gruppe',   icon: <Layers      className="w-3.5 h-3.5" /> }
  return { name: t || 'Element', icon: <Square className="w-3.5 h-3.5" /> }
}

export default function MoodboardLayers({
  objects, activeObj, reloadKey,
  onSelect, onToggleVis, onToggleLock, onForward, onBackward, onClose,
}: Props) {
  void reloadKey // forciert Re-Render

  // Visuelle Reihenfolge im Panel = von oben (vorderste Ebene) nach unten (hinten)
  // Fabric speichert das ARRAY in BOTTOM-FIRST Reihenfolge → wir reversen.
  const sichtbareObjekte = objects.filter((o) => {
    const t = o?.data?.type
    return t !== 'smart_guide' && t !== 'sticky_overlay'
  })
  const nachVorne = [...sichtbareObjekte].reverse()

  return (
    <aside className="w-64 shrink-0 bg-[#1a2e1e] border-l border-[#1f3a25] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f3a25] shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#94c1a4]" />
          <span className="text-xs font-medium text-white">Ebenen</span>
          <span className="text-[10px] text-[#94c1a4]">{nachVorne.length}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-white/5 rounded text-[#94c1a4] hover:text-white"
          title="Schließen"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {nachVorne.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-[#94c1a4]">
            Keine Ebenen
          </div>
        ) : (
          nachVorne.map((obj, i) => {
            const istAktiv = obj === activeObj
            const istVisible = obj.visible !== false
            const istLocked  = obj.lockMovementX === true
            const { name, icon } = getLabel(obj)
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(obj)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(obj) }}
                className={`
                  group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors
                  ${istAktiv ? 'bg-wellbeing-green/30 ring-1 ring-wellbeing-green' : 'hover:bg-white/5'}
                `}
              >
                <span className="text-[#94c1a4] shrink-0">{icon}</span>
                <span className={`flex-1 text-[11px] truncate ${istVisible ? 'text-white' : 'text-[#94c1a4]/50'}`}>
                  {name}
                </span>
                {/* Layer-Order */}
                <button
                  type="button"
                  title="Eine Ebene vor"
                  onClick={(e) => { e.stopPropagation(); onForward(obj) }}
                  className="p-0.5 text-[#94c1a4] opacity-0 group-hover:opacity-100 hover:text-white"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Eine Ebene zurück"
                  onClick={(e) => { e.stopPropagation(); onBackward(obj) }}
                  className="p-0.5 text-[#94c1a4] opacity-0 group-hover:opacity-100 hover:text-white"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                {/* Lock */}
                <button
                  type="button"
                  title={istLocked ? 'Entsperren' : 'Sperren'}
                  onClick={(e) => { e.stopPropagation(); onToggleLock(obj) }}
                  className={`p-0.5 ${istLocked ? 'text-amber-400' : 'text-[#94c1a4] opacity-0 group-hover:opacity-100 hover:text-white'}`}
                >
                  {istLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
                {/* Sichtbarkeit */}
                <button
                  type="button"
                  title={istVisible ? 'Ausblenden' : 'Einblenden'}
                  onClick={(e) => { e.stopPropagation(); onToggleVis(obj) }}
                  className={`p-0.5 ${!istVisible ? 'text-[#94c1a4]/50' : 'text-[#94c1a4] opacity-0 group-hover:opacity-100 hover:text-white'}`}
                >
                  {istVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
