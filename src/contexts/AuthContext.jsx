import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [userRole, setUserRole]       = useState(null) // 'employer' | 'employee' | 'unknown'
  const [workerRecord, setWorkerRecord] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) resolveRole(u).then(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setLoading(true)
        resolveRole(u).then(() => setLoading(false))
      } else {
        setUserRole(null)
        setWorkerRecord(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function resolveRole(u) {
    // 1. Employer?
    const { data: emp } = await supabase.from('employers').select('id').eq('id', u.id).maybeSingle()
    if (emp) { setUserRole('employer'); setWorkerRecord(null); return }

    // 2. Already-linked worker?
    const { data: linked } = await supabase.from('workers').select('*').eq('worker_auth_id', u.id).maybeSingle()
    if (linked) { setUserRole('employee'); setWorkerRecord(linked); return }

    // 3. First sign-in: match by email, link if found
    const { data: unlinked } = await supabase.from('workers')
      .select('*')
      .eq('worker_email', u.email)
      .is('worker_auth_id', null)
      .maybeSingle()
    if (unlinked) {
      await supabase.from('workers').update({ worker_auth_id: u.id }).eq('id', unlinked.id)
      setUserRole('employee')
      setWorkerRecord({ ...unlinked, worker_auth_id: u.id })
      return
    }

    setUserRole('unknown')
    setWorkerRecord(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUserRole(null)
    setWorkerRecord(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, userRole, workerRecord, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
