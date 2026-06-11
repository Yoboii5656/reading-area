import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_MODE } from '../lib/mockData'

const AuthContext = createContext(null)

const OWNER_PROFILE_KEY = 'reading_area_owner_profile'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      // In demo mode, use a fake user and load profile from localStorage
      const demoUser = { id: 'demo-owner', email: 'demo@example.com' }
      setUser(demoUser)
      const saved = localStorage.getItem(OWNER_PROFILE_KEY)
      if (saved) {
        try {
          setOwnerProfile(JSON.parse(saved))
        } catch (e) {
          console.warn('Failed to parse saved owner profile')
        }
      }
      setLoading(false)
      return
    }

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
      localStorage.setItem(OWNER_PROFILE_KEY, JSON.stringify(data))
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
        emailRedirectTo: undefined,
      },
    })

    if (error) {
      return { error, needsConfirmation: false }
    }

    return { data, error: null, needsConfirmation: false }
  }

  function updateOwnerProfile(profile) {
    setOwnerProfile(profile)
    if (profile) {
      localStorage.setItem(OWNER_PROFILE_KEY, JSON.stringify(profile))
    } else {
      localStorage.removeItem(OWNER_PROFILE_KEY)
    }
  }

  async function signOut() {
    if (!DEMO_MODE) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setOwnerProfile(null)
    localStorage.removeItem(OWNER_PROFILE_KEY)
  }

  return (
    <AuthContext.Provider value={{
      user,
      ownerProfile,
      loading,
      signIn,
      signUp,
      signOut,
      setOwnerProfile: updateOwnerProfile,
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
