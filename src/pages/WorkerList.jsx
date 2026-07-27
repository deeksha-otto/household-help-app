import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import { roleLabel, roleIcon, STATUS_META, todayStr } from '../utils/salary.js'



function scheduleLabel(worker) {
  const freq = worker.attendance_frequency || 'daily'
  if (freq === 'specific_days') {
    const days = (worker.scheduled_days || []).map(d => d.slice(0, 3)).join(', ')
    return days || 'Specific days'
  }
  if (freq === 'alternate_days') return 'Every other day'
  return `Off: ${worker.weekly_off_day || 'Sunday'}`
}

const ROLE_BG = {
  cook:       'bg-orange-100',
  maid:       'bg-violet-100',
  car_washer: 'bg-sky-100',
  newspaper:  'bg-yellow-100',
  milk:       'bg-blue-100',
  gardener:   'bg-green-100',
  nanny:      'bg-pink-100',
  custom:     'bg-stone-100',
}

export default function WorkerList() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeRole, setActiveRole] = useState('all')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: workerData } = await supabase
      .from('workers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (!workerData) { setLoading(false); return }
    setWorkers(workerData)

    if (workerData.length > 0) {
      const ids = workerData.map(w => w.id)
      const [{ data: todayAtt }, { data: pendingAtt }] = await Promise.all([
        supabase.from('attendance').select('worker_id, status').in('worker_id', ids).eq('date', todayStr()),
        supabase.from('attendance').select('id').in('worker_id', ids).eq('approval_status', 'pending'),
      ])
      const map = {}
      todayAtt?.forEach(a => { map[a.worker_id] = a.status })
      setAttendanceMap(map)
      setPendingCount(pendingAtt?.length ?? 0)
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Unique roles for filter chips
  const roles = ['all', ...new Set(workers.map(w => w.role))]

  const filtered = activeRole === 'all'
    ? workers
    : workers.filter(w => w.role === activeRole)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh" style={{ background: '#f5f4f0' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-brand-200 border-t-brand-600 animate-spin" />
          <p className="text-stone-400 text-sm">Loading workers…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#f5f4f0' }}>

      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-stone-800">Sahayak</h1>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-stone-400 px-3 py-1.5 rounded-lg border border-stone-200 active:bg-stone-50"
          >
            Sign out
          </button>
        </div>
        <p className="text-stone-400 text-sm">
          {workers.length === 0
            ? 'Add your first worker below'
            : `${workers.length} active · ${Object.keys(attendanceMap).length} marked today`}
        </p>

        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/pending-approvals')}
            className="mt-3 w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left active:bg-amber-100"
          >
            <span className="text-xl">⏳</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">{pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-amber-600">Tap to review employee submissions</p>
            </div>
            <span className="text-amber-400 text-sm">→</span>
          </button>
        )}
      </header>

      {/* Role filter chips */}
      {workers.length > 1 && (
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide">
          {roles.map(role => {
            const isActive = activeRole === role
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-stone-500 border-stone-200'
                }`}
              >
                {role === 'all'
                  ? `All (${workers.length})`
                  : `${roleIcon(role)} ${roleLabel({ role, custom_role_label: '' })}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Worker cards */}
      <main className="flex-1 px-4 pb-28 space-y-3 pt-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">👋</div>
            <p className="text-xl font-bold text-stone-700">No workers yet</p>
            <p className="text-stone-400 mt-1">Tap the + button to add your first worker</p>
          </div>
        ) : (
          filtered.map(worker => {
            const status = attendanceMap[worker.id]
            const meta = status ? STATUS_META[status] : null
            const iconBg = ROLE_BG[worker.role] || 'bg-stone-100'

            return (
              <button
                key={worker.id}
                onClick={() => navigate(`/workers/${worker.id}/attendance`)}
                className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
              >
                {/* Role icon */}
                <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center text-2xl flex-shrink-0`}>
                  {roleIcon(worker.role)}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-base truncate">{worker.name}</p>
                  <p className="text-stone-400 text-sm mt-0.5">{roleLabel(worker)}</p>
                  <p className="text-stone-300 text-xs mt-0.5">
                    {scheduleLabel(worker)} · ₹{Number(worker.monthly_salary).toLocaleString('en-IN')}/mo
                  </p>
                </div>

                {/* Attendance badge */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {meta ? (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-400">
                      Not marked
                    </span>
                  )}
                  <span className="text-stone-300 text-xs">→</span>
                </div>
              </button>
            )
          })
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/workers/new')}
        className="fixed bottom-6 right-4 w-16 h-16 bg-brand-600 text-white rounded-full shadow-xl text-4xl flex items-center justify-center active:bg-brand-700 active:scale-95 transition-all z-10 font-light"
      >
        +
      </button>
    </div>
  )
}
