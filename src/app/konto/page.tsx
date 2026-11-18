'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { useSession } from '@/lib/SessionContext'
import { SiteFooter, SiteHeader } from '@/components/ui'

export default function AccountPage() {
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const { user, ready, setUser, openLogin, logout } = useSession()

  const patch = async (body: { lang?: 'de' | 'en'; notify?: boolean }) => {
    const r = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) setUser((await r.json()).user)
  }

  const remove = async () => {
    if (!confirm(t.deleteConfirm)) return
    const r = await fetch('/api/account', { method: 'DELETE' })
    if (r.ok) {
      setUser(null)
      router.push('/')
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <h1 className="display">{t.accountTitle}</h1>
        {!ready ? (
          <p>{t.loading}</p>
        ) : !user ? (
          <>
            <p>{t.notSignedIn}</p>
            <p style={{ marginTop: 18 }}>
              <button className="pill pill-solid" onClick={() => openLogin()}>
                {t.signIn}
              </button>
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 18, color: 'var(--ink)' }}>{user.email}</p>

            <div className="row">
              <div>{t.language}</div>
              <span className="seg" role="group">
                {(['de', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    aria-pressed={lang === l}
                    onClick={() => {
                      setLang(l)
                      patch({ lang: l })
                    }}
                  >
                    {l === 'de' ? 'Deutsch' : 'English'}
                  </button>
                ))}
              </span>
            </div>

            <div className="row">
              <div>
                <div>{t.notifyLabel}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.notifyHelp}</div>
              </div>
              <span className="seg" role="group">
                <button aria-pressed={user.notify} onClick={() => patch({ notify: true })}>
                  {t.on}
                </button>
                <button aria-pressed={!user.notify} onClick={() => patch({ notify: false })}>
                  {t.off}
                </button>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
              <Link className="pill" href="/favoriten">
                {t.favoritesTitle}
              </Link>
              <button
                className="pill"
                onClick={async () => {
                  await logout()
                  router.push('/')
                }}
              >
                {t.signOut}
              </button>
            </div>

            <h2>{t.deleteAccount}</h2>
            <p style={{ fontSize: 14 }}>{t.deleteHelp}</p>
            <p style={{ marginTop: 12 }}>
              <button className="pill" style={{ borderColor: '#ff9c9c', color: '#ff9c9c' }} onClick={remove}>
                {t.deleteAccount}
              </button>
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
