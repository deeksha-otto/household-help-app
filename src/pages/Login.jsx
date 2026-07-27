import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'

const STORAGE_KEY = 'sahayak_blocked_msg'

const LogoMark = () => (
  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-md" style={{ background: '#6D2E75' }}>
    <svg viewBox="0 0 48 48" className="w-12 h-12" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="23" width="30" height="21" rx="3" fill="white" opacity="0.9" />
      <path d="M4 25 L24 7 L44 25 Z" fill="white" opacity="0.9" />
      <rect x="18" y="31" width="12" height="13" rx="2" fill="#6D2E75" />
      <circle cx="36" cy="14" r="9" fill="white" />
      <path d="M31 14 L35 18 L42 10" stroke="#6D2E75" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
)

export default function Login() {
  const { refreshRole } = useAuth()
  const navigate = useNavigate()

  const [role, setRole]         = useState('employer')
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [authError, setAuthError] = useState('')   // inline, for wrong password etc.
  const [info, setInfo]           = useState('')
  const [blocked, setBlocked]     = useState(null) // { title, body, hint? } — survives remount

  // Restore blocked state if a remount wiped it (e.g. onAuthStateChange during signOut)
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setBlocked(JSON.parse(saved)) } catch {}
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Write to sessionStorage BEFORE any call that might trigger a remount, then set state
  function block(title, body, hint) {
    const val = { title, body, hint: hint || null }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    setBlocked(val)
  }

  function clearBlocked() {
    sessionStorage.removeItem(STORAGE_KEY)
    setBlocked(null)
    setAuthError('')
    setInfo('')
    setMode('login')
  }

  function switchRole(r) { setRole(r); setAuthError(''); setInfo('') }
  function switchMode(m) { setMode(m); setAuthError(''); setInfo('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    setInfo('')
    try {
      if (mode === 'signup') await handleSignup()
      else                   await handleSignin()
    } catch (err) {
      setAuthError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup() {
    if (role === 'employer') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      if (!data.session) {
        setInfo('Account created! Check your email for a confirmation link, then sign in.')
        setMode('login')
        return
      }
      const { error: empErr } = await supabase.from('employers').upsert({ id: data.user.id }, { onConflict: 'id' })
      if (empErr) throw empErr
      navigate('/')
      return
    }

    // ── Worker signup ────────────────────────────────────────────────────────
    // Pre-check BEFORE creating an auth account — errors show as blocking cards
    // that survive any remount caused by onAuthStateChange.
    const { data: workerRow, error: lookupErr } = await supabase
      .from('workers')
      .select('id, worker_auth_id')
      .eq('worker_email', email.trim().toLowerCase())
      .maybeSingle()

    if (lookupErr) throw lookupErr

    if (!workerRow) {
      block(
        'No worker profile found',
        'Your employer needs to add your email address in the app before you can sign up.',
        'Ask them to open Sahayak → tap your name → Edit → add your email → Save.'
      )
      return
    }

    if (workerRow.worker_auth_id !== null) {
      block(
        'Account already exists',
        'A login is already set up for this email.',
        'Switch to "Sign In" and use your password to log in.'
      )
      return
    }

    // Worker found and unlinked — create auth account
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) throw signUpError

    if (!data.session) {
      if (data.user?.id) {
        await supabase.from('workers').update({ worker_auth_id: data.user.id }).eq('id', workerRow.id)
      }
      setInfo('Account created! Confirm your email, then sign in as a Worker.')
      setMode('login')
      return
    }

    const { error: updateErr } = await supabase
      .from('workers').update({ worker_auth_id: data.user.id }).eq('id', workerRow.id)
    if (updateErr) throw updateErr

    await supabase.from('employers').delete().eq('id', data.user.id)
    await refreshRole()
    navigate('/employee/attendance')
  }

  async function handleSignin() {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError

    if (role === 'employer') {
      const { error: empErr } = await supabase.from('employers').upsert({ id: data.user.id }, { onConflict: 'id' })
      if (empErr) throw empErr
      navigate('/')
      return
    }

    // ── Worker sign-in ───────────────────────────────────────────────────────
    const { data: workerRow, error: workerErr } = await supabase
      .from('workers').select('id').eq('worker_auth_id', data.user.id).maybeSingle()

    if (workerErr) {
      await supabase.auth.signOut()
      throw workerErr
    }

    if (!workerRow) {
      // Write to sessionStorage before signOut so we survive the remount
      block(
        'No worker account linked',
        "This email doesn't have a worker login set up yet.",
        'If your employer added you recently, switch to "Create Account" and sign up as a Worker first.'
      )
      await supabase.auth.signOut()
      return
    }

    await supabase.from('employers').delete().eq('id', data.user.id)
    await refreshRole()
    navigate('/employee/attendance')
  }

  // ── Blocking error card (survives remount via sessionStorage) ────────────
  if (blocked) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-8" style={{ background: '#f5f4f0' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <LogoMark />
            <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Sahayak</h1>
          </div>
          <div className="bg-white rounded-3xl shadow-md p-7 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="font-bold text-stone-800 text-lg">{blocked.title}</p>
            <p className="text-stone-600 text-sm mt-2 leading-relaxed">{blocked.body}</p>
            {blocked.hint && (
              <p className="text-stone-400 text-xs mt-3 leading-relaxed">{blocked.hint}</p>
            )}
            <button
              onClick={clearBlocked}
              className="btn-primary w-full mt-6"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main login / signup form ─────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-8" style={{ background: '#f5f4f0' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <LogoMark />
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Sahayak</h1>
          <p className="text-stone-500 mt-1 text-base">Attendance &amp; salary, sorted</p>
        </div>

        {/* Role toggle */}
        <div className="flex gap-3 mb-4">
          {[
            { value: 'employer', label: "I'm an Employer", icon: '🏠' },
            { value: 'worker',   label: "I'm a Worker",   icon: '👷' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => switchRole(opt.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                role === opt.value
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-stone-200 bg-white text-stone-500'
              }`}
              style={role === opt.value ? { borderBottom: '4px solid #5A2060' } : {}}
            >
              <span className="text-2xl leading-none">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <div className="flex border-b border-stone-100">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  mode === m ? 'text-brand-700 border-b-2 border-brand-600' : 'text-stone-400'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-7 space-y-5">
            {info && (
              <div className="bg-brand-50 border border-brand-200 text-brand-800 text-sm p-4 rounded-xl leading-relaxed">
                {info}
              </div>
            )}
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl leading-relaxed">
                {authError}
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
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
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
