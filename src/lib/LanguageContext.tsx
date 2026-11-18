'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
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
  const [lang, setLangState] = useState<Lang>('de')

  // Gemerkte Sprache, sonst die des Browsers
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lang')
      if (saved === 'de' || saved === 'en') setLangState(saved)
      else if (!navigator.language.toLowerCase().startsWith('de')) setLangState('en')
    } catch {}
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem('lang', next)
    } catch {}
    document.documentElement.lang = next
  }, [])

  return <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>{children}</LanguageContext.Provider>
}

export function useLang() {
  return useContext(LanguageContext)
}
