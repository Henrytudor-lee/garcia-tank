'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/src/lib/auth-context'
import { useLanguage } from '@/src/lib/i18n'
import { LanguageToggle } from '@/src/components/LanguageToggle'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="flex justify-end mb-4">
            <LanguageToggle />
          </div>
          <h1 className="text-3xl font-bold text-yellow-400 text-center mb-8">{t('login')}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-400 mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-2">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder={t('password')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded transition"
            >
              {loading ? t('loggingIn') : t('loginButton')}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-yellow-400 hover:underline">
              {t('register')}
            </Link>
          </p>

          <p className="text-center text-gray-400 mt-4">
            <Link href="/" className="text-gray-500 hover:underline">
              {t('backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
