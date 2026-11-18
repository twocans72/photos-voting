'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode, FormEvent } from 'react'
import Link from 'next/link'
import { useLang } from './LanguageContext'

export interface SessionUser {
  email: string
  lang: 'de' | 'en'
  notify: boolean
}

interface SessionContextType {
  user: SessionUser | null
  ready: boolean
  refresh: () => Promise<SessionUser | null>
  setUser: (user: SessionUser | null) => void
  openLogin: (reason?: 'fav') => void
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  ready: false,
  refresh: async () => null,
  setUser: () => {},
  openLogin: () => {},
  logout: async () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const { setLang } = useLang()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const [login, setLogin] = useState<null | { reason?: 'fav' }>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await res.json()
      setUser(data.user)
      return data.user as SessionUser | null
    } catch {
      return null
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh().then((u) => {
      if (u) setLang(u.lang)
    })
  }, [refresh, setLang])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  const openLogin = useCallback((reason?: 'fav') => setLogin({ reason }), [])

  return (
    <SessionContext.Provider value={{ user, ready, refresh, setUser, openLogin, logout }}>
      {children}
      {login && <LoginDialog reason={login.reason} onClose={() => setLogin(null)} />}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

function LoginDialog({ reason, onClose }: { reason?: 'fav'; onClose: () => void }) {
  const { t, lang } = useLang()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setState('sending')
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang, next: window.location.pathname + window.location.search }),
      })
      if (res.ok) {
        setState('sent')
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data.error === 'invalid_email' ? t.invalidEmail : data.error === 'too_many' ? t.tooMany : data.error === 'mail_failed' ? t.mailFailed : t.errorGeneric)
    } catch {
      setError(t.errorGeneric)
    }
    setState('idle')
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="login-title" className="display" style={{ fontSize: 28, lineHeight: 1.1, margin: '0 0 12px' }}>
          {t.loginTitle}
        </h2>
        {state === 'sent' ? (
          <>
            <p style={{ margin: '0 0 8px' }}>{t.linkSent(email)}</p>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14 }}>{t.linkSentHint}</p>
            <button className="pill pill-light" onClick={onClose}>
              {t.close}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p style={{ margin: '0 0 16px', color: '#d5dbe6' }}>{reason === 'fav' ? t.loginFavText : t.loginText}</p>
            <label htmlFor="login-email" className="sr-only">
              {t.emailPlaceholder}
            </label>
            <input
              id="login-email"
              className="field"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p role="alert" style={{ margin: '10px 0 0', color: '#ff9c9c', fontSize: 14 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="pill pill-solid" type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? t.sending : t.sendLink}
              </button>
              <button className="pill" type="button" onClick={onClose}>
                {t.close}
              </button>
            </div>
            <p style={{ margin: '18px 0 0', color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
              {t.loginPerks} {t.privacyNote}{' '}
              <Link href="/datenschutz" onClick={onClose} style={{ color: 'var(--muted)' }}>
                {t.privacy}
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
