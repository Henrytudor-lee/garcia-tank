'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/src/lib/auth-context'
import { useLanguage } from '@/src/lib/i18n'
import { LanguageToggle } from '@/src/components/LanguageToggle'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, signIn } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'))
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, username)

    if (error) {
      setError(error)
      setLoading(false)
    } else {
      // Auto login after registration
      await signIn(email, password)
      setSuccess(true)
      // Redirect to main menu after showing success message
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Success Toast */}
      {success && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-neon-green/20 border-2 border-neon-green text-neon-green px-6 py-3 rounded-lg shadow-neon-green flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-bold">{t('registrationSuccess')}，正在跳转...</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="bg-black/80 rounded-lg p-8 border-2 border-neon-cyan/30">
          <div className="flex justify-end mb-4">
            <LanguageToggle />
          </div>
          <h1 className="text-3xl font-bold text-neon-yellow text-center mb-8 drop-shadow-[0_0_10px_#ffff00]">{t('register')}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-neon-red/20 border border-neon-red/50 text-neon-red p-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-neon-cyan/80 mb-2">{t('username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder={t('username')}
              />
            </div>

            <div>
              <label className="block text-neon-cyan/80 mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-neon-cyan/80 mb-2">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder={t('passwordTooShort')}
              />
            </div>

            <div>
              <label className="block text-neon-cyan/80 mb-2">{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder={t('confirmPassword')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-neon-green/20 hover:bg-neon-green/40 disabled:bg-gray-800 border-2 border-neon-green text-neon-green font-bold rounded transition-all duration-300 hover:shadow-neon-green"
            >
              {loading ? t('registering') : t('registerButton')}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-neon-yellow hover:underline drop-shadow-[0_0_5px_#ffff00]">
              {t('login')}
            </Link>
          </p>

          <p className="text-center text-gray-500 mt-4">
            <Link href="/" className="text-gray-500 hover:text-neon-cyan transition-colors">
              {t('backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
