'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, X, ChevronRight, ChevronDown,
  LayoutDashboard, Users, FolderOpen, ShoppingCart, CheckSquare,
  Link2, ClipboardList, Target, CalendarDays, UserCircle,
  Tag, UsersRound, Paintbrush, Settings, FileDown, HelpCircle,
  Lightbulb, AlertTriangle, Info, Keyboard, Command,
  Home, FileText, FileSignature, Grid3X3, MonitorSmartphone,
} from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────

interface Abschnitt {
  id: string
  titel: string
  suchtext: string
}

interface Kapitel {
  id: string
  icon: React.ReactNode
  titel: string
  abschnitte: Abschnitt[]
}

interface Suchtreffer {
  kapitelId: string
  kapitelTitel: string
  abschnittId: string
  abschnittTitel: string
  snippet: string
}

// ── Sub-Komponenten ────────────────────────────────────────────

function InfoBox({
  type = 'info',
  title,
  children,
}: {
  type?: 'tip' | 'warning' | 'info'
  title: string
  children: React.ReactNode
}) {
  const stile = {
    tip:     'border-wellbeing-green/40 bg-wellbeing-green/5 text-wellbeing-green-dark',
    warning: 'border-amber-400/50 bg-amber-50 text-amber-800',
    info:    'border-blue-300/60 bg-blue-50/60 text-blue-800',
  }
  const icons = {
    tip:     <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    info:    <Info className="w-4 h-4 shrink-0 mt-0.5" />,
  }
  return (
    <div className={`flex gap-2.5 border rounded-xl px-4 py-3 text-sm my-4 ${stile[type]}`}>
      {icons[type]}
      <div>
        <p className="font-semibold mb-0.5">{title}</p>
        <div className="opacity-90 text-[13px] leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Kb({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1 mx-1">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="text-gray-400 text-xs">+</span>}
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-mono font-medium bg-gray-100 border border-gray-300 rounded shadow-[0_1px_0_0_rgba(0,0,0,0.15)] text-gray-700">
            {k === 'CMD' ? <Command className="w-3 h-3" /> : k === 'CTRL' ? 'Ctrl' : k}
          </kbd>
        </span>
      ))}
    </span>
  )
}


function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-semibold text-gray-900 mt-10 mb-4 scroll-mt-24 flex items-center gap-2 group">
      {children}
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 text-gray-400 hover:text-gray-600 transition-opacity">
        <ChevronRight className="w-4 h-4" />
      </a>
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[15px] font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-gray-600 leading-relaxed mb-3.5">{children}</p>
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-600 mb-3.5 ml-1">{children}</ol>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside space-y-2 text-[15px] text-gray-600 mb-3.5 ml-1">{children}</ul>
}

function Divider() {
  return <hr className="my-6 border-gray-100" />
}

// ── Kapitel-Daten ──────────────────────────────────────────────

const KAPITEL: Kapitel[] = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    titel: 'Dashboard',
    abschnitte: [
      { id: 'dashboard-kpi',       titel: 'KPI-Karten',       suchtext: 'kpi karten aktive kunden laufende projekte offene angebote monatsumsatz' },
      { id: 'dashboard-deadlines', titel: 'Deadlines',        suchtext: 'deadlines countdown projekt fällig' },
      { id: 'dashboard-followups', titel: 'Follow-Ups',       suchtext: 'follow up wiedervorlage kommunikation kunden' },
      { id: 'dashboard-budget',    titel: 'Budget-Übersicht', suchtext: 'budget übersicht ist kosten gesamt projekt' },
      { id: 'dashboard-letzte',    titel: 'Letzte Projekte',  suchtext: 'letzte projekte tabelle' },
    ],
  },
  {
    id: 'kunden',
    icon: <Users className="w-4 h-4" />,
    titel: 'Kunden',
    abschnitte: [
      { id: 'kunden-anlegen',       titel: 'Kunde anlegen',         suchtext: 'kunde anlegen neu erstellen name' },
      { id: 'kunden-detail',        titel: 'Detail-Seite (360°)',   suchtext: 'detail seite cockpit stats projektliste timeline' },
      { id: 'kunden-kontakte',      titel: 'Mehrere Ansprechpartner', suchtext: 'ansprechpartner mehrere kontakte hauptkontakt rolle email telefon mobil' },
      { id: 'kunden-website',       titel: 'Website + Auto-Favicon', suchtext: 'website url logo favicon auto automatisch' },
      { id: 'kunden-kommunikation', titel: 'Kommunikationslog',     suchtext: 'kommunikation anruf email meeting follow-up notiz' },
      { id: 'kunden-archiv',        titel: 'Archivieren / Löschen', suchtext: 'archivieren wiederherstellen löschen impact' },
    ],
  },
  {
    id: 'projekte',
    icon: <FolderOpen className="w-4 h-4" />,
    titel: 'Projekte',
    abschnitte: [
      { id: 'projekte-erstellen',  titel: 'Projekt erstellen',          suchtext: 'projekt erstellen neu anlegen kunde' },
      { id: 'projekte-status',     titel: 'Status-Flow',                suchtext: 'status aktiv warten auf kunde abgeschlossen offen freigegeben' },
      { id: 'projekte-budget',     titel: 'Budget (gesamt + Produkt)',  suchtext: 'budget gesamtbudget produkt budget tausenderpunkt' },
      { id: 'projekte-service',    titel: 'Service-Modell',             suchtext: 'service pauschale stundensatz abrechnung honorar' },
      { id: 'projekte-zeit',       titel: 'Zeiterfassung',              suchtext: 'zeiterfassung stunden eintragen abrechnen' },
      { id: 'projekte-deadline',   titel: 'Deadline + Verantwortlicher', suchtext: 'deadline countdown verantwortlicher overdue fällig' },
      { id: 'projekte-actions',    titel: 'Duplizieren / Archivieren', suchtext: 'archivieren duplizieren kopieren wiederherstellen löschen' },
    ],
  },
  {
    id: 'raeume',
    icon: <Home className="w-4 h-4" />,
    titel: 'Räume',
    abschnitte: [
      { id: 'raeume-anlegen',     titel: 'Raum anlegen',             suchtext: 'raum anlegen typ kategorie wohnzimmer büro' },
      { id: 'raeume-budget',      titel: 'Budget pro Raum',          suchtext: 'budget raum fortschritt' },
      { id: 'raeume-produkte',    titel: 'Produkte zuweisen',        suchtext: 'produkt zuweisen menge override preis rabatt' },
      { id: 'raeume-grundriss',   titel: 'Grundriss-Vorschau',       suchtext: 'grundriss vorschau raumplaner' },
      { id: 'raeume-reihenfolge', titel: 'Reihenfolge per Drag&Drop', suchtext: 'sortieren drag drop reihenfolge' },
    ],
  },
  {
    id: 'produkte',
    icon: <ShoppingCart className="w-4 h-4" />,
    titel: 'Produkte',
    abschnitte: [
      { id: 'produkte-bibliothek',  titel: 'Bibliothek vs. Raum-Einsatz', suchtext: 'bibliothek katalog raum produkte einsatz junction' },
      { id: 'produkte-autofill',    titel: 'Auto-Fill (URL + AI)',        suchtext: 'autofill url ai claude haiku scraper automatisch' },
      { id: 'produkte-screenshot',  titel: 'Screenshot-Upload',           suchtext: 'screenshot bild upload vision ai sonnet' },
      { id: 'produkte-bilder',      titel: 'Mehrere Bilder',              suchtext: 'bilder mehrere galerie carousel auswählen' },
      { id: 'produkte-preise',      titel: 'Preisberechnung',             suchtext: 'preis einkaufspreis marge verkaufspreis provision mwst' },
      { id: 'produkte-status',      titel: 'Status pro Raum-Einsatz',     suchtext: 'bestellstatus freigabestatus pro raum geliefert ausstehend' },
      { id: 'produkte-varianten',   titel: 'Varianten',                   suchtext: 'varianten attribute farbe größe option produkt' },
    ],
  },
  {
    id: 'freigaben',
    icon: <CheckSquare className="w-4 h-4" />,
    titel: 'Freigaben',
    abschnitte: [
      { id: 'freigaben-uebersicht', titel: 'Dashboard',         suchtext: 'freigabe übersicht progress bar status' },
      { id: 'freigaben-bulk',       titel: 'Bulk-Aktionen',     suchtext: 'bulk markieren mehrere freigeben ablehnen zurücksetzen' },
      { id: 'freigaben-filter',     titel: 'Filter & Suche',    suchtext: 'filter chip suche projekt status' },
      { id: 'freigaben-ansichten',  titel: 'Ansichten',         suchtext: 'gruppen tabelle balken view toggle' },
    ],
  },
  {
    id: 'kundenfreigabe',
    icon: <Link2 className="w-4 h-4" />,
    titel: 'Kundenfreigabe',
    abschnitte: [
      { id: 'kf-link',     titel: 'Link erstellen (Scopes)', suchtext: 'freigabelink erstellen scope projekt raum auswahl token' },
      { id: 'kf-pin',      titel: 'PIN-Schutz',              suchtext: 'pin schutz code sicherheit kunde' },
      { id: 'kf-mobile',   titel: 'Mobile Kundenansicht',    suchtext: 'mobile produkt freigabe bestätigen ablehnen donut' },
      { id: 'kf-audit',    titel: 'Audit-Log',               suchtext: 'audit verlauf wer hat was wann freigegeben' },
    ],
  },
  {
    id: 'portal',
    icon: <MonitorSmartphone className="w-4 h-4" />,
    titel: 'Kunden-Portal',
    abschnitte: [
      { id: 'portal-zugang',      titel: 'Zugang einrichten',      suchtext: 'portal zugang einladung email passwort kunde' },
      { id: 'portal-welcome',     titel: 'Willkommens-Tour',       suchtext: 'welcome tour intro ersttour onboarding' },
      { id: 'portal-projekt',     titel: 'Projektansicht',         suchtext: 'portal projekt produkte fortschritt timeline' },
      { id: 'portal-chat',        titel: 'Chat & Dokumente',       suchtext: 'chat nachrichten dokumente upload' },
      { id: 'portal-team',        titel: 'Team & Einstellungen',   suchtext: 'team mitglieder portal einstellungen profil' },
    ],
  },
  {
    id: 'onboarding',
    icon: <ClipboardList className="w-4 h-4" />,
    titel: 'Onboarding',
    abschnitte: [
      { id: 'ob-link',      titel: 'Link erstellen',          suchtext: 'onboarding link erstellen typ vorlage' },
      { id: 'ob-empfaenger', titel: 'Empfänger-Etikett',      suchtext: 'empfänger etikett label name email für wen' },
      { id: 'ob-vorlagen',  titel: 'Vorlagen-Editor',         suchtext: 'vorlage template editor sektion gruppe feldtyp' },
      { id: 'ob-status',    titel: 'Status-Flow',             suchtext: 'status offen in bearbeitung eingereicht abgeschlossen abgelehnt fortschritt' },
      { id: 'ob-uebernehmen', titel: 'Als Kunde / Projekt anlegen', suchtext: 'übernehmen kunde projekt anlegen aus anfrage' },
    ],
  },
  {
    id: 'konfigurator',
    icon: <Target className="w-4 h-4" />,
    titel: 'Konfigurator',
    abschnitte: [
      { id: 'konf-session',     titel: 'Session erstellen',        suchtext: 'session erstellen link token kunde produkt' },
      { id: 'konf-aktionen',    titel: 'Kunden-Aktionen (4)',      suchtext: 'übernehmen ablehnen alternative unentschieden' },
      { id: 'konf-budget',      titel: 'Budget-Tracking',          suchtext: 'budget tracking limit verbleibend' },
      { id: 'konf-uebernahme',  titel: 'Ergebnis übernehmen',      suchtext: 'übernehmen produkte freigabe angebot erstellen' },
    ],
  },
  {
    id: 'timeline',
    icon: <CalendarDays className="w-4 h-4" />,
    titel: 'Timeline',
    abschnitte: [
      { id: 'tl-events',        titel: 'Events erstellen',          suchtext: 'event erstellen termin lieferung phase meilenstein typ' },
      { id: 'tl-autosync',      titel: 'Auto-Sync',                 suchtext: 'auto sync produkt liefertermin angebot vertrag deadline automatisch' },
      { id: 'tl-gantt',         titel: 'Gantt + Abhängigkeiten',    suchtext: 'gantt balken bezier abhängigkeiten kaskade verschieben' },
      { id: 'tl-raumfilter',    titel: 'Raum-Filter',               suchtext: 'raum filter chip projekt ebene' },
      { id: 'tl-kundensicht',   titel: 'Kunde-sichtbar',            suchtext: 'kunde sichtbar portal toggle event' },
    ],
  },
  {
    id: 'angebote',
    icon: <FileText className="w-4 h-4" />,
    titel: 'Angebote',
    abschnitte: [
      { id: 'ang-erstellen',    titel: 'Angebot erstellen',           suchtext: 'angebot erstellen positionen einleitung manuell' },
      { id: 'ang-aus-raeumen',  titel: 'Aus Raum-Produkten generieren', suchtext: 'angebot aus räumen generieren raum produkte automatisch' },
      { id: 'ang-status',       titel: 'Status-Flow',                 suchtext: 'angebot status entwurf gesendet angesehen angenommen abgelehnt überarbeitung' },
      { id: 'ang-pdf',          titel: 'PDF-Export',                  suchtext: 'angebot pdf export download branding' },
      { id: 'ang-vertrag',      titel: '→ Vertrag erstellen',         suchtext: 'angebot vertrag erstellen umwandeln' },
    ],
  },
  {
    id: 'vertraege',
    icon: <FileSignature className="w-4 h-4" />,
    titel: 'Verträge',
    abschnitte: [
      { id: 'ver-vorlagen',   titel: 'Vertragsvorlagen',         suchtext: 'vorlage platzhalter vertrag standard html' },
      { id: 'ver-erstellen',  titel: 'Vertrag erstellen',        suchtext: 'vertrag erstellen aus vorlage projekt' },
      { id: 'ver-signatur',   titel: 'Digitale Signatur',        suchtext: 'signatur unterschrift token canvas digital touch' },
      { id: 'ver-anhaenge',   titel: 'Anhänge & Meilensteine',   suchtext: 'anhänge meilenstein vertrag' },
      { id: 'ver-pdf',        titel: 'PDF-Export',               suchtext: 'vertrag pdf export download' },
    ],
  },
  {
    id: 'raumplaner',
    icon: <Grid3X3 className="w-4 h-4" />,
    titel: 'Raumplaner',
    abschnitte: [
      { id: 'rp-start',         titel: 'Erste Schritte',           suchtext: 'raumplaner editor öffnen canvas wand' },
      { id: 'rp-tools',         titel: 'Werkzeuge',                suchtext: 'tools wand tür fenster maß möbel radierer formen' },
      { id: 'rp-moebel',        titel: 'Möbel & Custom',           suchtext: 'möbel symbole custom favoriten kategorie' },
      { id: 'rp-boden-waende',  titel: 'Boden + Wandfarbe',        suchtext: 'boden textur wand farbe parkett fliesen' },
      { id: 'rp-etagen',        titel: 'Etagen / Stockwerke',      suchtext: 'etage stockwerk tab' },
      { id: 'rp-versionen',     titel: 'Versionen',                suchtext: 'version speichern laden vergleich' },
      { id: 'rp-export',        titel: 'Export & Freigabe',        suchtext: 'export pdf png screenshot freigabe link qr code kunde' },
    ],
  },
  {
    id: 'partner',
    icon: <UserCircle className="w-4 h-4" />,
    titel: 'Partner',
    abschnitte: [
      { id: 'partner-anlegen',     titel: 'Partner anlegen',                  suchtext: 'partner anlegen hersteller lieferant typ' },
      { id: 'partner-tabs',        titel: 'Sub-Tabs (Übersicht/Kontakte/...)', suchtext: 'tabs übersicht kontakte konditionen verträge produkte' },
      { id: 'partner-kontakte',    titel: 'Mehrere Kontakte',                 suchtext: 'kontaktpersonen mehrere hauptkontakt rolle' },
      { id: 'partner-konditionen', titel: 'Konditionen',                      suchtext: 'kondition prozent fix staffelung kategorie skonto' },
      { id: 'partner-vertraege',   titel: 'Verträge / Dokumente',             suchtext: 'partner verträge upload pdf dokument' },
      { id: 'partner-produkte',    titel: 'Sortiment + Einsatz',              suchtext: 'sortiment einsatz raum verbau bestellt umsatz' },
      { id: 'partner-bewertung',   titel: 'Bewertung + Filter',               suchtext: 'bewertung sterne filter sortierung' },
    ],
  },
  {
    id: 'kategorien',
    icon: <Tag className="w-4 h-4" />,
    titel: 'Kategorien',
    abschnitte: [
      { id: 'kat-produkt', titel: 'Produktkategorien', suchtext: 'produktkategorie kategorie möbel beleuchtung' },
      { id: 'kat-raum', titel: 'Raumtypen', suchtext: 'raumtyp büro wohnzimmer küche bad' },
      { id: 'kat-projekt', titel: 'Projektarten', suchtext: 'projektart typ einrichtung renovation' },
      { id: 'kat-icons', titel: 'Icons anpassen', suchtext: 'icon lucide name anpassen kategorie' },
    ],
  },
  {
    id: 'team',
    icon: <UsersRound className="w-4 h-4" />,
    titel: 'Team & Rollen',
    abschnitte: [
      { id: 'team-rollen', titel: 'Rollen (Admin/Editor/Viewer)', suchtext: 'rolle admin editor viewer berechtigung' },
      { id: 'team-einladen', titel: 'Mitglied einladen', suchtext: 'mitglied einladen email einladung' },
      { id: 'team-berechtigungen', titel: 'Berechtigungen', suchtext: 'berechtigung zugriff rechte lesen schreiben' },
    ],
  },
  {
    id: 'branding',
    icon: <Paintbrush className="w-4 h-4" />,
    titel: 'Branding',
    abschnitte: [
      { id: 'brand-logo', titel: 'Logo & Favicon', suchtext: 'logo favicon hochladen bild marke' },
      { id: 'brand-farben', titel: 'Farben anpassen', suchtext: 'farben primary secondary accent hintergrund' },
      { id: 'brand-schrift', titel: 'Schriftart wählen', suchtext: 'schriftart font inter syne dm sans' },
      { id: 'brand-kontakt', titel: 'Kontaktdaten', suchtext: 'kontakt email telefon website adresse' },
      { id: 'brand-vorschau', titel: 'Live-Vorschau', suchtext: 'vorschau live echtzeit branding preview' },
    ],
  },
  {
    id: 'einstellungen',
    icon: <Settings className="w-4 h-4" />,
    titel: 'Einstellungen',
    abschnitte: [
      { id: 'eins-allgemein', titel: 'Allgemein', suchtext: 'allgemein app name währung mwst zeitzone' },
      { id: 'eins-profil', titel: 'Profil', suchtext: 'profil name email konto' },
      { id: 'eins-sicherheit', titel: 'Sicherheit', suchtext: 'sicherheit passwort ändern' },
    ],
  },
  {
    id: 'export',
    icon: <FileDown className="w-4 h-4" />,
    titel: 'Export',
    abschnitte: [
      { id: 'exp-csv', titel: 'CSV-Export', suchtext: 'csv export tabelle excel download' },
      { id: 'exp-pdf', titel: 'PDF-Export', suchtext: 'pdf export drucken a4 bericht' },
    ],
  },
  {
    id: 'faq',
    icon: <HelpCircle className="w-4 h-4" />,
    titel: 'FAQ',
    abschnitte: [
      { id: 'faq-fragen', titel: 'Häufige Fragen', suchtext: 'häufige fragen antworten hilfe' },
      { id: 'faq-trouble', titel: 'Troubleshooting', suchtext: 'troubleshooting fehler problem lösung' },
    ],
  },
]

