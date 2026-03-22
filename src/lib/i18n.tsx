'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { translations, Language, TranslationKey } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'zh',
  setLanguage: () => {},
  t: () => '',
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh')

  // Load language preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('language')
    if (stored === 'zh' || stored === 'en') {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
