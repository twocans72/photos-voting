'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { translations, Lang, T } from './i18n'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: T
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'de',
  setLang: () => {},
  t: translations.de,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('de')
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

export function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => setLang('de')}
        className={`px-2 py-1 transition-colors ${lang === 'de' ? 'text-accent border border-accent/50' : 'text-text-muted hover:text-text-primary border border-transparent'}`}
      >
        DE
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 transition-colors ${lang === 'en' ? 'text-accent border border-accent/50' : 'text-text-muted hover:text-text-primary border border-transparent'}`}
      >
        EN
      </button>
    </div>
  )
}
