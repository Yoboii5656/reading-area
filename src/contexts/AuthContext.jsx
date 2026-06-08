import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Demo mode - set to true to bypass login and see all pages with mock data
const DEMO_MODE = true

const DEMO_OWNER = {
  id: 'demo-owner-001',
  name: 'Rajesh Kumar',
  phone: '9876543210',
  reading_area_name: 'Sunrise Reading Zone',
  address: '123 Main Street, Indore',
  monthly_fee: 500,
  upi_qr_url: null,
  plan: 'basic',
  created_at: '2026-01-15T00:00:00Z',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO_MODE ? { id: 'demo-owner-001', phone: '9876543210' } : null)
  const [ownerProfile, setOwnerProfile] = useState(DEMO_MODE ? DEMO_OWNER : null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return

    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchOwnerProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchOwnerProfile(session.user.id)
      else {
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

    if (!error && data) setOwnerProfile(data)
    setLoading(false)
  }

  async function signInWithOtp(phone) {
    if (DEMO_MODE) return { error: null }
    const { error } = await supabase.auth.signInWithOtp({ phone })
    return { error }
  }

  async function verifyOtp(phone, token) {
    if (DEMO_MODE) return { data: { user: { id: 'demo-owner-001' } }, error: null }
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    })
    return { data, error }
  }

  async function signOut() {
    if (DEMO_MODE) return
    await supabase.auth.signOut()
    setUser(null)
    setOwnerProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      ownerProfile,
      loading,
      signInWithOtp,
      verifyOtp,
      signOut,
      setOwnerProfile
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