// ── Kapitel-Inhalte ────────────────────────────────────────────

function KapitelInhalt({ kapitelId }: { kapitelId: string }) {
  switch (kapitelId) {
    case 'dashboard':      return <DashboardKapitel />
    case 'kunden':         return <KundenKapitel />
    case 'projekte':       return <ProjekteKapitel />
    case 'raeume':         return <RaeumeKapitel />
    case 'produkte':       return <ProdukteKapitel />
    case 'freigaben':      return <FreigabenKapitel />
    case 'kundenfreigabe': return <KundenfreigabeKapitel />
    case 'portal':         return <PortalKapitel />
    case 'onboarding':     return <OnboardingKapitel />
    case 'konfigurator':   return <KonfiguratorKapitel />
    case 'timeline':       return <TimelineKapitel />
    case 'angebote':       return <AngeboteKapitel />
    case 'vertraege':      return <VertraegeKapitel />
    case 'raumplaner':     return <RaumplanerKapitel />
    case 'partner':        return <PartnerKapitel />
    case 'kategorien':     return <KategorienKapitel />
    case 'team':           return <TeamKapitel />
    case 'branding':       return <BrandingKapitel />
    case 'einstellungen':  return <EinstellungenKapitel />
    case 'export':         return <ExportKapitel />
    case 'faq':            return <FaqKapitel />
    default: return null
  }
}

function DashboardKapitel() {
  return (
    <div>
      <H2 id="dashboard-kpi">KPI-Karten</H2>
      <P>Vier Kennzahlen ganz oben fürs tägliche Reporting:</P>
      <Ul>
        <li><strong>Aktive Kunden</strong> – Kunden ohne Soft-Delete.</li>
        <li><strong>Laufende Projekte</strong> – alles außer &bdquo;Abgeschlossen&ldquo; und Archiviert (inkl. Status &bdquo;Warten auf Kunde&ldquo;).</li>
        <li><strong>Offene Angebote</strong> – Status &bdquo;Entwurf&ldquo; oder &bdquo;Gesendet&ldquo;.</li>
        <li><strong>Monatsumsatz</strong> – Summe aller in diesem Monat angenommenen Angebote (brutto).</li>
      </Ul>
      <InfoBox type="tip" title="Klickbar">
        Jede Karte verlinkt direkt zur dazugehörigen Übersicht.
      </InfoBox>

      <Divider />
      <H2 id="dashboard-deadlines">Deadlines</H2>
      <P>Die Karte &bdquo;Nächste Deadlines&ldquo; zeigt alle Projekte mit Deadline in den nächsten 60 Tagen plus alle Timeline-Events der nächsten 30 Tage. Pro Eintrag siehst du:</P>
      <Ul>
        <li>Projekt-Name + Kunde</li>
        <li>Countdown (&bdquo;in 3 Tagen&ldquo;) oder &bdquo;überfällig&ldquo;-Badge bei vergangenen Daten</li>
        <li>Event-Icon je Typ (Meilenstein / Lieferung / Termin / Phase)</li>
      </Ul>

      <Divider />
      <H2 id="dashboard-followups">Follow-Ups</H2>
      <P>Aus dem Kommunikationslog: alle Einträge mit gesetztem Follow-Up-Datum innerhalb der nächsten 7 Tage, gruppiert pro Kunde. Klick → springt direkt in den Kunden-Kontext.</P>

      <Divider />
      <H2 id="dashboard-budget">Budget-Übersicht</H2>
      <P>Die Top-5 aktiven Projekte mit gesetztem Budget — Ist-Kosten (effektiver VP × Menge aller Raum-Produkte) gegen Budget mit Fortschrittsbalken. Über 100 % wird rot.</P>
      <InfoBox type="info" title="Berechnung">
        Effektiver VP = override (falls gesetzt) sonst Bibliothekspreis × (1 − Rabatt %). Werte sind netto.
      </InfoBox>

      <Divider />
      <H2 id="dashboard-letzte">Letzte Projekte</H2>
      <P>Tabelle mit den 8 zuletzt angelegten Projekten (Name / Kunde / Status / Budget / Deadline-Countdown). Direkt-Link in die Detailseite per Zeilenklick.</P>
    </div>
  )
}

