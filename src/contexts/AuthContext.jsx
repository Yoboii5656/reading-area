import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchOwnerProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchOwnerProfile(session.user.id)
      } else {
        setOwnerProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchOwnerProfile(userId) {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('Could not fetch owner profile:', error.message)
    }
    if (data) {
      setOwnerProfile(data)
    }
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      return { error, needsConfirmation: false }
    }

    // If email confirmation is enabled, user won't have a session yet
    if (data?.user && !data.session) {
      return { error: null, needsConfirmation: true }
    }

    return { data, error: null, needsConfirmation: false }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setOwnerProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      ownerProfile,
      loading,
      signIn,
      signUp,
      signOut,
      setOwnerProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
