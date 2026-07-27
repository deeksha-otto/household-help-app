import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const TABS = [
  { path: 'attendance', label: 'Attendance', icon: '📅' },
  { path: 'payments',   label: 'Payments',   icon: '💸' },
  { path: 'summary',    label: 'Summary',    icon: '📊' },
  { path: 'history',    label: 'History',    icon: '🗂️' },
]

export default function WorkerLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [worker, setWorker] = useState(null)

  useEffect(() => { fetchWorker() }, [id])

  async function fetchWorker() {
    const { data } = await supabase.from('workers').select('*').eq('id', id).single()
    setWorker(data)
  }

  const activeTab = TABS.find(t => location.pathname.endsWith(t.path))?.path || 'attendance'

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#f5f4f0' }}>

      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-stone-100 text-stone-500 text-xl flex-shrink-0"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-stone-800 text-base truncate leading-tight">
              {worker?.name || '…'}
            </p>
            <p className="text-xs text-stone-400 truncate capitalize">
              {worker
                ? worker.role === 'custom'
                  ? worker.custom_role_label
                  : worker.role.replace('_', ' ')
                : ''}
            </p>
          </div>
          <button
            onClick={() => navigate(`/workers/${id}/edit`)}
            className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-500 active:bg-stone-50"
          >
            Edit
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet context={{ worker, refetchWorker: fetchWorker }} />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-stone-100 flex z-20">
        {TABS.map(tab => {
          const isActive = activeTab === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(`/workers/${id}/${tab.path}`)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${
                isActive ? 'text-teal-700' : 'text-stone-400'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-teal-600 rounded-full" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