function KundenKapitel() {
  return (
    <div>
      <H2 id="kunden-anlegen">Kunde anlegen</H2>
      <P>Pflichtfeld ist nur der Firmenname. Adresse, Notizen und Website sind optional. Ansprechpartner werden NICHT mehr im Formular erfasst — die pflegst du nach dem Speichern auf der Detailseite (siehe &bdquo;Mehrere Ansprechpartner&ldquo;).</P>
      <Ol>
        <li>Sidebar → <strong>Kunden</strong> → <strong>+ Neuer Kunde</strong></li>
        <li>Firmenname (Pflicht)</li>
        <li>Optional: Adresse, Website, Notizen</li>
        <li><strong>Speichern</strong> → landest auf der Detail-Seite, kannst Ansprechpartner hinzufügen</li>
      </Ol>

      <Divider />
      <H2 id="kunden-detail">Detail-Seite (360°-Cockpit)</H2>
      <P>Die Kunden-Detail-Seite zeigt alle wichtigen Infos auf einen Blick:</P>
      <Ul>
        <li><strong>Stats-Band</strong> oben: Projekte (gesamt + aktiv) · Offene Angebote (mit Summe) · Aktive Verträge · Letzter Kontakt</li>
        <li><strong>Projektliste</strong> rechts: alle Projekte mit Status-Punkt, Freigabe-Progressbar, Budget-Kurzanzeige, Deadline-Countdown</li>
        <li><strong>Multi-Projekt-Timeline</strong>: alle Events aller Projekte des Kunden, optional nach Projekt filterbar</li>
        <li><strong>Kommunikationslog</strong>: chronologische Liste aller Anrufe, E-Mails, Meetings</li>
        <li><strong>Sidebar</strong>: Firma (Adresse/Website), Ansprechpartner-Block, Notizen, Portal-Zugang</li>
      </Ul>

      <Divider />
      <H2 id="kunden-kontakte">Mehrere Ansprechpartner</H2>
      <P>Statt nur einer Kontaktperson legst du beliebig viele an, jede mit eigenen Daten:</P>
      <Ul>
        <li>Name + Rolle (Geschäftsführung / Inhaber:in / Buchhaltung / Assistenz / …)</li>
        <li>Eigene E-Mail, Telefon, Mobil</li>
        <li>Persönliche Notizen pro Person</li>
        <li><strong>Hauptkontakt</strong> mit Stern-Badge — pro Kunde genau einer, wird in Listen + PDFs verwendet</li>
      </Ul>
      <InfoBox type="info" title="Backwards-kompatibel">
        Die alten Felder <code>kunden.ansprechpartner / email / telefon</code> werden automatisch mit dem aktuellen Hauptkontakt synchronisiert — alle alten Listen, Filter und PDFs funktionieren ohne Änderung weiter.
      </InfoBox>

      <Divider />
      <H2 id="kunden-website">Website + Auto-Favicon</H2>
      <P>Wenn du eine Website hinterlegst und kein eigenes Logo hochgeladen ist, wird automatisch das Favicon der Domain als Logo gesetzt (via Google Favicon Service). Funktioniert beim Anlegen UND beim späteren Bearbeiten der Website. Eigene Logo-Uploads werden niemals überschrieben.</P>

      <Divider />
      <H2 id="kunden-kommunikation">Kommunikationslog</H2>
      <P>Auf der Kunden-Detail-Seite kannst du jeden Kontakt protokollieren:</P>
      <Ul>
        <li><strong>6 Typen</strong>: E-Mail, Anruf, Meeting, Notiz, Chat, Vor Ort, Sonstiges</li>
        <li>Richtung (eingehend / ausgehend), Dauer, Betreff, Inhalt</li>
        <li><strong>Follow-Up-Datum</strong> setzen → erscheint im Dashboard-Widget &bdquo;Offene Follow-Ups&ldquo;</li>
        <li>Erledigen-Button schließt den Follow-Up ab</li>
      </Ul>

      <P><strong>Archivieren</strong> — versteckt den Kunden inkl. aller Projekte aus der aktiven Liste, Daten bleiben erhalten. Wiederherstellen jederzeit möglich. Im Header der Detail-Seite erscheint ein gelber Banner.</P>
      <P><strong>Löschen (Soft-Delete)</strong> — nur Admins. Modal zeigt vorher den Impact: wie viele Projekte / Räume / Produkte / Angebote / Verträge / Notizen / Kommunikation / Portal-User betroffen sind. Bestätigen → alles wird ausgeblendet (deleted_at gesetzt). Auto-Cleanup nach 30 Tagen via Cron möglich.</P>
    </div>
  )
}

function ProjekteKapitel() {
  return (
    <div>
      <H2 id="projekte-erstellen">Projekt erstellen</H2>
      <Ol>
        <li>Sidebar → <strong>Projekte</strong> → <strong>+ Neues Projekt</strong></li>
        <li>Name + Kunde aus Dropdown wählen</li>
        <li>Optional: Standort, Projektart, Beschreibung, Deadline</li>
        <li>Optional: Service-Modell (Pauschale / Stundensatz)</li>
        <li>Optional: Gesamtbudget + Produkt-Budget (mit Tausenderpunkten)</li>
        <li><strong>Speichern</strong> → landest auf der Projekt-Detail-Seite</li>
      </Ol>

      <Divider />
      <H2 id="projekte-status">Status-Flow</H2>
      <P>Drei sichtbare Status-Buttons im Header:</P>
      <Ul>
        <li><strong>Aktiv</strong> (grau) — Standard, du arbeitest gerade dran</li>
        <li><strong>Warten auf Kunde</strong> (blau) — Freigabe-Link versendet, wartest auf Antwort</li>
        <li><strong>Abgeschlossen</strong> (grün) — fertig, mit Bestätigungs-Modal</li>
      </Ul>
      <P>Intern gibt es noch <code>in_bearbeitung</code> als Legacy-Status, wird aber auf &bdquo;Aktiv&ldquo; gemappt. Das Dashboard-Widget &bdquo;Laufende Projekte&ldquo; zählt alles außer &bdquo;Abgeschlossen&ldquo; und Archiviert.</P>

      <Divider />
      <H2 id="projekte-budget">Budget (gesamt + Produkt)</H2>
      <P>Zwei separate Budget-Felder mit automatischen <strong>Tausenderpunkten</strong> bei der Eingabe:</P>
      <Ul>
        <li><strong>Gesamtbudget</strong> — intern, inkl. Service-Honorar (z. B. 25.000 €)</li>
        <li><strong>Produkt-Budget</strong> — wird dem Kunden mitgeteilt, ohne Service-Anteil (z. B. 18.000 €)</li>
      </Ul>
      <P>Auf der Detail-Seite zeigt der Budget-Ring den Verbrauch (Ist-Kosten aus Raum-Produkten / Produkt-Budget oder Fallback Gesamtbudget). Service-Kosten werden separat aufgelistet.</P>

      <Divider />
      <H2 id="projekte-service">Service-Modell</H2>
      <P>Wie verrechnest du dein Honorar?</P>
      <Ul>
        <li><strong>Keins</strong> — kein Service-Honorar getrennt</li>
        <li><strong>Pauschale</strong> — fester Betrag (z. B. 5.000 €)</li>
        <li><strong>Stundensatz</strong> — €/h, wird mit erfasster Zeit multipliziert</li>
      </Ul>

      <Divider />
      <H2 id="projekte-zeit">Zeiterfassung</H2>
      <P>Bei <strong>Stundensatz-Projekten</strong> erscheint auf der Detail-Seite ein Zeiterfassungs-Block. Inline-Formular: Datum + Stunden + Beschreibung + Toggle &bdquo;abrechenbar&ldquo;. Liste aller Einträge mit Summen-Zeile in € (Stundensatz × Stunden).</P>

      <Divider />
      <H2 id="projekte-deadline">Deadline + Verantwortlicher</H2>
      <P>Im Header siehst du den Countdown — &bdquo;noch 5 Tage&ldquo; (grau), &bdquo;in 7 Tagen&ldquo; (amber bei ≤ 7 Tagen), &bdquo;3 Tage überfällig&ldquo; (rot). Der Verantwortliche wird im Team-Tab eingestellt und ist optional sichtbar.</P>

      <Divider />
      <H2 id="projekte-actions">Duplizieren / Archivieren / Löschen</H2>
      <P>Im Header rechts gibt es ein ⋮-Dropdown:</P>
      <Ul>
        <li><strong>Duplizieren</strong> — kopiert Projekt inkl. Räume; Modal lässt dich auswählen, ob Produkte mitkopiert werden sollen</li>
        <li><strong>Archivieren</strong> — versteckt aus aktiver Liste, kein Löschen</li>
        <li><strong>Löschen</strong> (nur Admin) — Soft-Delete mit Bestätigung</li>
      </Ul>

    </div>
  )
}

function ProdukteKapitel() {
  return (
    <div>
      <H2 id="produkte-bibliothek">Bibliothek vs. Raum-Einsatz</H2>
      <P>Wir trennen <strong>Bibliotheks-Produkt</strong> und <strong>Raum-Einsatz</strong> sauber:</P>
      <Ul>
        <li><strong>Produkt</strong> = der Eintrag in der Bibliothek (Sidebar → <strong>Produkte</strong>) mit Stammdaten: Name, Bild, Bibliotheks-Preis, Material, Maße, Partner</li>
        <li><strong>Raum-Einsatz</strong> = die Verknüpfung Produkt ↔ Raum (Junction-Tabelle <code>raum_produkte</code>) mit Menge, optionalem Preis-Override, Rabatt %, eigenem Bestell- und Freigabe-Status</li>
      </Ul>
      <P>Daher kann derselbe Bibliotheks-Eintrag in 5 Räumen verschieden viel kosten und unterschiedliche Status haben. Auf der Bibliotheks-Seite siehst du pro Produkt &bdquo;In 3 Räumen verbaut · 8 Stk.&ldquo;.</P>

      <Divider />
      <H2 id="produkte-autofill">Auto-Fill (URL + AI)</H2>
      <P>Beim Anlegen eines Produkts URL einfügen → <strong>Auto-Fill</strong>:</P>
      <Ol>
        <li><strong>Klassischer Scraper</strong> (cheerio) liest JSON-LD, Microdata, OpenGraph + Shop-spezifische Selektoren (Shopify, WooCommerce, Magento).</li>
        <li>Findet er weniger als 3 Felder, eskaliert das System automatisch zu <strong>Claude Haiku 4.5</strong> mit dem bereinigten Seitentext — füllt fehlende Felder strukturiert auf. Im Modal-Header erscheint ein violettes &bdquo;✨ AI&ldquo;-Badge.</li>
        <li>Mehrere Bilder werden gesammelt, du wählst im Modal als Grid bis zu 5 aus.</li>
        <li><strong>Auto-Partner</strong>: passt die Domain zu einem deiner Partner, wird dieser direkt im Formular gesetzt + Logo via Favicon übernommen.</li>
        <li><strong>URL-History</strong>: zuletzt gescrapte Domains als Klick-Chips unter dem URL-Feld.</li>
      </Ol>

      <Divider />
      <H2 id="produkte-screenshot">Screenshot-Upload</H2>
      <P>Wenn die Seite gescraped nicht funktioniert (Cloudflare, Login, JavaScript-only): klick auf <strong>Screenshot</strong> neben dem Auto-Fill-Knopf.</P>
      <Ul>
        <li>Drag-and-Drop oder Datei-Picker, PNG/JPG/WebP/GIF, max. 5 MB</li>
        <li>Live-Vorschau, &bdquo;Analysieren&ldquo;-Button</li>
        <li><strong>Claude Sonnet 4.6 Vision</strong> liest die sichtbaren Daten aus → öffnet das normale Auto-Fill-Modal mit den extrahierten Feldern</li>
        <li>Konservativer Prompt: keine Halluzinationen, weglassen statt raten</li>
      </Ul>
      <InfoBox type="info" title="Cost">
        Haiku-HTML-Fallback ~$0.001 pro Aufruf · Sonnet-Vision-Screenshot ~$0.005. Voraussetzung ist <code>ANTHROPIC_API_KEY</code> in den Server-Env-Vars (Vercel).
      </InfoBox>

      <Divider />
      <H2 id="produkte-bilder">Mehrere Bilder</H2>
      <P>Pro Produkt bis zu <strong>5 Bilder</strong>. Drag-and-Drop im Bilder-Grid, Reihenfolge per Pfeil-Buttons. Erste Bild ist das Hauptbild für Listen + Kunden-Freigabe.</P>

      <Divider />
      <H2 id="produkte-preise">Preisberechnung</H2>
      <Ul>
        <li><strong>EP netto</strong> = dein Einkaufspreis</li>
        <li><strong>VP netto</strong> = EP × (1 + Marge / 100)</li>
        <li><strong>VP brutto</strong> = VP netto × (1 + MwSt-Satz, default 19 %)</li>
        <li><strong>Provision</strong> = VP netto × Provision %</li>
      </Ul>
      <P>Du kannst alternativ direkt <strong>VP netto</strong> oder <strong>VP brutto</strong> eingeben — die anderen Werte rechnen sich rückwärts. Im Raum-Einsatz lassen sich VP-Override + Rabatt zusätzlich setzen, ohne den Bibliothekspreis zu ändern.</P>
      <InfoBox type="tip" title="MwSt-Satz">
        Global in <strong>Einstellungen → Workspace</strong> einstellbar. Wirkt überall gleich.
      </InfoBox>

      <Divider />
      <H2 id="produkte-status">Status pro Raum-Einsatz</H2>
      <P>Bestell- und Freigabe-Status liegen <strong>pro raum_produkte-Eintrag</strong> (Migration 076):</P>
      <H3>Bestell-Status</H3>
      <Ul>
        <li><strong>Ausstehend</strong> — noch nichts bestellt</li>
        <li><strong>Bestellt</strong> — Bestellung beim Lieferanten raus</li>
        <li><strong>Geliefert</strong> — Ware eingetroffen</li>
        <li><strong>Rechnung erhalten</strong> — Rechnung vom Lieferant da</li>
      </Ul>
      <H3>Freigabe-Status</H3>
      <Ul>
        <li><strong>Ausstehend</strong> · <strong>Freigegeben</strong> · <strong>Abgelehnt</strong> · <strong>Überarbeitung</strong></li>
      </Ul>
      <P>Inline ändern in der Sortable-Produkt-Tabelle pro Raum (optimistisches UI). Liefertermin + Bestellt-Datum lassen sich direkt am Raum-Einsatz setzen.</P>

      <Divider />
      <H2 id="produkte-varianten">Varianten</H2>
      <P>Ein Produkt kann <strong>Varianten</strong> haben — selbe Basis, unterschiedliche Attribute (z. B. Farbe, Größe). Auf der Produkt-Bearbeiten-Seite legst du Varianten-Definitionen an (Attribut + Optionen) und erzeugst pro Kombination eine Variante. Jede Variante ist ein eigenes Produkt mit Verweis auf das Eltern-Produkt.</P>
    </div>
  )
}

