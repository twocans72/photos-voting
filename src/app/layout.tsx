import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { SessionProvider } from '@/lib/SessionContext'

// Bricolage Grotesque (SIL Open Font License), lateinischer Zeichensatz, selbst
// gehostet: next/font/google kann diese Schrift in Next 14.2 nicht laden.
const display = localFont({
  src: '../fonts/BricolageGrotesque.woff2',
  weight: '500 800',
  display: 'swap',
  variable: '--font-display',
})

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'Peduzzi Photos',
  description: 'Fotoalben ansehen und bewerten',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#211a33',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable}`}>
      <body className="bg-surface text-text-primary font-body antialiased min-h-screen">
        <LanguageProvider>
          <SessionProvider>{children}</SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
