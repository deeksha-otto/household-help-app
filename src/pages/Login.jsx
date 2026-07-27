import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

        if (data.session) {
          await supabase.auth.setSession(data.session)
          await supabase.from('employers').upsert({ id: data.user.id }, { onConflict: 'id' })
          navigate('/')
        } else {
          setInfo('Account created! Check your email for a confirmation link, then sign in.')
          setMode('login')
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        await supabase.from('employers').upsert({ id: data.user.id }, { onConflict: 'id' })
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode) {
    setError('')
    setInfo('')
    setMode(newMode)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-8" style={{ background: '#f5f4f0' }}>
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-md" style={{ background: '#58CC02' }}>
            <svg viewBox="0 0 48 48" className="w-12 h-12" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="23" width="30" height="21" rx="3" fill="white" opacity="0.9" />
              <path d="M4 25 L24 7 L44 25 Z" fill="white" opacity="0.9" />
              <rect x="18" y="31" width="12" height="13" rx="2" fill="#58CC02" />
              <circle cx="36" cy="14" r="9" fill="white" />
              <path d="M31 14 L35 18 L42 10" stroke="#58CC02" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Sahayak</h1>
          <p className="text-stone-500 mt-1 text-base">Attendance &amp; salary, sorted</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">

          {/* Mode tabs */}
          <div className="flex border-b border-stone-100">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'text-teal-700 border-b-2 border-teal-600'
                    : 'text-stone-400'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-7 space-y-5">
            {info && (
              <div className="bg-teal-50 border border-teal-200 text-teal-800 text-sm p-4 rounded-xl leading-relaxed">
                {info}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-stone-600 block mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-stone-600 block mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Your data is private and stored securely.
        </p>
      </div>
    </div>
  )
}
