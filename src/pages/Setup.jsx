import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DEMO_MODE } from '../lib/mockData'

export default function Setup() {
  const { user, ownerProfile, setOwnerProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    reading_area_name: '',
    address: '',
    monthly_fee: '',
  })

  // If profile already exists, skip setup entirely
  if (ownerProfile) {
    return <Navigate to="/" replace />
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (DEMO_MODE) {
      setOwnerProfile({
        id: user?.id || 'demo-owner',
        name: form.name,
        phone: form.phone,
        reading_area_name: form.reading_area_name,
        address: form.address,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        plan: 'basic',
      })
      navigate('/')
      return
    }

    const { data, error: insertError } = await supabase
      .from('owners')
      .insert({
        id: user.id,
        name: form.name,
        phone: form.phone,
        reading_area_name: form.reading_area_name,
        address: form.address,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        plan: 'basic',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message || 'Failed to create profile')
      setLoading(false)
      return
    }

    if (data) {
      setOwnerProfile(data)
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-mesh">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gradient-develop-start to-gradient-develop-end flex items-center justify-center mx-auto mb-3 shadow-card">
            <span className="text-white text-lg">🏛</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.8px] text-ink">Set up your space</h1>
          <p className="text-body text-sm mt-1">Just a few details to get started</p>
        </div>

        <div className="bg-canvas rounded-2xl p-6 shadow-card border border-hairline/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-body mb-1.5">Your Name</label>
              <input
                id="name" name="name" value={form.name} onChange={handleChange} required
                className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                placeholder="Rajesh Kumar"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-body mb-1.5">Phone Number</label>
              <input
                id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required
                className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                placeholder="9876543210" inputMode="numeric"
              />
            </div>
            <div>
              <label htmlFor="reading_area_name" className="block text-xs font-medium text-body mb-1.5">Reading Area Name</label>
              <input
                id="reading_area_name" name="reading_area_name" value={form.reading_area_name} onChange={handleChange} required
                className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                placeholder="Sunrise Reading Zone"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-xs font-medium text-body mb-1.5">Address</label>
              <input
                id="address" name="address" value={form.address} onChange={handleChange}
                className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                placeholder="123 Main Street, City"
              />
            </div>
            <div>
              <label htmlFor="monthly_fee" className="block text-xs font-medium text-body mb-1.5">Monthly Fee (₹)</label>
              <input
                id="monthly_fee" name="monthly_fee" type="number" value={form.monthly_fee} onChange={handleChange}
                className="w-full h-11 px-3.5 border border-hairline rounded-xl text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                placeholder="500" inputMode="numeric"
              />
            </div>

            {error && (
              <p className="text-error text-xs flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-error" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !form.name || !form.reading_area_name || !form.phone}
              className="w-full h-11 mt-2 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : 'Get Started'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