function FreigabenKapitel() {
  return (
    <div>
      <H2 id="freigaben-uebersicht">Dashboard</H2>
      <P>Sidebar → <strong>Freigaben</strong> zeigt alle Produkte aller Projekte:</P>
      <Ul>
        <li><strong>Hero-Progressbar</strong> oben — Verteilung über alle Status (grün/amber/rot/violett) auf einen Blick</li>
        <li><strong>Status-Chips</strong>: 4 farbige Filter-Pills mit Anzahl (• 4 Freigegeben, • 34 Ausstehend …) — klickbar zum Umschalten + Alle-Chip rechts</li>
        <li><strong>Action-Bar</strong>: Volltextsuche (Produkt / Raum / Projekt / Kategorie) + Projekt-Filter-Dropdown + View-Toggle</li>
      </Ul>

      <Divider />
      <H2 id="freigaben-bulk">Bulk-Aktionen</H2>
      <P>Pro Zeile + pro Gruppen-Header gibt es eine Checkbox. Sobald mindestens 1 Produkt markiert ist, erscheint unten eine <strong>Floating Action-Bar</strong>:</P>
      <Ul>
        <li>&bdquo;N ausgewählt&ldquo; · Freigeben · Ablehnen · Überarbeiten · Zurücksetzen · Alle sichtbaren · X (deselect)</li>
        <li>Sammel-Aktion betrifft alle markierten Produkte gleichzeitig (1 Batch-Update statt N Requests)</li>
        <li>Alle Bulk-Änderungen werden ins <strong>Audit-Log</strong> geschrieben (Kanal &bdquo;admin&ldquo;)</li>
      </Ul>

      <Divider />
      <H2 id="freigaben-filter">Filter &amp; Suche</H2>
      <P>Status-Chips funktionieren als Filter + Volltext + Projekt-Dropdown lassen sich kombinieren (UND).</P>

      <Divider />
      <H2 id="freigaben-ansichten">Ansichten</H2>
      <P>View-Toggle rechts:</P>
      <Ul>
        <li><strong>Gruppen</strong> — aufklappbare Projekt-Karten mit Mini-Progressbar pro Projekt, VP-Summe, Offen-Badge</li>
        <li><strong>Tabelle</strong> — flache Liste mit Projekt-Info pro Zeile (CSV-ähnlich)</li>
        <li><strong>Balken</strong> — visueller Vergleich der Statusverteilung</li>
      </Ul>
    </div>
  )
}

function KundenfreigabeKapitel() {
  return (
    <div>
      <H2 id="kf-link">Link erstellen (Scopes)</H2>
      <P>Auf der Projekt-Detail-Seite öffnest du die <strong>Freigabe-Link</strong>-Karte. Pro Link kannst du den <strong>Scope</strong> wählen — was der Kunde sehen darf:</P>
      <Ul>
        <li><strong>Gesamtes Projekt</strong> — alle Räume + alle Produkte</li>
        <li><strong>Einzelner Raum</strong> — nur die Produkte eines Raums</li>
        <li><strong>Auswahl</strong> — du markierst genau die Produkte, die freigegeben werden sollen</li>
      </Ul>
      <P>Token wird kryptographisch erzeugt, Gültigkeitsdauer ist konfigurierbar (default unbegrenzt). Beim Abschluss wird der Token <strong>nicht gelöscht</strong> — er bleibt für Audit-Zwecke abrufbar, aber inaktiv.</P>

      <Divider />
      <H2 id="kf-pin">PIN-Schutz</H2>
      <P>Pro Link optional ein <strong>4–6-stelliger PIN</strong> aktivieren — der Kunde muss ihn beim Öffnen eingeben. Wir hashen den PIN serverseitig (bcrypt). Toast-Feedback im Admin-UI zeigt nach Speichern an, dass der PIN aktiv ist. Versende den PIN immer auf einem anderen Kanal als den Link.</P>

      <Divider />
      <H2 id="kf-mobile">Mobile Kundenansicht</H2>
      <P>Die Freigabe-Seite (<code>/freigabe/&lt;token&gt;</code>) ist mobil-first gebaut:</P>
      <Ul>
        <li>Großes Produktbild oben, einklappbare Beschreibung</li>
        <li>Touch-optimierte Buttons (py-3.5, flex-col → row auf größeren Screens): Freigeben · Ablehnen · Überarbeitung · Zurücksetzen</li>
        <li>Mini-Donut im Header zeigt Gesamtfortschritt</li>
        <li>Preis-Grid in 2 Spalten (VP netto / brutto)</li>
        <li>Branding: Logo, Farben, Schrift, Welcome-Text aus deinem Branding-Tab werden übernommen</li>
      </Ul>

      <Divider />
      <H2 id="kf-audit">Audit-Log</H2>
      <P>Jede Status-Änderung (durch Kunde oder Admin) wird im <code>freigabe_audit</code>-Log mit Timestamp + IP + User-Agent festgehalten. Auf Wunsch im Admin-Tool einsehbar.</P>
    </div>
  )
}

function OnboardingKapitel() {
  return (
    <div>
      <H2 id="ob-link">Link erstellen</H2>
      <P>Sidebar → <strong>Onboarding</strong> → <strong>+ Neuer Link</strong>:</P>
      <Ol>
        <li><strong>Vorlage</strong> wählen — Typ-Avatar + Frage-Anzahl + Standard-Badge sichtbar</li>
        <li>Bei Projekt-Vorlage: optional <strong>Kunde verknüpfen</strong> (Kontaktdaten werden vorausgefüllt)</li>
        <li>Bei Neukunden/Universal-Vorlage oder ohne verknüpften Kunden: optional <strong>Empfänger-Etikett</strong> + E-Mail (siehe nächster Abschnitt)</li>
        <li>Link wird erstellt und kopiert ins Clipboard, du verschickst ihn manuell</li>
      </Ol>

      <Divider />
      <H2 id="ob-empfaenger">Empfänger-Etikett</H2>
      <P>Bei Neukunden-Onboardings gibt&apos;s noch keinen Kunden in der DB — du wüsstest in der Übersicht nicht, an wen du den Link geschickt hast. Lösung:</P>
      <Ul>
        <li>Optionales <strong>&bdquo;Für wen?&ldquo;-Etikett</strong> beim Erstellen (z. B. &bdquo;Frau Müller (Instagram-Anfrage)&ldquo;)</li>
        <li>Optionale Empfänger-E-Mail (für späteren Mail-Versand)</li>
        <li>Etikett ist <strong>nur für deine interne Übersicht</strong> — der Kunde sieht es im Formular nicht und es verfälscht den Status nicht</li>
        <li>Nachträglich bearbeitbar: im Detail-Panel der Anfrage gibt&apos;s einen Pencil-Button bei der Adressat-Zeile</li>
      </Ul>

      <Divider />
      <H2 id="ob-vorlagen">Vorlagen-Editor</H2>
      <P>Sidebar → <strong>Onboarding → Vorlagen</strong>. Pro Vorlage:</P>
      <Ul>
        <li>Name, Beschreibung, Typ (Neukunde / Projekt / Universal)</li>
        <li>Einleitungs- und Abschluss-Text, Akzentfarbe (für die Kundenansicht)</li>
        <li>E-Mail-Betreff + Text (für den Versand-Helper)</li>
        <li>Deadline-Tage (Auto-Ablauf)</li>
        <li><strong>Als Standard markieren</strong> — wird bei neuen Links vorausgewählt</li>
      </Ul>
      <P><strong>Fragen-Editor</strong>: Sektionen mit Gruppen, je 12+ Feldtypen — Text / Textarea / E-Mail / Telefon / URL / Ja-Nein / Bewertung / Skala / Auswahl / Mehrfachauswahl / Datum / Datum-Rechner / Slider / Budget-Verteilung / Upload / Inventar / Prioritäten / Checkliste / Rangfolge / Entscheider-Matrix. Mit <strong>Conditional Logic</strong> (zeige Frage X nur wenn Frage Y = Wert Z).</P>
      <P>Vorschau-Modal zeigt das Formular wie der Kunde es sieht. Drei Beispiel-Vorlagen beim Erstellen wählbar (Gewerbe / Privat / Hotel).</P>

      <Divider />
      <H2 id="ob-status">Status-Flow</H2>
      <P>Sechs sichtbare Stati in der Übersicht:</P>
      <Ul>
        <li><strong>Wartet auf Eintrag</strong> (grau) — Link erstellt, kein verknüpfter Kunde, kein Etikett</li>
        <li><strong>Wartet auf Kunde</strong> (amber) — Link gesendet, Kunde verknüpft oder Etikett gesetzt</li>
        <li><strong>In Bearbeitung</strong> (indigo) — Kunde hat angefangen, Auto-Save aktiv (Fortschritts-%)</li>
        <li><strong>Eingereicht</strong> (grün) — Formular abgeschickt, du kannst übernehmen</li>
        <li><strong>Abgeschlossen</strong> (blau) — du hast Kunde/Projekt aus der Anfrage angelegt</li>
        <li><strong>Abgelehnt</strong> (rot) — manuell verworfen</li>
      </Ul>
      <P>Das Auto-Save speichert Antworten serverseitig nach jedem Section-Wechsel — der Kunde kann den Link schließen und später weitermachen.</P>

      <Divider />
      <H2 id="ob-uebernehmen">Als Kunde / Projekt anlegen</H2>
      <P>Bei eingereichter Anfrage erscheint im Detail-Panel:</P>
      <Ul>
        <li><strong>Kunde + Projekt anlegen</strong> (wenn Projekt-Name in der Anfrage) — legt beide an, ggf. Räume aus den Antworten</li>
        <li><strong>Als Kunde anlegen</strong> (sonst) — nur Kunde, kein Projekt</li>
      </Ul>
      <P>Kontakt- und Projektdaten werden aus den Antworten vorausgefüllt. Nach dem Anlegen springt die UI direkt in den neuen Datensatz.</P>
    </div>
  )
}

function KonfiguratorKapitel() {
  return (
    <div>
      <H2 id="konf-session">Session erstellen</H2>
      <P>Der Konfigurator ist ein <strong>interaktiver Link mit Budget-Tracking</strong> — der Kunde entscheidet selbstständig pro Produkt, du siehst live den Verbrauch.</P>
      <Ol>
        <li>Projekt-Detail-Seite → <strong>Kunden-Konfigurator</strong>-Karte</li>
        <li><strong>Neue Session</strong> → Optionen einstellen</li>
        <li>Generierten Link kopieren + an Kunde senden</li>
      </Ol>

      <Divider />
      <H2 id="konf-aktionen">Kunden-Aktionen (4)</H2>
      <P>Pro Produkt kann der Kunde:</P>
      <Ul>
        <li><strong>Übernehmen</strong> (grün) — wird ins Budget gezählt</li>
        <li><strong>Ablehnen</strong> (rot) — fliegt raus</li>
        <li><strong>Alternative</strong> (amber) — du sollst was anderes vorschlagen</li>
        <li><strong>Unentschieden</strong> (grau) — später entscheiden</li>
      </Ul>
      <P>UI ist mobil-first mit großen Touch-Buttons und Produktbild-Karten.</P>

      <Divider />
      <H2 id="konf-budget">Budget-Tracking</H2>
      <P>Beim Erstellen setzt du ein <strong>Budget-Limit</strong>. Der Kunde sieht oben einen Fortschrittsbalken: &bdquo;X € von Y € verplant&ldquo;. Geht über 100 % wird&apos;s rot. Du kannst optional die VP-Preise verstecken (dann sieht der Kunde nur den Budget-Verbrauch).</P>

      <Divider />
      <H2 id="konf-uebernahme">Ergebnis übernehmen</H2>
      <P>Nach Abschluss der Session zeigt das Ergebnis-Modal:</P>
      <Ul>
        <li>Alle Entscheidungen pro Produkt</li>
        <li>Gesamtsumme der übernommenen Produkte</li>
        <li>Kunden-Notiz (falls hinterlassen)</li>
      </Ul>
      <P>Mit <strong>&bdquo;Auswahl übernehmen&ldquo;</strong> werden die Entscheidungen automatisch als Freigabe-Status in die Raum-Produkte übertragen. Alternativ: <strong>&bdquo;Aus Auswahl Angebot erstellen&ldquo;</strong> — generiert direkt ein Angebot mit den übernommenen Produkten als Positionen.</P>
    </div>
  )
}

