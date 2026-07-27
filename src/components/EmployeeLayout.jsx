import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { roleLabel, roleIcon } from '../utils/salary.js'

const TABS = [
  { path: 'attendance', label: 'Attendance', icon: '📅' },
  { path: 'summary',    label: 'My Summary', icon: '📊' },
]

export default function EmployeeLayout() {
  const { workerRecord, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = TABS.find(t => location.pathname.endsWith(t.path))?.path || 'attendance'

  const worker = workerRecord

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#f5f4f0' }}>
      <header className="bg-white border-b border-stone-100 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-xl flex-shrink-0">
            {worker ? roleIcon(worker.role) : '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-stone-800 text-base truncate leading-tight">
              {worker?.name || '…'}
            </p>
            <p className="text-xs text-stone-400 truncate">
              {worker ? roleLabel(worker) : ''}
            </p>
          </div>
          <button
            onClick={signOut}
            className="text-sm font-medium text-stone-400 px-3 py-1.5 rounded-lg border border-stone-200 active:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-stone-100 flex z-20">
        {TABS.map(tab => {
          const isActive = activeTab === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(`/employee/${tab.path}`)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors relative ${
                isActive ? 'text-teal-700' : 'text-stone-400'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && <span className="absolute bottom-0 h-0.5 w-8 bg-teal-600 rounded-full" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
