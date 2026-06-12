import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [superPassword, setSuperPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    // Check super password first
    const secret = import.meta.env.VITE_SIGNUP_SECRET || 'Manav5536#'
    if (superPassword !== secret) {
      setError('Invalid access code. Only authorized users can create accounts.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, name)

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
          <p className="text-body text-sm mt-1">Create your owner account to get started</p>
        </div>

        {/* Student Notice */}
        <div className="bg-canvas-soft-2 border border-hairline rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-xs text-body">
            <span className="font-medium text-ink">📚 Student?</span> You don't need an account. Just scan the QR code at your reading area to mark attendance.
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-canvas rounded-2xl p-6 shadow-card border border-hairline/50">
          <form onSubmit={handleSignup}>
            <div className="mb-4">
              <label htmlFor="superPassword" className="block text-sm font-medium text-ink mb-2">
                Access Code <span className="text-error">*</span>
              </label>
              <input
                id="superPassword"
                type="password"
                value={superPassword}
                onChange={(e) => setSuperPassword(e.target.value)}
                placeholder="Enter access code"
                className="w-full h-11 px-3.5 border border-hairline rounded-lg text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                required
                autoComplete="off"
              />
              <p className="text-xs text-mute mt-1">Required to create an account. Contact admin if you don't have it.</p>
            </div>

            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Kumar"
                className="w-full h-11 px-3.5 border border-hairline rounded-lg text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                required
                autoComplete="name"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 border border-hairline rounded-lg text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                required
                autoComplete="email"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full h-11 px-3.5 pr-10 border border-hairline rounded-lg text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full h-11 px-3.5 border border-hairline rounded-lg text-sm bg-canvas text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-link/20 focus:border-link transition-all"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-error text-xs mb-3 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-error" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name || !email || password.length < 6 || !confirmPassword || !superPassword}
              className="w-full h-11 mt-2 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-hairline/50 text-center">
            <p className="text-sm text-body">
              Already have an account?{' '}
              <Link to="/login" className="text-link font-medium hover:text-link-deep transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-mute text-center mt-6">
          Secure signup powered by Supabase Auth
        </p>
      </div>
    </div>
  )
}