function TimelineKapitel() {
  return (
    <div>
      <H2 id="tl-events">Events erstellen</H2>
      <P>Projekt-Detail → Toolbar → <strong>Timeline</strong>. Pro Event:</P>
      <Ul>
        <li><strong>Meilenstein</strong> — punktuell (Raute ◆)</li>
        <li><strong>Lieferung</strong> — erwartete Warenlieferung (LKW-Icon)</li>
        <li><strong>Termin</strong> — Meeting / Abnahme / Kundengespräch</li>
        <li><strong>Phase</strong> — Zeitspanne mit Start + Ende (Balken)</li>
      </Ul>
      <P>Pro Event optional: Beschreibung, Status (Geplant/Aktiv/Abgeschlossen), Erinnerung-Tage, <strong>Raum-Zuordnung</strong>, <strong>Abhängigkeiten</strong> (von welchem anderen Event hängt es ab).</P>

      <Divider />
      <H2 id="tl-autosync">Auto-Sync</H2>
      <P>Bestimmte Events werden automatisch erstellt und synchron gehalten — du musst sie nicht manuell pflegen:</P>
      <Ul>
        <li><strong>Produkt-Liefertermin</strong> → Lieferungs-Event (kunde-sichtbar)</li>
        <li><strong>Produkt-Bestellt-Datum</strong> → internes Lieferungs-Event (nicht sichtbar)</li>
        <li><strong>Projekt-Deadline</strong> → Meilenstein-Event (kunde-sichtbar)</li>
        <li><strong>Angebot gesendet/angenommen</strong> → Termin-Event</li>
        <li><strong>Vertrag zur Unterschrift</strong> → Phase mit Gültigkeits-Range</li>
      </Ul>
      <P>Auto-Events haben eine gestrichelte Kontur und ein ⚡-Icon. Du kannst sie nicht manuell verschieben — Änderung im Quell-Datensatz führt automatisch zum Update.</P>

      <Divider />
      <H2 id="tl-gantt">Gantt + Abhängigkeiten</H2>
      <P>Die Gantt-Ansicht zeigt:</P>
      <Ul>
        <li>Horizontale Zeitachse mit Tages-Snap (32 px = 1 Tag)</li>
        <li>Roter Today-Marker, automatisches Scrollen dorthin</li>
        <li>Manuelle Events per <strong>Drag &amp; Drop</strong> verschiebbar (mit Tages-Snap, end_datum behält die Dauer)</li>
        <li><strong>Abhängigkeiten als Bézier-Pfeile</strong>: grün normal, rot gestrichelt mit Warn-Pfeilspitze bei Datumskonflikt</li>
        <li><strong>Kaskaden-Toggle</strong> &bdquo;Abhängige mitverschieben&ldquo; — transitives Mitziehen aller abhängigen Events</li>
      </Ul>

      <Divider />
      <H2 id="tl-raumfilter">Raum-Filter</H2>
      <P>Chip-Row oben: <strong>Alle · Projekt-Ebene · {'{'}Räume{'}'}</strong>. URL-Param <code>?raum=&lt;id&gt;</code> erlaubt Deep-Links direkt von der Raum-Detail-Seite. Auf der Raum-Detail-Seite kannst du auch direkt Events anlegen (mit raum_id vorausgefüllt).</P>

      <Divider />
      <H2 id="tl-kundensicht">Kunde-sichtbar</H2>
      <P>Pro Event ein Toggle <strong>&bdquo;Für Kunde im Portal sichtbar&ldquo;</strong>. Default je Quelle:</P>
      <Ul>
        <li>Produkt-Liefertermine → sichtbar</li>
        <li>Manuelle Meilensteine + Termine → sichtbar</li>
        <li>Bestell-Status-Updates → intern</li>
        <li>Angebote → intern</li>
      </Ul>
      <P>Das Kundenportal zeigt nur Events mit <code>kunde_sichtbar = true</code>.</P>
    </div>
  )
}

function PartnerKapitel() {
  return (
    <div>
      <H2 id="partner-anlegen">Partner anlegen</H2>
      <P>Sidebar → <strong>Partner</strong> → <strong>+ Neuer Partner</strong>. Pflichtfeld ist nur der Name. Optional: Partner-Typ (Lieferant / Hersteller / Handwerker / Planer / Sonstiges), Website, Adresse, USt-IdNr., IBAN, Zahlungsziel, Bewertung (1–5 Sterne), Einkaufskonditionen, Provisionsmodell + -wert.</P>
      <P>Ansprechpartner werden NICHT mehr im Formular erfasst — siehe Kontakte-Tab unten.</P>

      <Divider />
      <H2 id="partner-tabs">Sub-Tabs</H2>
      <P>Auf der Partner-Detail-Seite gibt es 5 Tabs (URL merkt sich den aktiven via <code>?tab=…</code>):</P>
      <Ul>
        <li><strong>Übersicht</strong> — Hauptkontakt-Mini-Karte, Firma-Karte (Website/USt/IBAN/Adresse), Notizen</li>
        <li><strong>Kontakte</strong> — Kontaktpersonen-Verwaltung (siehe nächster Abschnitt)</li>
        <li><strong>Konditionen</strong> — detaillierte Konditionen (siehe unten)</li>
        <li><strong>Verträge</strong> — Datei-Upload für Rahmenverträge / NDAs</li>
        <li><strong>Produkte</strong> — Sortiment + Einsatz (siehe unten)</li>
      </Ul>
      <P>KPI-Band oben: <strong>Bestellter Umsatz · Aktive Bestellungen · Offene Lieferungen</strong>.</P>

      <Divider />
      <H2 id="partner-kontakte">Mehrere Kontakte</H2>
      <P>Wie bei Kunden: beliebig viele Kontaktpersonen mit Name, Rolle (Vertrieb / Innendienst / GF / Buchhaltung / …), eigene E-Mail / Telefon / Mobil, Notizen. <strong>Hauptkontakt</strong> mit Stern-Badge wird in Listen + PDFs verwendet. Backwards-kompatibel über <code>partner.ansprechpartner/email/telefon</code>-Sync.</P>

      <Divider />
      <H2 id="partner-konditionen">Konditionen</H2>
      <P>Komplexere Konditionen als der einfache Provisionssatz im Formular:</P>
      <Ul>
        <li><strong>Prozent fix</strong> — z. B. 15 % auf alles</li>
        <li><strong>Prozent gestaffelt</strong> — JSON mit Staffelung (Umsatz X → Y %)</li>
        <li><strong>Fixbetrag pro Einheit</strong></li>
        <li><strong>Pro Kategorie</strong> — JSON mit Kategorie-Werten</li>
        <li><strong>Skonto</strong>, <strong>Zahlungsziel</strong>, <strong>Gültigkeitszeitraum</strong></li>
      </Ul>

      <Divider />
      <H2 id="partner-vertraege">Verträge / Dokumente</H2>
      <P>Datei-Upload (PDF/DOCX, max. 50 MB) für Rahmenverträge, NDAs, Konditionsvereinbarungen. Pro Datei: Titel, Vertragstyp, Gültig-von/bis, Notizen. Storage in privatem Bucket mit Pfad-konvention <code>org/partner/file</code>.</P>

      <Divider />
      <H2 id="partner-produkte">Sortiment + Einsatz</H2>
      <P>Im Produkte-Tab gibt es zwei Sub-Ansichten:</P>
      <Ul>
        <li><strong>Sortiment</strong> — 1 Zeile pro Bibliotheks-Produkt, aggregiert: &bdquo;In 3 Räumen verbaut · 8 Stk. · 2 bestellt (1 geliefert)&ldquo;. Status / Raum / Menge sind hier weg, weil sie pro Einsatz unterschiedlich sind.</li>
        <li><strong>Einsatz</strong> — 1 Zeile pro Raum-Produkt-Einsatz mit eigenem Bestell- + Freigabestatus, Projekt + Raum verlinkt, Menge, effektivem VP. Filter nach Projekt + Bestellstatus, Volltextsuche, Summen-Footer.</li>
      </Ul>

      <Divider />
      <H2 id="partner-bewertung">Bewertung + Filter</H2>
      <P>1–5 Sterne pro Partner. In der Partner-Liste:</P>
      <Ul>
        <li><strong>Bewertungs-Filter</strong> — Pills &bdquo;Alle / 3+ ⭐ / 4+ ⭐ / 5+ ⭐&ldquo;</li>
        <li><strong>Sortierung</strong> — Name (A–Z) / Bewertung ↓ / Bewertung ↑</li>
        <li>Sterne sichtbar in Karten- und Listen-Ansicht</li>
      </Ul>
      <InfoBox type="tip" title="Auto-Favicon">
        Wenn Website hinterlegt + kein Logo: Favicon der Domain wird automatisch via Google-Service als Logo gesetzt. Eigene Uploads werden nie überschrieben.
      </InfoBox>
    </div>
  )
}

