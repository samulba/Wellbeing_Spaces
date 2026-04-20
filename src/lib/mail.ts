/**
 * Minimaler Mail-Helper via Resend.
 *
 * ENV-Variablen (in Vercel setzen):
 *   RESEND_API_KEY   – API-Key aus resend.com
 *   RESEND_FROM      – Absender-Adresse, z.B. "Wellbeing Spaces <noreply@wellbeing-spaces.de>"
 *
 * Wenn RESEND_API_KEY fehlt, wird KEINE Mail verschickt — die Funktion returnt
 * stattdessen { sent: false } und der Link muss manuell kopiert/geteilt werden.
 * Log-Output erscheint in den Vercel-Runtime-Logs.
 */

export type SendMailInput = {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export type SendMailResult =
  | { sent: true }
  | { sent: false; reason: 'no-api-key' | 'http-error'; detail?: string }

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM ?? 'Wellbeing Spaces <noreply@wellbeing-spaces.de>'

  if (!apiKey) {
    console.warn('[mail] RESEND_API_KEY fehlt — Mail wird NICHT verschickt. Betreff:', input.subject)
    return { sent: false, reason: 'no-api-key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from,
        to:      [input.to],
        subject: input.subject,
        html:    input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[mail] Resend HTTP-Error:', res.status, detail)
      return { sent: false, reason: 'http-error', detail: `${res.status}` }
    }

    return { sent: true }
  } catch (e) {
    console.error('[mail] Unerwarteter Fehler:', e)
    return { sent: false, reason: 'http-error', detail: String(e) }
  }
}
