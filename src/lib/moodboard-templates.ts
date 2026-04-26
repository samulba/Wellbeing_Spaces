/**
 * Vordefinierte Moodboard-Templates fuer den Schnellstart.
 * Jedes Template ist ein Fabric.js-canvas-JSON mit ein paar Farb-Swatches,
 * Sektions-Boxen und Beispieltexten als Inspiration.
 */

export interface MoodboardTemplate {
  id:           string
  name:         string
  beschreibung: string
  emoji:        string
  /** Stichworte fuer Look & Feel */
  tags:         string[]
  /** Farben die das Template praegt (fuer Vorschau-Kachel) */
  vorschauFarben: string[]
  /** Fabric.js Canvas-JSON */
  canvasJson:   Record<string, unknown>
}

// ── Helper zum Bauen der canvas-Struktur ─────────────────────────

function makeRect(opts: {
  left: number; top: number; width: number; height: number
  fill: string
  rx?: number; ry?: number
  stroke?: string; strokeWidth?: number
  shadow?: boolean
}) {
  return {
    type: 'rect',
    version: '6.0.0',
    left: opts.left, top: opts.top,
    width: opts.width, height: opts.height,
    fill: opts.fill,
    rx: opts.rx ?? 8, ry: opts.ry ?? 8,
    stroke: opts.stroke ?? null,
    strokeWidth: opts.strokeWidth ?? 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
    shadow: opts.shadow
      ? { color: 'rgba(0,0,0,0.10)', blur: 12, offsetX: 0, offsetY: 4, affectStroke: false, nonScaling: false }
      : null,
  }
}

function makeText(opts: {
  left: number; top: number
  text: string
  fontSize?: number
  fill?: string
  fontWeight?: string
  fontFamily?: string
  width?: number
  charSpacing?: number
}) {
  return {
    type: 'i-text',
    version: '6.0.0',
    left: opts.left, top: opts.top,
    text: opts.text,
    fontSize: opts.fontSize ?? 18,
    fill: opts.fill ?? '#1f2937',
    fontWeight: opts.fontWeight ?? 'normal',
    fontFamily: opts.fontFamily ?? 'Inter, sans-serif',
    width: opts.width ?? 0,
    charSpacing: opts.charSpacing ?? 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
  }
}

function buildBoard(items: Record<string, unknown>[]): Record<string, unknown> {
  return { version: '6.0.0', objects: items, background: '#f5f5f0' }
}

// ── 6 Templates ──────────────────────────────────────────────────