function RaeumeKapitel() {
  return (
    <div>
      <H2 id="raeume-anlegen">Raum anlegen</H2>
      <P>Räume strukturieren ein Projekt thematisch. Auf der Projekt-Detail-Seite klickst du auf <strong>+ Raum hinzufügen</strong>:</P>
      <Ol>
        <li>Name eingeben (z. B. &bdquo;Wohnzimmer&ldquo;, &bdquo;Büro EG Süd&ldquo;)</li>
        <li>Optional: Raumtyp aus Dropdown wählen (Wohnzimmer, Büro, Bad, Küche, …) — Icon erscheint später in der Karte</li>
        <li>Speichern</li>
      </Ol>
      <P>Raumtypen kommen aus dem Kategorien-Tab in den Einstellungen — kannst eigene anlegen mit eigenem Icon (Lucide-Name).</P>

      <Divider />
      <H2 id="raeume-budget">Budget pro Raum</H2>
      <P>Jeder Raum hat ein eigenes optionales Budget. In der Raum-Karte auf der Projekt-Seite siehst du einen <strong>Fortschrittsbalken</strong>: Ist-Kosten (effektiver VP × Menge aller zugewiesenen Produkte) gegen Raum-Budget. Über 100 % wird rot.</P>

      <Divider />
      <H2 id="raeume-produkte">Produkte zuweisen</H2>
      <P>Auf der Raum-Detail-Seite gibt es zwei Wege:</P>
      <Ul>
        <li><strong>Neues Produkt anlegen</strong> — direkt im Raum, geht direkt in die Bibliothek + den Raum zugleich</li>
        <li><strong>Aus Bibliothek zuweisen</strong> — Modal mit Suche, klickst dir bestehende Produkte rein</li>
      </Ul>
      <P>Pro Raum-Einsatz kannst du:</P>
      <Ul>
        <li><strong>Menge</strong> setzen (z. B. 2 Stk.)</li>
        <li><strong>VP-Override</strong> — eigener Preis nur für diesen Einsatz (ohne den Bibliotheks-Preis zu ändern)</li>
        <li><strong>Rabatt %</strong> — wird auf den effektiven VP angewendet</li>
        <li><strong>Bestellstatus + Freigabe-Status</strong> getrennt pro Einsatz (siehe Produkte-Kapitel)</li>
      </Ul>
      <InfoBox type="tip" title="Hintergrund">
        Junction-Tabelle <code>raum_produkte</code>: derselbe Bibliotheks-Artikel kann in Raum A 2x und in Raum B 5x verbaut sein — mit eigenen Mengen, Preisen und Status pro Einsatz.
      </InfoBox>

      <Divider />
      <H2 id="raeume-grundriss">Grundriss-Vorschau</H2>
      <P>Über der Produkttabelle siehst du eine <strong>Mini-Vorschau des Grundrisses</strong>, sobald du im Raumplaner einen Plan gespeichert hast. Klick auf &bdquo;Im Raumplaner bearbeiten&ldquo; öffnet den vollen Editor (siehe Raumplaner-Kapitel).</P>

      <Divider />
      <H2 id="raeume-reihenfolge">Reihenfolge per Drag &amp; Drop</H2>
      <P>Auf der Projekt-Seite kannst du Räume per <strong>⠿-Handle</strong> links neben der Karte umsortieren. Optimistisches UI — sofort sichtbar, im Hintergrund gespeichert. Genauso für Produkte innerhalb eines Raums.</P>
    </div>
  )
}
function PortalKapitel() {
  return (
    <div>
      <H2 id="portal-zugang">Zugang einrichten</H2>
      <P>Im Gegensatz zum öffentlichen Freigabe-Link hat das Portal einen <strong>echten Login</strong>. Schritte:</P>
      <Ol>
        <li>Auf der Kunden-Detail-Seite Block <strong>Kunden-Portal</strong> öffnen</li>
        <li><strong>Einladung erstellen</strong> → E-Mail eingeben, optional Vor-/Nachname</li>
        <li>Einladungslink wird generiert (bcrypt + Session-Cookie-Auth, unabhängig von Supabase Auth)</li>
        <li>Link an Kunde senden — er setzt sein Passwort beim Erstaufruf</li>
      </Ol>
      <InfoBox type="info" title="Hintergrund">
        Eigenes Auth-System (Tabellen <code>client_users</code>, Session-Token-Cookie), damit Portal-User nicht im Supabase-User-Pool landen. Admin-Operationen via <code>createAdminClient()</code>.
      </InfoBox>

      <Divider />
      <H2 id="portal-welcome">Willkommens-Tour</H2>
      <P>Beim ersten Login startet automatisch ein 3-Schritt-Intro:</P>
      <Ul>
        <li>&bdquo;Willkommen bei {'{'}Firma{'}'}&ldquo; mit Branding-Akzentfarbe</li>
        <li>&bdquo;Produkte freigeben&ldquo; — kurze Erklärung des Freigabe-Workflows</li>
        <li>&bdquo;Direkter Chat statt E-Mail-Ping-Pong&ldquo; — Verweis auf Chat-Block</li>
      </Ul>
      <P>LocalStorage-Flag verhindert, dass die Tour bei jedem Login wieder aufpoppt. X-Button oder Hintergrund-Klick schließt sie jederzeit.</P>

      <Divider />
      <H2 id="portal-projekt">Projektansicht</H2>
      <P>Pro Projekt sieht der Kunde:</P>
      <Ul>
        <li>Produkte gruppiert nach Raum mit Status-Badges</li>
        <li>Freigabe-Aktionen direkt inline (selber Mechanismus wie Freigabe-Link, aber mit Login)</li>
        <li>Mini-Timeline mit allen Events, die <strong>kunde_sichtbar = true</strong> markiert sind</li>
        <li>Fortschrittsanzeige (Freigaben %)</li>
      </Ul>

      <Divider />
      <H2 id="portal-chat">Chat &amp; Dokumente</H2>
      <P><strong>Chat</strong> — Echtzeit-Nachrichten zwischen Kunde und Studio, mit Datei-/Bild-/Audio-Anhängen (max. 50 MB). Ungelesene Nachrichten erscheinen als Badge im Sidebar-Tab.</P>
      <P><strong>Dokumente</strong> — Der Kunde kann Briefings, Skizzen, Inspirationsbilder hochladen, die du im Admin sehen kannst.</P>

      <Divider />
      <H2 id="portal-team">Team &amp; Einstellungen</H2>
      <P>Wenn der Kunde mehrere Mitarbeiter hat, kann er weitere Portal-User einladen (Rolle: Owner / Member). Im Profil-Tab kann er Vorname, Nachname, Avatar und Passwort ändern.</P>
    </div>
  )
}
function AngeboteKapitel() {
  return (
    <div>
      <H2 id="ang-erstellen">Angebot erstellen</H2>
      <P>Projekt-Detail → Toolbar → <strong>Angebote</strong>. Pro Angebot:</P>
      <Ul>
        <li>Auto-Nummer im Format <strong>AG-YYYY-NNN</strong> (pro Org fortlaufend)</li>
        <li>Titel, Einleitungstext, Zahlungsbedingungen, AGB, Gültig-bis-Datum</li>
        <li>Positions-Tabelle: Pos / Bezeichnung / Menge / Einheit / Einzelpreis (netto) / Gesamt</li>
        <li>Live-Summen: Netto · MwSt · Brutto, optional Rabatt</li>
        <li>Interne Notizen (nicht im PDF)</li>
      </Ul>

      <Divider />
      <H2 id="ang-aus-raeumen">Aus Raum-Produkten generieren</H2>
      <P>Statt Positionen einzeln einzutippen kannst du sie automatisch aus den Raum-Produkten generieren lassen — eine Zeile pro Produkt-Einsatz mit Menge + effektivem VP. Anschließend kannst du Positionen ergänzen, löschen oder umsortieren.</P>

      <Divider />
      <H2 id="ang-status">Status-Flow</H2>
      <Ul>
        <li><strong>Entwurf</strong> — wird gerade bearbeitet</li>
        <li><strong>Gesendet</strong> — an Kunde verschickt (auto Mail-Trigger optional)</li>
        <li><strong>Angesehen</strong> — Tracking via Token (optional)</li>
        <li><strong>Angenommen</strong> · <strong>Abgelehnt</strong> · <strong>Überarbeitung</strong> — Kundenrückmeldung</li>
      </Ul>
      <P>Statuswechsel im Dropdown rechts. Bei &bdquo;Gesendet&ldquo; wird automatisch ein Timeline-Event erstellt (Auto-Sync).</P>

      <Divider />
      <H2 id="ang-pdf">PDF-Export</H2>
      <P>Download-Button in der Liste oder Detail. PDF wird server-seitig mit jsPDF + autoTable generiert: Firmen-Header (Logo + Branding-Farbe), ANGEBOT-Titel mit Nummer, Kunden- + Datum-Block, Positions-Tabelle, Summen, AGB klein, Footer mit Seitenzahl.</P>

      <Divider />
      <H2 id="ang-vertrag">→ Vertrag erstellen</H2>
      <P>Bei einem angenommenen Angebot erscheint ein <strong>FileSignature-Button</strong> &bdquo;Vertrag erstellen&ldquo;. Eine Vertragsvorlage wird ausgewählt; Platzhalter werden mit Daten aus Angebot + Projekt + Kunde gefüllt. Der entstandene Vertrag verlinkt auf das Angebot via <code>angebot_id</code>.</P>
    </div>
  )
}

function VertraegeKapitel() {
  return (
    <div>
      <H2 id="ver-vorlagen">Vertragsvorlagen</H2>
      <P>Sidebar → <strong>Einstellungen → Vorlagen</strong>. Pro Vorlage HTML-Inhalt mit Platzhaltern wie <code>{'{{'} firmenname {'}}'}</code>, <code>{'{{'} kunde_name {'}}'}</code>, <code>{'{{'} projekt_name {'}}'}</code>, <code>{'{{'} budget_gesamt {'}}'}</code>, <code>{'{{'} datum_heute {'}}'}</code>, <code>{'{{'} deadline {'}}'}</code> uvm. (12 verfügbar).</P>
      <P>Beim ersten Login werden 3 Standard-Vorlagen geseedet: <strong>Interior Design Vertrag Standard</strong>, <strong>Angebot Standard</strong>, <strong>Auftragsbestätigung</strong>. Im Empty-State der Verwaltung gibt&apos;s einen &bdquo;Standard-Vorlagen laden&ldquo;-Button.</P>

      <Divider />
      <H2 id="ver-erstellen">Vertrag erstellen</H2>
      <P>Projekt-Detail → Toolbar → <strong>Verträge</strong>. Vorlage wählen + Daten ergänzen → Platzhalter werden ersetzt. Status-Flow: Entwurf → Gesendet → Zur Unterschrift → Aktiv → Abgeschlossen / Gekündigt.</P>

      <Divider />
      <H2 id="ver-signatur">Digitale Signatur</H2>
      <Ol>
        <li>Im Vertrag-Detail → <strong>Signatur-Link erstellen</strong> (Token, 30 Tage gültig)</li>
        <li>Link versenden — Kunde öffnet <code>/vertrag/&lt;token&gt;</code>, sieht Vertragstext</li>
        <li>Touch- oder Mouse-Canvas für die Unterschrift</li>
        <li>Submit → PNG der Unterschrift wird gespeichert + Bestätigungsseite</li>
        <li>Du kannst danach selbst (Firma) auch unterschreiben — eigenes Signatur-Modal</li>
      </Ol>

      <Divider />
      <H2 id="ver-anhaenge">Anhänge &amp; Meilensteine</H2>
      <P>Pro Vertrag: PDF-Anhänge hochladen (von dir und vom Kunden), <strong>Meilensteine</strong> (offen / in Arbeit / erledigt / abgerechnet) für Zahlungsstrecken oder Bauphasen, <strong>Audit-Log</strong> aller Vertragsereignisse.</P>

      <Divider />
      <H2 id="ver-pdf">PDF-Export</H2>
      <P>Wie beim Angebot: server-seitig generiert, mit Firmen-Header, Vertragsinhalt als HTML→Blöcke (h1/h2/h3/p/li/hr), Unterschriftsbereich 2-spaltig (Auftraggeber / Auftragnehmer mit Linie + Datum + Unterschrift), Footer mit Seitenzahl.</P>
    </div>
  )
}
function RaumplanerKapitel() {
  return (
    <div>
      <H2 id="rp-start">Erste Schritte</H2>
      <P>Der 2D-Raumplaner ist ein eigenständiger Editor, der pro Raum geöffnet wird:</P>
      <Ol>
        <li>Sidebar → <strong>Raumplaner</strong> zeigt alle Räume aller Projekte (mit/ohne Grundriss)</li>
        <li>ODER auf der Raum-Detail-Seite → Button <strong>Raumplaner öffnen</strong></li>
        <li>Editor öffnet sich vollflächig, NavSidebar wird ausgeblendet</li>
      </Ol>
      <P>Beim Erstaufruf gibst du Raumbreite + -länge ein — der Planer zeichnet automatisch die Raum-Kontur (geschützt, nicht löschbar). Auto-Save alle 3s.</P>

      <Divider />
      <H2 id="rp-tools">Werkzeuge</H2>
      <P>Toolbar oben mit Tastatur-Shortcuts:</P>
      <Ul>
        <li><Kb keys={['V']} /> <strong>Auswählen</strong> — Objekte verschieben, drehen, skalieren</li>
        <li><Kb keys={['W']} /> <strong>Wand</strong> — Klick-Klick zum Zeichnen, ESC oder Rechtsklick beendet</li>
        <li><Kb keys={['K']} /> <strong>Kurve</strong> — gebogene Wände via 3-Klick-Bézier</li>
        <li><Kb keys={['D']} /> <strong>Tür</strong>, <Kb keys={['F']} /> <strong>Fenster</strong> — auf Wand klicken, snappt automatisch</li>
        <li><Kb keys={['M']} /> <strong>Maß</strong> — Distanzlinie mit Tick-Marken + Label</li>
        <li><Kb keys={['E']} /> <strong>Radierer</strong>, <Kb keys={['N']} /> <strong>Notiz</strong>, <Kb keys={['S']} /> <strong>Form</strong></li>
        <li><Kb keys={['?']} /> Shortcut-Overlay einblenden</li>
      </Ul>

      <Divider />
      <H2 id="rp-moebel">Möbel &amp; Custom</H2>
      <P>Sidebar links: <strong>10 Möbel-Kategorien</strong> (Wohnzimmer / Schlafzimmer / Büro / Küche / Bad / Esszimmer / Garten / Wellness / Türen+Fenster / Elektro), 60+ vorgefertigte Symbole mit SVG-Draufsicht. Drag-and-Drop oder Klick zum Platzieren.</P>
      <Ul>
        <li>⭐ <strong>Favoriten</strong> — Stern-Icon klicken, erscheinen oben in der Sidebar (per Org gespeichert)</li>
        <li><strong>Custom Möbel</strong> — eigene Möbel anlegen (Name, Maße, Kategorie, Farbe), erscheinen für deine ganze Org</li>
        <li><strong>Produkt-Verknüpfung</strong> — Möbel-Objekt mit Bibliotheks-Produkt verknüpfen, Preise erscheinen im Kosten-Panel</li>
        <li><strong>Snap-to-Grid</strong> (Magnet-Button), Zoom mit Mausrad, Pan mit Space + Maus oder Mittelmaus</li>
      </Ul>

      <Divider />
      <H2 id="rp-boden-waende">Boden + Wandfarbe</H2>
      <P>Im rechten Panel:</P>
      <Ul>
        <li><strong>BODEN</strong>: 12 Texturen (Holz hell/dunkel, Parkett Fischgrät, Laminat, Fliesen, Marmor, Beton, Teppich) als Pattern-Fill</li>
        <li><strong>WÄNDE</strong>: 16 Vorschlags-Farben + Custom Color Picker — alle Wände gleichzeitig</li>
      </Ul>

      <Divider />
      <H2 id="rp-etagen">Etagen / Stockwerke</H2>
      <P>Tabs in der Toolbar: <strong>EG · OG · …</strong>. Pro Etage eigener Plan, Auto-Save schreibt in die aktive Etage. Neue Etage hinzufügen, leere löschen mit ×-Button.</P>

      <Divider />
      <H2 id="rp-versionen">Versionen</H2>
      <P>Versions-Knopf öffnet ein Übersichts-Modal:</P>
      <Ul>
        <li><strong>Aktuelle Arbeit</strong> als oberste Karte</li>
        <li>Liste älterer Versionen mit Mini-Vorschau, Datum, Beschreibung, Laden + Löschen</li>
        <li><strong>Neue Version speichern</strong> via Sub-Modal mit Name + Beschreibung + Live-Vorschau</li>
        <li><strong>Vergleichs-Ansicht</strong> ab 2 Versionen — V1/V2-Selektor side-by-side</li>
      </Ul>

      <Divider />
      <H2 id="rp-export">Export &amp; Freigabe</H2>
      <Ul>
        <li><strong>PDF</strong> — A4 Querformat mit grünem Header, Bounding-Box-Zoom (kein Beschnitt)</li>
        <li><strong>PNG / JPG</strong> — Auflösung 1× / 2× / 4×, transparenter oder weißer Hintergrund</li>
        <li><strong>Stückliste</strong> — Tabelle aller Möbel mit Maßen, Mengen, Preisen; CSV + XLSX-Export</li>
        <li><strong>Kunden-Freigabe-Link</strong> — generiert <code>/raumplan/&lt;token&gt;</code>: read-only Vorschau für den Kunden mit Logo, Zoom, Pan, PNG/PDF-Download. Inkl. <strong>QR-Code</strong> zum Teilen.</li>
        <li><strong>Aus Auswahl Angebot erstellen</strong> — sammelt alle verknüpften Produkte und legt direkt ein Angebot an</li>
      </Ul>
      <InfoBox type="tip" title="Bonus-Features">
        Layer-System (6 Layer mit Sichtbarkeit + Sperre), Kollisionserkennung, automatische Maßketten, Flächen-Berechnung im Panel, Bild-Import als Referenzebene, 6 Raum-Templates, Notizen-Tool, Gruppieren (Strg+G).
      </InfoBox>
    </div>
  )
}

