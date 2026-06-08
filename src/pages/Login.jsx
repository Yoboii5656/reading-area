import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signInWithOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()

  async function handleSendOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const { error } = await signInWithOtp(formattedPhone)

    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const { error } = await verifyOtp(formattedPhone, otp)

    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-mesh">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-gradient-develop-start to-gradient-preview-end rounded-2xl rotate-6 opacity-20" />
            <div className="relative w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-card">
              <span className="text-on-primary font-bold text-lg tracking-tight">RA</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.8px] text-ink">Reading Area</h1>
          <p className="text-body text-sm mt-1">Manage your reading area effortlessly</p>
        </div>

        {/* Login Card */}
        <div className="bg-canvas rounded-2xl p-6 shadow-card border border-hairline/50">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <label htmlFor="phone" className="block text-sm font-medium text-ink mb-2">
                Phone Number
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-canvas-soft-2 border border-hairline rounded-lg text-sm text-body font-medium">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="flex-1 h-11 px-3.5 border border-hairline rounded-lg text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                  maxLength={10}
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>
              {error && (
                <p className="text-error text-xs mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-error" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full h-11 mt-5 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : 'Continue with OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="flex items-center gap-2 mb-5 p-3 bg-canvas-soft rounded-lg">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-success text-xs">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-body">OTP sent to</p>
                  <p className="text-sm font-medium text-ink">+91 {phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-link font-medium hover:text-link-deep"
                >
                  Change
                </button>
              </div>

              <label htmlFor="otp" className="block text-sm font-medium text-ink mb-2">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full h-12 px-4 border border-hairline rounded-lg text-base bg-canvas text-ink placeholder:text-mute/40 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all text-center tracking-[0.4em] font-mono font-medium"
                maxLength={6}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              {error && (
                <p className="text-error text-xs mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-error" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full h-11 mt-5 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify & Sign In'}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-mute text-center mt-6">
          Secure login powered by Supabase Auth
        </p>
      </div>
    </div>
  )
}
