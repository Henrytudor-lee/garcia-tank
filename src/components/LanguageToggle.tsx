'use client'

import { useLanguage } from '@/src/lib/i18n'

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-500 transition"
      title={t('language')}
    >
      {language === 'zh' ? 'EN' : '中'}
    </button>
  )
}
