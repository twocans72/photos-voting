'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { SiteHeader } from '@/components/ui'

export default function UnsubscribedPage() {
  const { t } = useLang()
  return (
    <>
      <SiteHeader />
      <main className="page">
        <h1 className="display">{t.unsubTitle}</h1>
        <p>{t.unsubText}</p>
        <p style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="pill pill-solid" href="/">
            {t.toAlbums}
          </Link>
          <Link className="pill" href="/konto">
            {t.account}
          </Link>
        </p>
      </main>
    </>
  )
}
