import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      navigate('/')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="grid-bg fixed inset-0 opacity-30 pointer-events-none" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 left-1/4 w-8 h-8 border-2 border-cyan-400/30 rounded-lg rotate-45 float" />
      <div className="absolute bottom-1/3 right-1/4 w-6 h-6 border-2 border-purple-400/30 rounded-full float" style={{ animationDelay: '1.5s' }} />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <div className="flex items-center justify-center gap-3 mb-8 group">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-black text-xl">G</span>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-black text-3xl gradient-text">
                Gyaanly
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6">
            <span className="notification-dot" />
            <span className="text-sm font-medium text-cyan-400">
              🔐 Secure Authentication
            </span>
          </div>

          <h2 className="text-4xl font-bold gradient-text mb-4">
            Welcome Back
          </h2>
          <p className="text-gray-400 text-lg">
            Continue your learning journey
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8 space-y-6">
          {error && (
            <div className="bg-red-400/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-xl text-sm backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-cyan-400">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-cyber pl-12"
                  placeholder="Enter your email"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-cyan-400">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-cyber pl-12"
                  placeholder="Enter your password"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cyber w-full group relative overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10">Access Platform</span>
                  <span className="absolute right-4 text-xl transition-transform group-hover:translate-x-1">→</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-cyan-400/20">
            <p className="text-center text-gray-400">
              New to Gyaanly?{' '}
              <Link 
                to="/signup" 
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                Create your account
              </Link>
            </p>
          </div>
        </div>

        {/* Security Features */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">🛡️</span>
              <span>End-to-End Encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">⚡</span>
              <span>Instant Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}