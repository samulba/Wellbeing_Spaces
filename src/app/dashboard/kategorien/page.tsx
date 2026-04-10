import { getEinstellungen } from '@/app/actions/einstellungen'
import KategorienVerwaltung from '@/components/KategorienVerwaltung'

function parseList(wert: string | undefined, fallback: string): string[] {
  return (wert ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default async function KategorienPage() {
  const einstellungen = await getEinstellungen()

  const kategorien   = parseList(einstellungen.produktkategorien, 'Möbel,Leuchten,Textilien,Accessoires,Pflanzen,Sonstiges')
  const raumtypen    = parseList(einstellungen.raumtypen,         'Büro,Studio,Wellness,Hotel,Privat,Wohnung,Sonstiges')
  const projektarten = parseList(einstellungen.projektarten,      'Neubau,Renovation,Konzept,Beratung,Sonstiges')

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Kategorien</h1>
        <p className="text-sm text-gray-500 mt-0.5">Produktkategorien, Raumtypen und Projektarten verwalten</p>
      </div>
      <KategorienVerwaltung
        kategorien={kategorien}
        raumtypen={raumtypen}
        projektarten={projektarten}
      />
    </div>
  )
}
