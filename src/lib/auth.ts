import { supabase, DbUser } from './supabase'

export interface AuthUser {
  id: string
  email: string
  username: string | null
  avatar: string | null
}

// Register a new user
export async function signUp(email: string, password: string, username: string) {
  // First, create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Then create user profile in users table
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      username,
      password, // Note: In production, hash this password!
    })

  if (profileError) {
    return { error: profileError.message }
  }

  return { user: authData.user }
}

// Login
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Get user profile
  if (data.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        username: profile?.username || null,
        avatar: profile?.avatar || null,
      }
    }
  }

  return { error: 'Login failed' }
}

// Logout
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email || '',
    username: profile?.username || null,
    avatar: profile?.avatar || null,
  }
}

// Subscribe to auth changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      callback({
        id: session.user.id,
        email: session.user.email || '',
        username: profile?.username || null,
        avatar: profile?.avatar || null,
      })
    } else {
      callback(null)
    }
  })
}