function KategorienKapitel() {
  return (
    <div>
      <H2 id="kat-produkt">Produktkategorien</H2>
      <P>Produktkategorien helfen dabei, Produkte thematisch zu gruppieren (z. B. Möbel, Beleuchtung, Bodenbelag).</P>
      <P>Verwaltet werden sie unter <strong>Einstellungen → Kategorien → Produktkategorien</strong>.</P>
      <InfoBox type="info" title="Format">
        Kategorien werden im Format <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Name|IconName</code> gespeichert – z. B. <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Möbel|Sofa</code>. Der Icon-Name entspricht einem Lucide-Icon.
      </InfoBox>

      <Divider />
      <H2 id="kat-raum">Raumtypen</H2>
      <P>Raumtypen definieren die verfügbaren Kategorien beim Anlegen eines neuen Raums (z. B. Büro, Wohnzimmer, Küche). Sie werden ebenfalls im <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Name|Icon</code>-Format gespeichert.</P>

      <Divider />
      <H2 id="kat-projekt">Projektarten</H2>
      <P>Projektarten beschreiben die Art des Auftrags (z. B. Neueinrichtung, Renovation, Einzelmöbel). Sie werden beim Erstellen eines Projekts aus einer Dropdown-Liste gewählt.</P>

      <Divider />
      <H2 id="kat-icons">Icons anpassen</H2>
      <P>Alle Icons basieren auf der <strong>Lucide React</strong>-Bibliothek. Den Icon-Namen finden Sie auf <strong>lucide.dev</strong> – suchen Sie das gewünschte Icon und kopieren Sie den CamelCase-Namen (z. B. <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">ArmChair</code>, <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Lamp</code>).</P>
      <InfoBox type="warning" title="Achtung">
        Ungültige Icon-Namen führen zu einem Fallback-Icon. Prüfen Sie den Namen auf lucide.dev, bevor Sie speichern.
      </InfoBox>
    </div>
  )
}

function TeamKapitel() {
  return (
    <div>
      <H2 id="team-rollen">Rollen</H2>
      <P>Wellbeing Spaces unterscheidet drei Rollen:</P>
      <Ul>
        <li><strong>Admin</strong> – Vollzugriff auf alle Bereiche inkl. Einstellungen, Team und Branding</li>
        <li><strong>Editor</strong> – Kann Projekte, Kunden und Produkte anlegen und bearbeiten; kein Zugriff auf Einstellungen</li>
        <li><strong>Viewer</strong> – Nur lesender Zugriff; keine Bearbeitungsrechte</li>
      </Ul>
      <InfoBox type="info" title="Interne Felder">
        Einkaufspreise, Margen, Provisionen und interne Notizen sind für Viewer ausgeblendet.
      </InfoBox>

      <Divider />
      <H2 id="team-einladen">Mitglied einladen</H2>
      <Ol>
        <li>Einstellungen → <strong>Team</strong> → <strong>+ Einladen</strong></li>
        <li>E-Mail-Adresse des neuen Mitglieds eingeben</li>
        <li>Rolle (Admin / Editor / Viewer) auswählen</li>
        <li><strong>Einladung senden</strong> klicken</li>
      </Ol>
      <P>Das eingeladene Mitglied erhält eine E-Mail mit einem Aktivierungslink. Ausstehende Einladungen werden in der Team-Tabelle als <strong>Ausstehend</strong> angezeigt.</P>

      <Divider />
      <H2 id="team-berechtigungen">Berechtigungen</H2>
      <P>Berechtigungen werden über die Rolle gesteuert. Eine Änderung der Rolle eines Mitglieds ist jederzeit über <strong>Einstellungen → Team → Rolle ändern</strong> möglich (nur für Admins).</P>
      <InfoBox type="warning" title="Achtung">
        Es muss immer mindestens ein aktives Admin-Konto existieren. Die letzte Admin-Rolle kann nicht entfernt werden.
      </InfoBox>
    </div>
  )
}

function BrandingKapitel() {
  return (
    <div>
      <H2 id="brand-logo">Logo &amp; Favicon</H2>
      <P>Sidebar → <strong>Einstellungen → Branding</strong>. Logo (PNG mit transparentem Hintergrund, min. 400 px) wird auf Freigabe-Links, Onboarding, Portal und PDF-Exporten verwendet. Favicon ist optional separat.</P>

      <Divider />
      <H2 id="brand-farben">Farben anpassen</H2>
      <P>Sechs Farb-Slots: <strong>Primärfarbe</strong> (Buttons), <strong>Button-Textfarbe</strong>, <strong>Sekundärfarbe</strong>, <strong>Akzentfarbe</strong> (Hintergründe / Hervorhebungen), <strong>Hintergrundfarbe</strong>, <strong>Textfarbe</strong>. Klick auf Farbfeld öffnet Color-Picker, oder direkter Hex-Eingabe. Optionaler <strong>Akzent-Verlauf</strong> (Gradient) mit zwei Stop-Farben.</P>

      <Divider />
      <H2 id="brand-schrift">Schrift &amp; Layout-Stil</H2>
      <P>10 Google-Fonts wählbar (Inter, Syne, Poppins, Raleway, Lato, Montserrat, Playfair Display, Cormorant Garamond, DM Sans, Nunito). <strong>Layout-Stil</strong>: Kantig (6 px) / Weich (14 px, Standard) / Rundlich (20 px) — bestimmt die Ecken-Rundung im Portal global.</P>

      <Divider />
      <H2 id="brand-kontakt">Kontakt + Portal-Texte</H2>
      <P>Support-E-Mail, Footer-Text, Slogan, Welcome-Text, Instagram, Website, Adresse, Impressum-Text, Datenschutz-URL. Toggle &bdquo;Powered by Wellbeing Spaces&ldquo; im Footer. <strong>Custom CSS</strong> für Power-User mit eigenem CSS-Override.</P>

      <Divider />
      <H2 id="brand-vorschau">Live-Vorschau</H2>
      <P>Rechte Spalte ist <strong>sticky</strong> — bleibt beim Runterscrollen sichtbar. Zeigt einen kompletten Mini-Portal-Mockup: Header (Logo + Tab-Badge + User-Avatar), Hero (Hero-Bild ODER Gradient mit Welcome-Text + CTA), KPI-Karten, Produkt-Karte mit Freigeben/Ablehnen-Buttons, Farb-Pillen, Footer. Alle Branding-Werte werden live reflektiert.</P>
      <InfoBox type="tip" title="Hero-Bild">
        Optional ein Hero-Bild für den Portal-Hero hochladen (16:6, empfohlen 1600×600). Falls kein Bild gesetzt ist, wird der Akzent-Gradient verwendet.
      </InfoBox>
    </div>
  )
}

function EinstellungenKapitel() {
  return (
    <div>
      <H2 id="eins-allgemein">Anwendung &amp; MwSt</H2>
      <P>Sidebar → <strong>Einstellungen</strong>. Tab <strong>Workspace</strong>:</P>
      <Ul>
        <li><strong>App-Name</strong> — wird in Sidebar + Freigabe-Links angezeigt</li>
        <li><strong>Standardwährung</strong> — EUR / CHF / USD</li>
        <li><strong>MwSt-Satz %</strong> — global, gilt für alle Preisberechnungen</li>
        <li><strong>Firmen-Defaults</strong> für neue Verträge / Angebote (Adresse, Rechtsform, USt-IdNr., Bank-Details)</li>
      </Ul>

      <Divider />
      <H2 id="eins-profil">Profil &amp; Avatar</H2>
      <P>Tab <strong>Profil</strong>: Vor- + Nachname (in Team-Tab + Kommentaren sichtbar), E-Mail-Adresse, Avatar-Upload, Passwort ändern.</P>

      <Divider />
      <H2 id="eins-sicherheit">Aktive Sessions</H2>
      <P>Im Profil-Tab unter &bdquo;Sicherheit&ldquo; siehst du alle Geräte / Browser, mit denen dein Account aktuell eingeloggt ist:</P>
      <Ul>
        <li>Browser + OS aus User-Agent (z. B. &bdquo;Chrome auf macOS&ldquo;)</li>
        <li>Letzte Aktivität (relativ), Anmeldedatum, IP</li>
        <li>Aktuelle Sitzung mit grünem Rand markiert (kein Abmelden-Button — kannst dich nicht selbst rauswerfen)</li>
        <li>Pro fremder Session: roter <strong>Abmelden</strong>-Button mit Bestätigung</li>
        <li><strong>Alle anderen Geräte abmelden</strong> — invalidiert alle Sitzungen außer dieser</li>
      </Ul>

      <Divider />
      <H2 id="eins-team">Team &amp; Vorlagen</H2>
      <P>Tab <strong>Team</strong>: Mitgliederliste mit Rollen, Einladen via E-Mail, Rolle ändern. Tab <strong>Vorlagen</strong>: HTML-Vorlagen für Verträge / Angebote, mit Platzhalter-Hilfe.</P>
    </div>
  )
}

function ExportKapitel() {
  return (
    <div>
      <H2 id="exp-csv">CSV-Export</H2>
      <P>Der CSV-Export erzeugt eine tabellarische Datei aller Produkte eines Projekts – kompatibel mit Excel, Google Sheets und anderen Tabellenkalkulationsprogrammen.</P>
      <Ol>
        <li>Projekt öffnen</li>
        <li>Button <strong>CSV</strong> im Projekt-Header klicken</li>
        <li>Datei wird sofort heruntergeladen</li>
      </Ol>
      <P>Die CSV enthält: Raumname, Produktname, Partner, Status, EP netto, Marge %, VP netto, VP brutto, Provision.</P>
      <InfoBox type="info" title="Interne Felder im Export">
        Der CSV-Export ist nur für eingeloggte Mitglieder zugänglich und enthält alle internen Felder.
      </InfoBox>

      <Divider />
      <H2 id="exp-pdf">PDF-Export</H2>
      <P>Der PDF-Export erzeugt ein A4-Dokument mit Projektübersicht und Produkttabelle – geeignet für Angebote und Kundenpräsentationen.</P>
      <Ol>
        <li>Projekt öffnen</li>
        <li>Button <strong>PDF</strong> im Projekt-Header klicken</li>
        <li>Das PDF wird im Browser generiert und heruntergeladen</li>
      </Ol>
      <P>Das PDF enthält: Projektname, Datum, Produkttabelle je Raum, Gesamtsummen, Status-Farben und Seitennummerierung.</P>
      <InfoBox type="tip" title="Tipp">
        Für Kundenpräsentationen empfiehlt sich der PDF-Export. Für weitere Verarbeitung in Excel nutzen Sie CSV.
      </InfoBox>
    </div>
  )
}

function FaqKapitel() {
  return (
    <div>
      <H2 id="faq-fragen">Häufige Fragen</H2>

      <H3>Warum sehe ich auf dem Dashboard 0 laufende Projekte, obwohl ich eins habe?</H3>
      <P>Bis zu einem bestimmten Update zählte der Zähler nur Status &bdquo;Aktiv&ldquo; / &bdquo;In Bearbeitung&ldquo; — nicht aber &bdquo;Warten auf Kunde&ldquo;. Das ist behoben: jetzt zählen alle Projekte, die nicht &bdquo;Abgeschlossen&ldquo; oder archiviert sind.</P>

      <H3>Auto-Fill funktioniert auf einer Shop-Seite nicht — was tun?</H3>
      <P>Der klassische Scraper findet manchmal zu wenig (JavaScript-only-Seite, Cloudflare-Schutz, ungewöhnliches HTML). Lösungen in dieser Reihenfolge:</P>
      <Ol>
        <li>System eskaliert automatisch zu Claude Haiku, wenn weniger als 3 Felder gefunden werden</li>
        <li>Klick stattdessen auf <strong>Screenshot</strong>: lade einen Screenshot der Produktseite hoch — Claude Sonnet Vision liest die Daten aus</li>
        <li>Manuell ausfüllen wenn beides scheitert</li>
      </Ol>

      <H3>Warum erscheint die Vorschau im Branding-Editor nicht?</H3>
      <P>Sie ist standardmäßig sichtbar (sticky rechts) und scrollt mit. Falls sie ausgeblendet ist, gibt&apos;s rechts oben einen <strong>Eye-Toggle</strong>.</P>

      <H3>Ich habe meinen Hauptkontakt geändert — warum steht in alten PDFs noch der alte?</H3>
      <P>PDFs werden zur Erstell-Zeit generiert. Lade das PDF im Vertrag oder Angebot neu herunter, dann ist der aktuelle Hauptkontakt drin.</P>

      <H3>Kann ich aus einem Konfigurator-Ergebnis direkt ein Angebot erstellen?</H3>
      <P>Ja. Im Ergebnis-Modal des Konfigurators gibt&apos;s den Button &bdquo;Aus Auswahl Angebot erstellen&ldquo; — alle übernommenen Produkte landen als Positionen im neuen Angebot.</P>

      <H3>Wie funktioniert das Empfänger-Etikett bei Onboarding-Links?</H3>
      <P>Bei Neukunden-Onboardings hast du noch keinen Kunden-Datensatz. Beim Erstellen kannst du optional ein Etikett (z. B. &bdquo;Frau Müller (Instagram)&ldquo;) + E-Mail hinterlegen — das erscheint nur in deiner Übersicht, der Kunde sieht es nicht. Nachträglich bearbeitbar via Pencil-Button.</P>

      <Divider />
      <H2 id="faq-trouble">Troubleshooting</H2>

      <H3>Die Seite lädt nicht / zeigt einen Fehler</H3>
      <Ul>
        <li>Sitzung abgelaufen → erneut einloggen</li>
        <li>Browser-Cache veraltet → Hard-Reload mit <Kb keys={['CTRL', 'Shift', 'R']} /> oder <Kb keys={['CMD', 'Shift', 'R']} /></li>
        <li>VPN / Firewall blockiert Supabase Frankfurt → Verbindung prüfen</li>
      </Ul>

      <H3>Auto-Favicon zeigt das Logo nicht</H3>
      <P>Browser-Cache → Hard-Reload. Die Logo-URL ist <code>https://www.google.com/s2/favicons?domain=…&amp;sz=128</code> — Google muss die Domain erkennen können (manche Custom-Domains haben kein Favicon).</P>

      <H3>Aktive Session lässt sich nicht beenden</H3>
      <P>Migration <code>088_meine_sessions.sql</code> muss in Supabase ausgeführt sein. Sie legt die RPC-Funktionen <code>get_meine_sessions</code> + <code>session_beenden</code> als SECURITY DEFINER an.</P>

      <H3>Anthropic-API-Calls funktionieren nicht</H3>
      <P><code>ANTHROPIC_API_KEY</code> in Vercel Env-Vars + lokal in <code>.env.local</code> setzen. Ohne Key fällt das System still auf den klassischen Scraper zurück; Screenshot-Endpoint zeigt eine klare Fehlermeldung.</P>

      <InfoBox type="tip" title="Support">
        Bei Problemen, die sich nicht selbst lösen lassen, schreib im Chat oder Issue-Tracker mit Schritten + Browser + Screenshot.
      </InfoBox>
    </div>
  )
}

// ── Suche ─────────────────────────────────────────────────────

function sucheTreffer(query: string): Suchtreffer[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const treffer: Suchtreffer[] = []
  for (const kap of KAPITEL) {
    for (const abs of kap.abschnitte) {
      const inTitel = abs.titel.toLowerCase().includes(q)
      const inText  = abs.suchtext.toLowerCase().includes(q)
      if (inTitel || inText) {
        const words = query.trim().split(/\s+/)
        const snippet = abs.suchtext
          .split(' ')
          .filter((w) => words.some((qw) => w.toLowerCase().includes(qw.toLowerCase())))
          .slice(0, 6)
          .join(' ')
        treffer.push({
          kapitelId:     kap.id,
          kapitelTitel:  kap.titel,
          abschnittId:   abs.id,
          abschnittTitel: abs.titel,
          snippet: snippet || abs.suchtext.split(' ').slice(0, 6).join(' '),
        })
      }
    }
  }
  return treffer.slice(0, 8)
}

// ── Haupt-Komponente ───────────────────────────────────────────

export default function HandbuchClient() {
  const [aktivesKapitel, setAktivesKapitel]     = useState(KAPITEL[0].id)
  const [aufgeklappt,    setAufgeklappt]         = useState<Set<string>>(new Set([KAPITEL[0].id]))
  const [suchQuery,      setSuchQuery]            = useState('')
  const [suchOffen,      setSuchOffen]            = useState(false)
  const [suchFokus,      setSuchFokus]            = useState(0)
  const [aktiverAbschnitt, setAktiverAbschnitt]  = useState('')
  const suchRef  = useRef<HTMLInputElement>(null)
  const hauptRef = useRef<HTMLDivElement>(null)

  const treffer = useMemo(() => sucheTreffer(suchQuery), [suchQuery])

  // CMD+K Shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSuchOffen(true)
        setTimeout(() => suchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSuchOffen(false)
        setSuchQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Tastatur-Navigation in der Suche
  const handleSuchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSuchFokus((f) => Math.min(f + 1, treffer.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSuchFokus((f) => Math.max(f - 1, 0)) }
    if (e.key === 'Enter' && treffer[suchFokus]) {
      navigiereZu(treffer[suchFokus].kapitelId, treffer[suchFokus].abschnittId)
    }
  }, [treffer, suchFokus])

  // IntersectionObserver für rechte Sidebar
  useEffect(() => {
    const kapitel = KAPITEL.find((k) => k.id === aktivesKapitel)
    if (!kapitel) return
    const ids = kapitel.abschnitte.map((a) => a.id)
    const obs = new IntersectionObserver(
      (entries) => {
        const sichtbar = entries.filter((e) => e.isIntersecting)
        if (sichtbar.length > 0) setAktiverAbschnitt(sichtbar[0].target.id)
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [aktivesKapitel])

  function navigiereZu(kapitelId: string, abschnittId: string) {
    setAktivesKapitel(kapitelId)
    setAufgeklappt((prev) => new Set(Array.from(prev).concat(kapitelId)))
    setSuchOffen(false)
    setSuchQuery('')
    setTimeout(() => {
      const el = document.getElementById(abschnittId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function toggleKapitel(id: string) {
    setAufgeklappt((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function kapitelWaehlen(id: string) {
    setAktivesKapitel(id)
    setAufgeklappt((prev) => new Set(Array.from(prev).concat(id)))
    hauptRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setAktiverAbschnitt('')
  }

  const aktuellesKapitel = KAPITEL.find((k) => k.id === aktivesKapitel)!

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Suchleiste ──────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-6 py-3 bg-white shrink-0">
        <div className="relative max-w-xl">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus-within:ring-2 focus-within:ring-wellbeing-green/20 focus-within:border-wellbeing-green transition-all">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={suchRef}
              value={suchQuery}
              onChange={(e) => { setSuchQuery(e.target.value); setSuchOffen(true); setSuchFokus(0) }}
              onFocus={() => setSuchOffen(true)}
              onKeyDown={handleSuchKeyDown}
              placeholder="Handbuch durchsuchen…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
            />
            {suchQuery ? (
              <button onClick={() => { setSuchQuery(''); setSuchOffen(false) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:flex items-center gap-0.5 text-gray-400">
                <kbd className="text-[10px] px-1 py-0.5 bg-gray-200 rounded border border-gray-300 font-mono">⌘</kbd>
                <kbd className="text-[10px] px-1 py-0.5 bg-gray-200 rounded border border-gray-300 font-mono">K</kbd>
              </span>
            )}
          </div>

          {/* Suchergebnisse */}
          {suchOffen && suchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {treffer.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  Keine Ergebnisse für &bdquo;{suchQuery}&ldquo;
                </div>
              ) : (
                <ul>
                  {treffer.map((t, i) => (
                    <li key={t.abschnittId}>
                      <button
                        onClick={() => navigiereZu(t.kapitelId, t.abschnittId)}
                        className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors ${
                          i === suchFokus ? 'bg-wellbeing-green/8 text-wellbeing-green-dark' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{t.kapitelTitel}</span>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                          <span className="text-xs font-medium text-gray-700">{t.abschnittTitel}</span>
                        </div>
                        {t.snippet && (
                          <p className="text-xs text-gray-400 truncate">{t.snippet}…</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 3-Spalten-Layout ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Linke Sidebar */}
        <aside className="w-60 xl:w-64 shrink-0 border-r border-gray-100 bg-gray-50/50 overflow-y-auto py-5">
          <nav className="space-y-0.5 px-2">
            {KAPITEL.map((kap) => {
              const istAktiv   = aktivesKapitel === kap.id
              const istOffen   = aufgeklappt.has(kap.id)
              return (
                <div key={kap.id}>
                  <button
                    onClick={() => { kapitelWaehlen(kap.id); toggleKapitel(kap.id) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                      istAktiv
                        ? 'bg-wellbeing-green text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={istAktiv ? 'text-white' : 'text-gray-400'}>{kap.icon}</span>
                    <span className="flex-1">{kap.titel}</span>
                    {istAktiv
                      ? <ChevronDown className="w-3 h-3 text-white/70 shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                    }
                  </button>

                  {/* Unterkapitel */}
                  {istOffen && istAktiv && (
                    <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l border-gray-200 pl-3">
                      {kap.abschnitte.map((abs) => (
                        <button
                          key={abs.id}
                          onClick={() => {
                            const el = document.getElementById(abs.id)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className={`w-full text-left text-xs py-1.5 px-2 rounded transition-colors ${
                            aktiverAbschnitt === abs.id
                              ? 'text-wellbeing-green font-medium'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          {abs.titel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Hauptbereich */}
        <main ref={hauptRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-8 lg:px-12 xl:px-16 py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
              <span>Handbuch</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600 font-medium">{aktuellesKapitel.titel}</span>
            </div>

            {/* Kapitel-Titel */}
            <div className="flex items-center gap-3.5 mb-8 pb-5 border-b border-gray-100">
              <div className="w-11 h-11 rounded-2xl bg-wellbeing-green/10 flex items-center justify-center text-wellbeing-green">
                {aktuellesKapitel.icon}
              </div>
              <h1 className="text-[28px] xl:text-3xl font-bold text-gray-900 leading-tight">{aktuellesKapitel.titel}</h1>
            </div>

            {/* Inhalt */}
            <KapitelInhalt kapitelId={aktivesKapitel} />

            {/* Nächste/Vorherige Navigation */}
            <div className="flex justify-between mt-12 pt-6 border-t border-gray-100">
              {(() => {
                const idx = KAPITEL.findIndex((k) => k.id === aktivesKapitel)
                const prev = KAPITEL[idx - 1]
                const next = KAPITEL[idx + 1]
                return (
                  <>
                    <div>
                      {prev && (
                        <button
                          onClick={() => kapitelWaehlen(prev.id)}
                          className="group flex items-center gap-2 text-sm text-gray-500 hover:text-wellbeing-green transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Zurück</p>
                            <p className="font-medium group-hover:text-wellbeing-green">{prev.titel}</p>
                          </div>
                        </button>
                      )}
                    </div>
                    <div>
                      {next && (
                        <button
                          onClick={() => kapitelWaehlen(next.id)}
                          className="group flex items-center gap-2 text-sm text-gray-500 hover:text-wellbeing-green transition-colors"
                        >
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Weiter</p>
                            <p className="font-medium group-hover:text-wellbeing-green">{next.titel}</p>
                          </div>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </main>

        {/* Rechte Sidebar – "Auf dieser Seite" */}
        <aside className="hidden xl:block w-56 2xl:w-64 shrink-0 border-l border-gray-100 overflow-y-auto py-8 px-5 sticky top-0 self-start">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Auf dieser Seite</p>
          <nav className="space-y-1">
            {aktuellesKapitel.abschnitte.map((abs) => (
              <button
                key={abs.id}
                onClick={() => {
                  const el = document.getElementById(abs.id)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`w-full text-left text-xs py-1 px-2 rounded transition-colors leading-snug ${
                  aktiverAbschnitt === abs.id
                    ? 'text-wellbeing-green font-medium bg-wellbeing-green/5'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {abs.titel}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Shortcuts</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3 h-3 text-gray-300 shrink-0" />
                <span className="text-[11px] text-gray-400">Suche</span>
                <span className="ml-auto flex gap-0.5">
                  <kbd className="text-[9px] px-1 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-500">⌘</kbd>
                  <kbd className="text-[9px] px-1 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-500">K</kbd>
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
