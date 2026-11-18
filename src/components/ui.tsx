'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { useLang } from '@/lib/LanguageContext'
import { useSession } from '@/lib/SessionContext'

const HEART = 'M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z'

/** Favoriten-Herz: rot, wenn gewählt, sonst grau. */
export function Heart({ on, size = 24 }: { on: boolean; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={on ? 'var(--heart)' : 'var(--heart-off)'}>
      <path d={HEART} />
    </svg>
  )
}

function Stroke({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export const IconExpand = ({ size = 18 }: { size?: number }) => <Stroke size={size} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
export const IconPrev = () => <Stroke d="M15 5l-7 7 7 7" />
export const IconNext = () => <Stroke d="M9 5l7 7-7 7" />
export const IconClose = ({ size = 20 }: { size?: number }) => <Stroke size={size} d="M5 5l14 14M19 5L5 19" />

export function LangToggle() {
  const { lang, setLang } = useLang()
  const { user, setUser } = useSession()
  const pick = (next: 'de' | 'en') => {
    setLang(next)
    if (user && user.lang !== next) {
      fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: next }) })
        .then((r) => r.json())
        .then((d) => d.user && setUser(d.user))
        .catch(() => {})
    }
  }
  return (
    <span className="lang" role="group" aria-label="Sprache / Language">
      <button aria-pressed={lang === 'de'} onClick={() => pick('de')}>
        DE
      </button>
      <span style={{ color: 'var(--muted)' }}> / </span>
      <button aria-pressed={lang === 'en'} onClick={() => pick('en')}>
        EN
      </button>
    </span>
  )
}

/** Kopfzeile aller öffentlichen Seiten. `left` ersetzt das Logo (Albumseite). */
export function SiteHeader({ left, children, hideFavLink }: { left?: ReactNode; children?: ReactNode; hideFavLink?: boolean }) {
  const { t } = useLang()
  const { user, ready, openLogin } = useSession()
  return (
    <header className="site-header">
      {left || (
        <Link href="/" aria-label="Peduzzi Photos" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Peduzzi Photos" style={{ height: 34, width: 'auto', display: 'block' }} />
        </Link>
      )}
      <nav className="site-nav">
        {children}
        {!hideFavLink && (
          <Link className="link" href="/favoriten">
            {t.favorites}
          </Link>
        )}
        <LangToggle />
        {ready &&
          (user ? (
            <Link className="pill" href="/konto">
              {t.account}
            </Link>
          ) : (
            <button className="pill pill-solid" onClick={() => openLogin()}>
              {t.signIn}
            </button>
          ))}
      </nav>
    </header>
  )
}

export function SiteFooter() {
  const { t } = useLang()
  return (
    <footer className="footer">
      <Link href="/datenschutz">{t.privacy}</Link>
    </footer>
  )
}
