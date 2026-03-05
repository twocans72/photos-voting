import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, Raleway } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['200', '300'],
  variable: '--font-raleway',
})

export const metadata: Metadata = {
  title: 'Peduzzi Photos',
  description: 'Entdecke und bewerte unsere Fotoalben',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${cormorant.variable} ${dmSans.variable} ${raleway.variable}`}>
      <body className="bg-surface text-text-primary font-body antialiased min-h-screen">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
