import nodemailer from 'nodemailer'
import { baseUrl } from './users'

type Lang = 'de' | 'en'

export function mailConfigured(): boolean {
  return !!process.env.SMTP_HOST
}

let transport: nodemailer.Transporter | null = null
function getTransport(): nodemailer.Transporter {
  if (!transport) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  }
  return transport
}

interface Mail {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

/** Verschickt eine Mail. Ohne SMTP-Konfiguration wird sie nur geloggt (lokale Entwicklung). */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    console.log(`[mail] SMTP nicht konfiguriert. An ${mail.to}: ${mail.subject}\n${mail.text}`)
    return false
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost'
  try {
    await getTransport().sendMail({ from: `Peduzzi Photos <${from}>`, ...mail })
    return true
  } catch (err) {
    console.error('[mail] Versand fehlgeschlagen:', err)
    return false
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function shell(body: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f1f7;font-family:Helvetica,Arial,sans-serif;color:#211a33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1f7;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#211a33;padding:22px 28px;color:#edf2f7;font-size:20px;font-weight:bold">Peduzzi Photos</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e6e2ee;font-size:12px;line-height:1.5;color:#6b6480">${footer}</td></tr>
</table></td></tr></table></body></html>`
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#358de5;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:24px">${esc(label)}</a>`
}

export function loginMail(lang: Lang, link: string): Omit<Mail, 'to'> {
  const de = lang === 'de'
  const subject = de ? 'Dein Anmelde-Link für Peduzzi Photos' : 'Your sign-in link for Peduzzi Photos'
  const intro = de
    ? 'Mit diesem Link meldest du dich an. Er gilt 30 Minuten und funktioniert einmal.'
    : 'Use this link to sign in. It is valid for 30 minutes and works once.'
  const label = de ? 'Jetzt anmelden' : 'Sign in now'
  const note = de
    ? 'Du hast das nicht angefordert? Dann ignoriere diese Mail, es passiert nichts.'
    : "Didn't request this? Just ignore this email, nothing will happen."
  return {
    subject,
    text: `${intro}\n\n${link}\n\n${note}`,
    html: shell(`<p style="margin:0 0 22px">${intro}</p><p style="margin:0 0 22px">${button(link, label)}</p><p style="margin:0;font-size:13px;color:#6b6480">${note}</p>`, 'photos.peduzzi.gr'),
  }
}

export interface DigestItem {
  albumId: number
  title: string
  coverAssetId: string | null
  isNewAlbum: boolean
  count: number
}

export function digestMail(lang: Lang, items: DigestItem[], unsubToken: string): Omit<Mail, 'to'> {
  const de = lang === 'de'
  const base = baseUrl()
  const unsub = `${base}/api/unsubscribe?t=${unsubToken}`
  const account = `${base}/konto`
  const newAlbums = items.filter((i) => i.isNewAlbum)
  const subject =
    newAlbums.length === 1
      ? de
        ? `Neues Album: ${newAlbums[0].title}`
        : `New album: ${newAlbums[0].title}`
      : newAlbums.length > 1
        ? de
          ? `${newAlbums.length} neue Alben auf Peduzzi Photos`
          : `${newAlbums.length} new albums on Peduzzi Photos`
        : de
          ? 'Neue Fotos auf Peduzzi Photos'
          : 'New photos on Peduzzi Photos'

  const line = (i: DigestItem) =>
    i.isNewAlbum
      ? de
        ? `Neues Album mit ${i.count} Fotos`
        : `New album with ${i.count} photos`
      : de
        ? `${i.count} neue ${i.count === 1 ? 'Foto' : 'Fotos'}`
        : `${i.count} new ${i.count === 1 ? 'photo' : 'photos'}`

  const blocks = items
    .map((i) => {
      const url = `${base}/album/${i.albumId}`
      const img = i.coverAssetId
        ? `<a href="${url}"><img src="${base}/api/proxy/thumbnail/${i.coverAssetId}?size=preview" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;border-radius:10px;margin:0 0 12px"></a>`
        : ''
      return `<div style="margin:0 0 28px">${img}<div style="font-size:20px;font-weight:bold;margin:0 0 4px">${esc(i.title)}</div><div style="color:#6b6480;margin:0 0 14px">${line(i)}</div>${button(url, de ? 'Ansehen und bewerten' : 'View and rate')}</div>`
    })
    .join('')

  const intro = de ? 'Es gibt Neues zu sehen:' : "There's something new to see:"
  const footer = de
    ? `Du bekommst diese Mail, weil du auf photos.peduzzi.gr ein Konto hast. <a href="${unsub}" style="color:#6b6480">Benachrichtigungen abbestellen</a> · <a href="${account}" style="color:#6b6480">Konto</a>`
    : `You receive this email because you have an account on photos.peduzzi.gr. <a href="${unsub}" style="color:#6b6480">Unsubscribe</a> · <a href="${account}" style="color:#6b6480">Account</a>`

  const text =
    `${intro}\n\n` +
    items.map((i) => `${i.title} – ${line(i)}\n${base}/album/${i.albumId}`).join('\n\n') +
    `\n\n${de ? 'Abbestellen' : 'Unsubscribe'}: ${unsub}`

  return {
    subject,
    text,
    html: shell(`<p style="margin:0 0 22px">${intro}</p>${blocks}`, footer),
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}
