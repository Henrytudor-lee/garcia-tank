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

  // Initialize auth state - optimized for fast initial render
  useEffect(() => {
    // First, check for legacy user in localStorage immediately (synchronous)
    const storedUser = localStorage.getItem('tank_user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed.isLegacy) {
          setUser({
            id: parsed.id,
            email: parsed.email,
            username: parsed.username,
          })
        }
      } catch (e) {
        console.error('Error parsing stored user:', e)
      }
    }

    // Set loading to false after checking localStorage
    setLoading(false)

    // Then check Supabase auth in background
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email!)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email!)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch user profile from users table
  const fetchUserProfile = async (userId: string, email: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return
    }

    setUser({
      id: userId,
      email: email,
      username: data.username || email.split('@')[0],
    })
  }

  const signIn = async (email: string, password: string) => {
    // First try Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If Supabase auth succeeded
    if (!authError && authData.user) {
      return { error: null }
    }

    // Supabase auth failed, try legacy login (users table)
    console.log('Supabase auth failed, trying legacy login:', authError?.message)

    // Query users table directly
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (userError || !userData) {
      return { error: '邮箱或密码错误' }
    }

    // For legacy users, set user directly in state
    setUser({
      id: userData.id,
      email: userData.email,
      username: userData.username,
    })
    // Store in localStorage for persistence
    localStorage.setItem('tank_user', JSON.stringify({
      id: userData.id,
      email: userData.email,
      username: userData.username,
      isLegacy: true
    }))

    return { error: null }
  }

  const signUp = async (email: string, password: string, username: string) => {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return { error: '该邮箱已被注册' }
    }

    // Generate a UUID for the user
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
      console.error('Error creating user:', insertError)
      return { error: insertError.message }
    }

    // Set user directly in state (like legacy login)
    setUser({
      id: userId,
      email,
      username,
    })
    // Store in localStorage for persistence
    localStorage.setItem('tank_user', JSON.stringify({
      id: userId,
      email,
      username,
      isLegacy: true
    }))

    return { error: null }
  }

  const signOut = async () => {
    // Try Supabase signOut
    await supabase.auth.signOut()
    // Also clear legacy user
    localStorage.removeItem('tank_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
