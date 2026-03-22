'use client'

import { AuthProvider } from '@/src/lib/auth-context'
import { LanguageProvider } from '@/src/lib/i18n'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  )
}
