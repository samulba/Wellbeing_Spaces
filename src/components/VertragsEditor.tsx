'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold, Heading1, Heading2, Heading3, List, ListOrdered, Minus,
  Sparkles, Eye, EyeOff, Columns2, ChevronDown, FileText,
} from 'lucide-react'
import { PLATZHALTER } from '@/lib/vertrags-platzhalter'
import { QUICK_START_VORLAGEN } from '@/lib/vertrags-template-bibliothek'

// ── Beispieldaten für die Live-Vorschau (Platzhalter werden ersetzt) ──
const VORSCHAU_DATEN: Record<string, string> = {
  firmenname:        'Wellbeing Spaces',
  kunde_name:        'Max Mustermann GmbH',
  kunde_email:       'max@mustermann.de',
  kunde_adresse:     'Musterstraße 1, 10115 Berlin',
  projekt_name:      'Loft-Umbau 2026',
  projekt_standort:  'Berlin-Mitte',
  projektart:        'Wohnraumgestaltung',
  produkt_budget:    '15.000,00 €',
  service_pauschale: '5.000,00 €',
  gesamtbudget:      '20.000,00 €',
  datum_heute:       new Date().toLocaleDateString('de-DE'),
  deadline:          '15.06.2026',
}

function platzhalterVorschau(html: string): string {
  let out = html
  for (const [key, value] of Object.entries(VORSCHAU_DATEN)) {
    out = out.replaceAll(`{{${key}}}`, value)
  }
  return out
}

type Ansicht = 'editor' | 'vorschau' | 'geteilt'

interface VertragsEditorProps {
  value:    string
  onChange: (html: string) => void
  /** Wenn true, werden die Quick-Start-Buttons angezeigt (nur bei „Neu") */
  zeigeQuickStart?: boolean
  /** Optional: Callback wenn ein Quick-Start gewählt wird (z.B. um Name/Beschreibung mitzusetzen) */
  onQuickStart?: (vorlage: typeof QUICK_START_VORLAGEN[number]) => void
}

export default function VertragsEditor({
  value,
  onChange,
  zeigeQuickStart = false,
  onQuickStart,
}: VertragsEditorProps) {
  const [ansicht, setAnsicht] = useState<Ansicht>('editor')
  const [platzhalterOffen, setPlatzhalterOffen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:    { levels: [1, 2, 3] },
        // bewusst aus — passen nicht zum konservativen PDF-Export:
        italic:     false,
        strike:     false,
        code:       false,
        codeBlock:  false,
        blockquote: false,
      }),
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[400px] px-5 py-4 focus:outline-none vertrags-editor-content',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Externe value-Änderungen (z.B. Quick-Start) ins Editor-Doc übernehmen
  useEffect(() => {
    if (!editor) return
    const aktuell = editor.getHTML()
    if (value && value !== aktuell) {
      editor.commands.setContent(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function fuegePlatzhalter(key: string) {
    if (!editor) return
    editor.chain().focus().insertContent(key).run()
    setPlatzhalterOffen(false)
  }

  function quickStart(vorlage: typeof QUICK_START_VORLAGEN[number]) {
    if (!editor) return
    editor.commands.setContent(vorlage.inhalt_html)
    onQuickStart?.(vorlage)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Quick-Start nur bei neuer Vorlage */}
      {zeigeQuickStart && (
        <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Mit fertiger Vorlage starten
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_START_VORLAGEN.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => quickStart(v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-wellbeing-green hover:text-wellbeing-green rounded-lg transition-colors"
                title={v.beschreibung}
              >
                <FileText className="w-3 h-3" />
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="border-b border-gray-100 px-3 py-2 flex items-center gap-1 flex-wrap bg-white sticky top-0 z-10">
        <ToolbarBtn
          icon={Heading1} label="Überschrift 1"
          aktiv={editor?.isActive('heading', { level: 1 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarBtn
          icon={Heading2} label="Überschrift 2"
          aktiv={editor?.isActive('heading', { level: 2 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarBtn
          icon={Heading3} label="Überschrift 3"
          aktiv={editor?.isActive('heading', { level: 3 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <Trenner />
        <ToolbarBtn
          icon={Bold} label="Fett"
          aktiv={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <Trenner />
        <ToolbarBtn
          icon={List} label="Liste"
          aktiv={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarBtn
          icon={ListOrdered} label="Nummerierte Liste"
          aktiv={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarBtn
          icon={Minus} label="Trennlinie"
          aktiv={false}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        />

        <div className="ml-auto flex items-center gap-2">
          {/* Platzhalter-Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPlatzhalterOffen((v) => !v)}
              onBlur={() => setTimeout(() => setPlatzhalterOffen(false), 200)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-wellbeing-green bg-wellbeing-green/5 hover:bg-wellbeing-green/10 border border-wellbeing-green/20 rounded-lg transition-colors"
              title="Platzhalter einfügen"
            >
              <Sparkles className="w-3 h-3" />
              Platzhalter
              <ChevronDown className="w-3 h-3" />
            </button>
            {platzhalterOffen && (
              <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                <div className="px-3 py-2 border-b border-gray-100 sticky top-0 bg-white">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Platzhalter einfügen
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Wird beim Erstellen eines Vertrags durch echte Daten ersetzt
                  </p>
                </div>
                {PLATZHALTER.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault() /* Verhindert Blur vor Click */}
                    onClick={() => fuegePlatzhalter(p.key)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <code className="text-xs font-mono text-wellbeing-green-dark bg-wellbeing-green/10 px-1.5 py-0.5 rounded">
                      {p.key}
                    </code>
                    <p className="text-[11px] text-gray-500 mt-0.5">{p.beschreibung}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ansichts-Switcher */}
          <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <ViewBtn
              icon={EyeOff} label="Editor"
              aktiv={ansicht === 'editor'}
              onClick={() => setAnsicht('editor')}
            />
            <ViewBtn
              icon={Columns2} label="Geteilt"
              aktiv={ansicht === 'geteilt'}
              onClick={() => setAnsicht('geteilt')}
            />
            <ViewBtn
              icon={Eye} label="Vorschau"
              aktiv={ansicht === 'vorschau'}
              onClick={() => setAnsicht('vorschau')}
            />
          </div>
        </div>
      </div>

      {/* Editor + Vorschau */}
      <div className={ansicht === 'geteilt' ? 'grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-100' : ''}>
        {(ansicht === 'editor' || ansicht === 'geteilt') && (
          <div className="bg-white">
            <EditorContent editor={editor} />
          </div>
        )}
        {(ansicht === 'vorschau' || ansicht === 'geteilt') && (
          <div className="bg-gray-50/50">
            <div
              className="prose prose-sm max-w-none px-5 py-4 vertrags-editor-content min-h-[400px]"
              dangerouslySetInnerHTML={{ __html: platzhalterVorschau(value) || '<p class="text-gray-400">Noch kein Inhalt — schreibe links etwas oder wähle eine Vorlage.</p>' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ToolbarBtn({
  icon: Icon, label, aktiv, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  aktiv: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
        aktiv
          ? 'bg-wellbeing-green text-white'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

function ViewBtn({
  icon: Icon, label, aktiv, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  aktiv: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-8 h-7 transition-colors ${
        aktiv
          ? 'bg-wellbeing-green text-white'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function Trenner() {
  return <span className="w-px h-5 bg-gray-200 mx-1" />
}