export const TEMPLATES: MoodboardTemplate[] = [
  {
    id: 'skandi',
    name: 'Skandinavisch',
    beschreibung: 'Hell, warm, viel Holz und Beige — beruhigt das Gemüt.',
    emoji: '🤍',
    tags: ['hell', 'natürlich', 'warm', 'minimal'],
    vorschauFarben: ['#f5f1ea', '#d4b896', '#8b6f47', '#c8c0b6', '#445c49'],
    canvasJson: buildBoard([
      makeText({ left: 60, top: 60, text: 'SKANDINAVISCH', fontSize: 11, fill: '#9ca3af', fontWeight: '600', charSpacing: 300 }),
      makeText({ left: 60, top: 80, text: 'Hell · Warm · Natürlich', fontSize: 24, fill: '#1f2937', fontWeight: '500' }),
      // Farbpalette
      makeText({ left: 60, top: 160, text: 'PALETTE', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeRect({ left:  60, top: 180, width: 90, height: 90, fill: '#f5f1ea', shadow: true }),
      makeRect({ left: 160, top: 180, width: 90, height: 90, fill: '#d4b896', shadow: true }),
      makeRect({ left: 260, top: 180, width: 90, height: 90, fill: '#8b6f47', shadow: true }),
      makeRect({ left: 360, top: 180, width: 90, height: 90, fill: '#c8c0b6', shadow: true }),
      makeRect({ left: 460, top: 180, width: 90, height: 90, fill: '#445c49', shadow: true }),
      // Stichworte
      makeText({ left: 60, top: 310, text: 'STIMMUNG', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 60, top: 330, text: '— Eichenholz und Naturleinen', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 358, text: '— Wolle und Schaffell', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 386, text: '— gedämpfte Farben', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 414, text: '— viel Tageslicht', fontSize: 14, fill: '#374151' }),
      // Material-Sektion
      makeRect({ left: 600, top: 60, width: 320, height: 380, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, shadow: true }),
      makeText({ left: 620, top: 80, text: 'MATERIALIEN', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 620, top: 100, text: 'Wood · Linen · Wool', fontSize: 18, fill: '#1f2937', fontWeight: '500' }),
      makeText({ left: 620, top: 140, text: 'Lade hier Material-Fotos hoch.', fontSize: 12, fill: '#9ca3af' }),
    ]),
  },

  {
    id: 'boho',
    name: 'Boho · Ethno',
    beschreibung: 'Erdig, mutig, viele Texturen — global inspiriert.',
    emoji: '🌿',
    tags: ['erdig', 'mutig', 'mediterran'],
    vorschauFarben: ['#cba178', '#823509', '#d97706', '#65a30d', '#1f2937'],
    canvasJson: buildBoard([
      makeText({ left: 60, top: 60, text: 'BOHO · ETHNO', fontSize: 11, fill: '#9ca3af', fontWeight: '600', charSpacing: 300 }),
      makeText({ left: 60, top: 80, text: 'Erdig · Mutig · Texturreich', fontSize: 24, fill: '#1f2937', fontWeight: '500' }),
      makeRect({ left:  60, top: 160, width: 90, height: 90, fill: '#cba178', shadow: true }),
      makeRect({ left: 160, top: 160, width: 90, height: 90, fill: '#823509', shadow: true }),
      makeRect({ left: 260, top: 160, width: 90, height: 90, fill: '#d97706', shadow: true }),
      makeRect({ left: 360, top: 160, width: 90, height: 90, fill: '#65a30d', shadow: true }),
      makeRect({ left: 460, top: 160, width: 90, height: 90, fill: '#1f2937', shadow: true }),
      makeText({ left: 60, top: 290, text: 'STICHWORTE', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 60, top: 310, text: '— Rattan, Jute, Leder', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 338, text: '— Fransen und Quasten', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 366, text: '— Pflanzen · viele Pflanzen', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 394, text: '— Kelim-Teppiche, Macramé', fontSize: 14, fill: '#374151' }),
      makeRect({ left: 600, top: 60, width: 320, height: 380, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, shadow: true }),
      makeText({ left: 620, top: 80, text: 'INSPIRATION', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 620, top: 100, text: 'Marrakesch trifft Wohnzimmer', fontSize: 16, fill: '#1f2937', fontWeight: '500' }),
      makeText({ left: 620, top: 140, text: 'Lade Stoffe & Kelim-Bilder hoch.', fontSize: 12, fill: '#9ca3af' }),
    ]),
  },

  {
    id: 'modern-hotel',
    name: 'Modern Hotel',
    beschreibung: 'Klar, kontrastreich, edel — perfekt für Lobbys & Suites.',
    emoji: '🏨',
    tags: ['edel', 'klar', 'kontrastreich'],
    vorschauFarben: ['#0f1419', '#374151', '#cba178', '#f5f5f0', '#823509'],
    canvasJson: buildBoard([
      makeText({ left: 60, top: 60, text: 'MODERN HOTEL', fontSize: 11, fill: '#9ca3af', fontWeight: '600', charSpacing: 300 }),
      makeText({ left: 60, top: 80, text: 'Edel · Klar · Kontrastreich', fontSize: 24, fill: '#1f2937', fontWeight: '500' }),
      makeRect({ left:  60, top: 160, width: 90, height: 90, fill: '#0f1419', shadow: true }),
      makeRect({ left: 160, top: 160, width: 90, height: 90, fill: '#374151', shadow: true }),
      makeRect({ left: 260, top: 160, width: 90, height: 90, fill: '#cba178', shadow: true }),
      makeRect({ left: 360, top: 160, width: 90, height: 90, fill: '#f5f5f0', shadow: true }),
      makeRect({ left: 460, top: 160, width: 90, height: 90, fill: '#823509', shadow: true }),
      makeText({ left: 60, top: 290, text: 'BAUSTEINE', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 60, top: 310, text: '— Marmor, Messing, Samt', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 338, text: '— punktuelles Licht', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 366, text: '— großzügige Volumen', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 394, text: '— ruhige Materialwechsel', fontSize: 14, fill: '#374151' }),
      makeRect({ left: 600, top: 60, width: 320, height: 380, fill: '#0f1419', shadow: true }),
      makeText({ left: 620, top: 80, text: 'AKZENT', fontSize: 10, fill: '#cba178', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 620, top: 100, text: 'Dark · Brass · Bold', fontSize: 18, fill: '#f5f5f0', fontWeight: '500' }),
      makeText({ left: 620, top: 140, text: 'Hochwertige Hero-Bilder hier ablegen.', fontSize: 12, fill: '#9ca3af' }),
    ]),
  },

  {
    id: 'office-space',
    name: 'Bürospace',
    beschreibung: 'Klar, professionell, fokussiert — Konzentration mit Charakter.',
    emoji: '💼',
    tags: ['professionell', 'fokussiert', 'modern'],
    vorschauFarben: ['#ffffff', '#445c49', '#f3f4f6', '#1f2937', '#6b7280'],
    canvasJson: buildBoard([
      makeText({ left: 60, top: 60, text: 'BÜROSPACE', fontSize: 11, fill: '#9ca3af', fontWeight: '600', charSpacing: 300 }),
      makeText({ left: 60, top: 80, text: 'Klar · Professionell · Fokussiert', fontSize: 24, fill: '#1f2937', fontWeight: '500' }),
      makeRect({ left:  60, top: 160, width: 90, height: 90, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, shadow: true }),
      makeRect({ left: 160, top: 160, width: 90, height: 90, fill: '#445c49', shadow: true }),
      makeRect({ left: 260, top: 160, width: 90, height: 90, fill: '#f3f4f6', shadow: true }),
      makeRect({ left: 360, top: 160, width: 90, height: 90, fill: '#1f2937', shadow: true }),
      makeRect({ left: 460, top: 160, width: 90, height: 90, fill: '#6b7280', shadow: true }),
      makeText({ left: 60, top: 290, text: 'PRINZIPIEN', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 60, top: 310, text: '— akustisch ruhige Zonen', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 338, text: '— Eiche & matter Stahl', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 366, text: '— biophiles Grün', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 394, text: '— Hybrid-Möblierung', fontSize: 14, fill: '#374151' }),
      makeRect({ left: 600, top: 60, width: 320, height: 380, fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1, shadow: true }),
      makeText({ left: 620, top: 80, text: 'ZONIERUNG', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 620, top: 100, text: 'Focus · Collab · Pause', fontSize: 18, fill: '#1f2937', fontWeight: '500' }),
      makeText({ left: 620, top: 140, text: 'Bilder pro Zone hier hinzufügen.', fontSize: 12, fill: '#9ca3af' }),
    ]),
  },

  {
    id: 'wohnen-warm',
    name: 'Wohnen · Warm',
    beschreibung: 'Gemütlich, einladend, weich — Ankommen pur.',
    emoji: '🪵',
    tags: ['gemütlich', 'warm', 'einladend'],
    vorschauFarben: ['#f6ede2', '#cba178', '#823509', '#94c1a4', '#3e2c1a'],
    canvasJson: buildBoard([
      makeText({ left: 60, top: 60, text: 'WOHNEN · WARM', fontSize: 11, fill: '#9ca3af', fontWeight: '600', charSpacing: 300 }),
      makeText({ left: 60, top: 80, text: 'Gemütlich · Einladend · Weich', fontSize: 24, fill: '#1f2937', fontWeight: '500' }),
      makeRect({ left:  60, top: 160, width: 90, height: 90, fill: '#f6ede2', shadow: true }),
      makeRect({ left: 160, top: 160, width: 90, height: 90, fill: '#cba178', shadow: true }),
      makeRect({ left: 260, top: 160, width: 90, height: 90, fill: '#823509', shadow: true }),
      makeRect({ left: 360, top: 160, width: 90, height: 90, fill: '#94c1a4', shadow: true }),
      makeRect({ left: 460, top: 160, width: 90, height: 90, fill: '#3e2c1a', shadow: true }),
      makeText({ left: 60, top: 290, text: 'HIGHLIGHTS', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 60, top: 310, text: '— Bouclé, Cord, Samt', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 338, text: '— warmes 2700 K Licht', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 366, text: '— offene Bücherregale', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 394, text: '— Layered Teppiche', fontSize: 14, fill: '#374151' }),
      makeRect({ left: 600, top: 60, width: 320, height: 380, fill: '#f6ede2', shadow: true }),
      makeText({ left: 620, top: 80, text: 'GEFÜHL', fontSize: 10, fill: '#823509', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 620, top: 100, text: '„Ankommen.&ldquo;', fontSize: 22, fill: '#1f2937', fontWeight: '500' }),
      makeText({ left: 620, top: 140, text: 'Ein-Wort-Gefühle hier sammeln.', fontSize: 12, fill: '#823509' }),
    ]),
  },

  {
    id: 'industrial',
    name: 'Industrial · Loft',
    beschreibung: 'Roh, urban, ehrlich — Beton, Stahl, Holz.',
    emoji: '🏭',
    tags: ['roh', 'urban', 'ehrlich'],
    vorschauFarben: ['#374151', '#1f2937', '#92400e', '#d4b896', '#525252'],
    canvasJson: buildBoard([
      makeText({ left: 60, top: 60, text: 'INDUSTRIAL · LOFT', fontSize: 11, fill: '#9ca3af', fontWeight: '600', charSpacing: 300 }),
      makeText({ left: 60, top: 80, text: 'Roh · Urban · Ehrlich', fontSize: 24, fill: '#1f2937', fontWeight: '500' }),
      makeRect({ left:  60, top: 160, width: 90, height: 90, fill: '#374151', shadow: true }),
      makeRect({ left: 160, top: 160, width: 90, height: 90, fill: '#1f2937', shadow: true }),
      makeRect({ left: 260, top: 160, width: 90, height: 90, fill: '#92400e', shadow: true }),
      makeRect({ left: 360, top: 160, width: 90, height: 90, fill: '#d4b896', shadow: true }),
      makeRect({ left: 460, top: 160, width: 90, height: 90, fill: '#525252', shadow: true }),
      makeText({ left: 60, top: 290, text: 'STIL', fontSize: 10, fill: '#9ca3af', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 60, top: 310, text: '— sichtbarer Beton & Stahl', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 338, text: '— Edison-Glühbirnen', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 366, text: '— Vintage-Leder', fontSize: 14, fill: '#374151' }),
      makeText({ left: 60, top: 394, text: '— offene Decken & Rohre', fontSize: 14, fill: '#374151' }),
      makeRect({ left: 600, top: 60, width: 320, height: 380, fill: '#1f2937', shadow: true }),
      makeText({ left: 620, top: 80, text: 'KEY VISUAL', fontSize: 10, fill: '#92400e', fontWeight: '600', charSpacing: 250 }),
      makeText({ left: 620, top: 100, text: 'Beton trifft Eiche', fontSize: 18, fill: '#f5f5f0', fontWeight: '500' }),
      makeText({ left: 620, top: 140, text: 'Hier Hero-Foto im Loft-Stil ablegen.', fontSize: 12, fill: '#9ca3af' }),
    ]),
  },
]

export function getTemplate(id: string): MoodboardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
