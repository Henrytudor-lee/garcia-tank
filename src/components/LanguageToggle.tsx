'use client'

import { useLanguage } from '@/src/lib/i18n'

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
      className="px-3 py-1 text-sm bg-black/50 hover:bg-neon-cyan/20 text-neon-cyan rounded border border-neon-cyan/50 hover:border-neon-cyan transition-all duration-300"
      title={t('language')}
    >
      {language === 'zh' ? 'EN' : '中'}
    </button>
  )
}
