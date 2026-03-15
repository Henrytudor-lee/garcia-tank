'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/src/lib/auth-context'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, username)

    if (error) {
      setError(error)
      setLoading(false)
    } else {
      alert('注册成功！请登录')
      router.push('/login')
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-yellow-400 text-center mb-8">注册</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-400 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="显示名称"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-2">邮箱</label>
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
              <label className="block text-gray-400 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="至少6位"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="再次输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded transition"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            已有账号？{' '}
            <Link href="/login" className="text-yellow-400 hover:underline">
              登录
            </Link>
          </p>

          <p className="text-center text-gray-400 mt-4">
            <Link href="/" className="text-gray-500 hover:underline">
              返回首页（游客模式）
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
