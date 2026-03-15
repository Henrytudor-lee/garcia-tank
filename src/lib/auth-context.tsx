'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'

interface User {
  id: string
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('tank_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    // Query users table directly
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (error || !data) {
      return { error: '邮箱或密码错误' }
    }

    // Store user in localStorage
    const userData: User = {
      id: data.id,
      email: data.email,
      username: data.username,
    }
    localStorage.setItem('tank_user', JSON.stringify(userData))
    setUser(userData)

    return { error: null }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Check if email already exists
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (checkError && !checkError.message.includes('No rows')) {
        console.error('Check error:', checkError)
      }

      if (existing) {
        return { error: '该邮箱已被注册' }
      }

      // Generate UUID
      const userId = crypto.randomUUID()

      // Insert directly into users table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          username,
          password,
          role: 'user',
          status: 'active',
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return { error: insertError.message }
      }

      // Store user in localStorage
      const userData: User = {
        id: userId,
        email,
        username,
      }
      localStorage.setItem('tank_user', JSON.stringify(userData))
      setUser(userData)

      return { error: null }
    } catch (err) {
      console.error('Signup exception:', err)
      return { error: '注册失败，请稍后重试' }
    }
  }

  const signOut = async () => {
    localStorage.removeItem('tank_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
