'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'
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
/** Vier Pfeile: die Schnellbewertung, in der jede Richtung eine Stufe ist. */
export const IconArrows = ({ size = 20 }: { size?: number }) => <Stroke size={size} d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
export const IconFilter = ({ size = 20 }: { size?: number }) => <Stroke size={size} d="M4 5h16l-6 7.5V18l-4 2v-7.5z" />
export const IconUser = ({ size = 20 }: { size?: number }) => <Stroke size={size} d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />
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

/**
 * Fixe Leiste aller öffentlichen Seiten: Logo, Werkzeuge der Seite (`children`), Sprache, Konto.
 * `title` erscheint klein in der Leiste, sobald der grosse Seitentitel weggescrollt ist.
 */
export function SiteHeader({ title, children, hideFavLink }: { title?: string; children?: ReactNode; hideFavLink?: boolean }) {
  const { t } = useLang()
  const { user, ready, openLogin } = useSession()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 70)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <>
      <header className={`topbar${scrolled ? ' scrolled' : ''}${children ? ' has-tools' : ''}`}>
        <Link href="/" className="brand" aria-label={`Peduzzi Photos – ${t.allAlbums}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-full" src="/logo.png" alt="Peduzzi Photos" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-mark" src="/logo-mark.png" alt="Peduzzi Photos" />
        </Link>
        {title && <span className="display bar-title">{title}</span>}
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
              <Link className="pill acct" href="/konto" aria-label={t.account}>
                <IconUser size={18} />
                <span className="txt">{t.account}</span>
              </Link>
            ) : (
              <button className="pill pill-solid acct" onClick={() => openLogin()} aria-label={t.signIn}>
                <IconUser size={18} />
                <span className="txt">{t.signIn}</span>
              </button>
            ))}
        </nav>
      </header>
      <div className="topbar-space" />
    </>
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
