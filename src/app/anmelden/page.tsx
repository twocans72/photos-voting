'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useSession } from '@/lib/SessionContext'
import { SiteHeader } from '@/components/ui'

/** Ziel des Links aus der Anmelde-Mail: löst das Einmal-Token ein und leitet weiter. */
export default function SignInPage() {
  const router = useRouter()
  const { t, setLang } = useLang()
  const { refresh, openLogin } = useSession()
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const token = new URLSearchParams(window.location.search).get('token') || ''
    fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (r) => {
        if (!r.ok) throw new Error('expired')
        const data = await r.json()
        if (data.lang === 'de' || data.lang === 'en') setLang(data.lang)
        await refresh()
        router.replace(typeof data.next === 'string' && data.next.startsWith('/') ? data.next : '/')
      })
      .catch(() => setFailed(true))
  }, [refresh, router, setLang])

  return (
    <>
      <SiteHeader />
      <main className="page">
        {failed ? (
          <>
            <h1 className="display">{t.signIn}</h1>
            <p>{t.linkExpired}</p>
            <p style={{ marginTop: 18 }}>
              <button className="pill pill-solid" onClick={() => openLogin()}>
                {t.requestNew}
              </button>
            </p>
          </>
        ) : (
          <p role="status">{t.signingIn}</p>
        )}
      </main>
    </>
  )
}
