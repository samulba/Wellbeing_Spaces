/**
 * Wiederverwendbare Mail-Templates für Kunden-Flows.
 *
 * Jede Funktion liefert { subject, html } — der Aufrufer verwendet sendMail()
 * aus @/lib/mail. Branding (firmenname + primary_color) kann optional
 * übergeben werden; Fallbacks sind Wellbeing-Spaces-Defaults.
 *
 * Design-Prinzipien:
 *  - Inline-CSS (keine externen Styles, damit GMail/Outlook nicht filtert)
 *  - max-width 520px, zentriert, weißes Card auf cream-Hintergrund
 *  - primary_color für CTA-Button
 *  - Fallback-Link als klartext unterhalb des Buttons
 */

export interface MailBranding {
  firmenname?:    string | null
  primary_color?: string | null
}

export interface MailTemplateResult {
  subject: string
  html:    string
}

const DEFAULT_FIRMA = 'Wellbeing Spaces'
const DEFAULT_PRIMARY = '#445c49'
const DEFAULT_BG = '#f6ede2'

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;': '&#39;'
  ))
}

function layout(opts: {
  firmenname:    string
  primary_color: string
  anrede:        string
  bodyHtml:      string
  ctaLabel:      string
  ctaUrl:        string
  gueltigText?:  string
}): string {
  const { firmenname, primary_color, anrede, bodyHtml, ctaLabel, ctaUrl, gueltigText } = opts
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${DEFAULT_BG}; margin: 0; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">
    <h1 style="font-size: 20px; color: #2d3e31; margin: 0 0 16px;">${escapeHtml(anrede)}</h1>
    ${bodyHtml}
    <p style="text-align: center; margin: 24px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: ${primary_color}; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px;">
        ${escapeHtml(ctaLabel)} →
      </a>
    </p>
    ${gueltigText ? `<p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0 0 8px;">${escapeHtml(gueltigText)}</p>` : ''}
    <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; word-break: break-all; margin: 0;">
      ${escapeHtml(ctaUrl)}
    </p>
  </div>
  <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 20px;">
    ${escapeHtml(firmenname)}
  </p>
</body></html>`.trim()
}


/** Angebot wurde dem Kunden zugestellt. */
export function angebotVersandMail(opts: {
  empfaengerName: string
  angebotsNummer: string
  projektName:    string | null
  linkUrl:        string
  branding?:      MailBranding
}): MailTemplateResult {
  const firmenname    = opts.branding?.firmenname    ?? DEFAULT_FIRMA
  const primary_color = opts.branding?.primary_color ?? DEFAULT_PRIMARY

  const body = `
    <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
      wir haben dir ein neues Angebot erstellt${opts.projektName ? ` für <strong>${escapeHtml(opts.projektName)}</strong>` : ''}.
      Du kannst es online einsehen und herunterladen.
    </p>
    <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">
      Angebotsnummer: <strong>${escapeHtml(opts.angebotsNummer)}</strong>
    </p>`.trim()

  return {
    subject: `Angebot ${opts.angebotsNummer} von ${firmenname}`,
    html: layout({
      firmenname,
      primary_color,
      anrede:   `Hallo ${opts.empfaengerName},`,
      bodyHtml: body,
      ctaLabel: 'Angebot ansehen',
      ctaUrl:   opts.linkUrl,
    }),
  }
}


/** Vertrag wartet auf Kunden-Unterschrift. */
export function vertragSignaturMail(opts: {
  empfaengerName: string
  vertragTitel:   string
  linkUrl:        string
  gueltigBis?:    string | null
  branding?:      MailBranding
}): MailTemplateResult {
  const firmenname    = opts.branding?.firmenname    ?? DEFAULT_FIRMA
  const primary_color = opts.branding?.primary_color ?? DEFAULT_PRIMARY

  const body = `
    <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
      dein Vertrag <strong>${escapeHtml(opts.vertragTitel)}</strong> ist bereit zur Unterschrift.
      Bitte prüfe den Inhalt und unterschreibe direkt online.
    </p>`.trim()

  const gueltigText = opts.gueltigBis
    ? `Der Signatur-Link ist gültig bis ${new Date(opts.gueltigBis).toLocaleDateString('de-DE')}. Falls der Button nicht funktioniert, kopiere diese Adresse in deinen Browser:`
    : 'Falls der Button nicht funktioniert, kopiere diese Adresse in deinen Browser:'

  return {
    subject: `Vertrag zur Unterschrift: ${opts.vertragTitel}`,
    html: layout({
      firmenname,
      primary_color,
      anrede:   `Hallo ${opts.empfaengerName},`,
      bodyHtml: body,
      ctaLabel: 'Jetzt unterschreiben',
      ctaUrl:   opts.linkUrl,
      gueltigText,
    }),
  }
}


/** Produktfreigabe-Link für den Kunden. */
export function freigabeLinkMail(opts: {
  empfaengerName: string
  projektName:    string
  linkUrl:        string
  gueltigBis?:    string | null
  branding?:      MailBranding
}): MailTemplateResult {
  const firmenname    = opts.branding?.firmenname    ?? DEFAULT_FIRMA
  const primary_color = opts.branding?.primary_color ?? DEFAULT_PRIMARY

  const body = `
    <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
      die Produktauswahl für <strong>${escapeHtml(opts.projektName)}</strong> ist bereit zur Freigabe.
      Du kannst jedes Produkt einzeln bestätigen, kommentieren oder Anpassungen wünschen.
    </p>`.trim()

  const gueltigText = opts.gueltigBis
    ? `Der Freigabe-Link ist gültig bis ${new Date(opts.gueltigBis).toLocaleDateString('de-DE')}.`
    : undefined

  return {
    subject: `Produktfreigabe für ${opts.projektName}`,
    html: layout({
      firmenname,
      primary_color,
      anrede:   `Hallo ${opts.empfaengerName},`,
      bodyHtml: body,
      ctaLabel: 'Freigabe öffnen',
      ctaUrl:   opts.linkUrl,
      gueltigText,
    }),
  }
}


/** Freigabe wurde vom Kunden abgeschlossen (Admin-Benachrichtigung). */
export function freigabeAbgeschlossenMail(opts: {
  empfaengerName:    string   // Admin-Name
  kundenName:        string   // Name aus Abschluss-Modal
  projektName:       string
  scopeBeschreibung: string   // "Gesamtes Projekt" | "Raum X" | "3 ausgewählte Produkte"
  freigegebenCount:  number
  abgelehntCount:    number
  kommentar:         string | null
  linkUrl:           string   // Link zur Projekt-Detailseite
  branding?:         MailBranding
}): MailTemplateResult {
  const firmenname    = opts.branding?.firmenname    ?? DEFAULT_FIRMA
  const primary_color = opts.branding?.primary_color ?? DEFAULT_PRIMARY

  const statsZeile = `<strong>${opts.freigegebenCount}</strong> freigegeben, <strong>${opts.abgelehntCount}</strong> abgelehnt`
  const kommentarBlock = opts.kommentar
    ? `<div style="background: #f6ede2; border-left: 3px solid ${primary_color}; padding: 12px 16px; margin: 18px 0; border-radius: 6px;">
         <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Kommentar</p>
         <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">${escapeHtml(opts.kommentar)}</p>
       </div>`
    : ''

  const body = `
    <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
      <strong>${escapeHtml(opts.kundenName)}</strong> hat die Produktfreigabe für
      <strong>${escapeHtml(opts.projektName)}</strong> (${escapeHtml(opts.scopeBeschreibung)}) abgeschlossen.
    </p>
    <p style="font-size: 14px; color: #4b5563; margin: 0 0 6px;">
      Ergebnis: ${statsZeile}
    </p>
    ${kommentarBlock}`.trim()

  return {
    subject: `Freigabe abgeschlossen: ${opts.projektName}`,
    html: layout({
      firmenname,
      primary_color,
      anrede:   `Hallo ${opts.empfaengerName},`,
      bodyHtml: body,
      ctaLabel: 'Freigabe ansehen',
      ctaUrl:   opts.linkUrl,
    }),
  }
}


/** Onboarding-Link für neue Kunden. */
export function onboardingLinkMail(opts: {
  empfaengerName: string
  linkUrl:        string
  einleitung?:    string | null
  branding?:      MailBranding
}): MailTemplateResult {
  const firmenname    = opts.branding?.firmenname    ?? DEFAULT_FIRMA
  const primary_color = opts.branding?.primary_color ?? DEFAULT_PRIMARY

  const einleitung = opts.einleitung?.trim() ||
    `herzlich willkommen. Damit wir dein Projekt optimal planen können, haben wir einen kurzen Fragebogen für dich vorbereitet.`

  const body = `
    <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
      ${escapeHtml(einleitung)}
    </p>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
      Er dauert nur wenige Minuten und hilft uns, gezielt auf deine Wünsche einzugehen.
    </p>`.trim()

  return {
    subject: `Dein Onboarding bei ${firmenname}`,
    html: layout({
      firmenname,
      primary_color,
      anrede:   `Hallo ${opts.empfaengerName},`,
      bodyHtml: body,
      ctaLabel: 'Fragebogen starten',
      ctaUrl:   opts.linkUrl,
    }),
  }
}
