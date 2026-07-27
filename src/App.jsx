import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext.jsx'
import { supabase } from './lib/supabase.js'
import Splash from './pages/Splash.jsx'
import Login from './pages/Login.jsx'
import WorkerList from './pages/WorkerList.jsx'
import AddEditWorker from './pages/AddEditWorker.jsx'
import WorkerLayout from './components/WorkerLayout.jsx'
import DailyAttendance from './pages/DailyAttendance.jsx'
import LogPayment from './pages/LogPayment.jsx'
import MonthlySummary from './pages/MonthlySummary.jsx'
import SettlementHistory from './pages/SettlementHistory.jsx'
import PendingApprovals from './pages/PendingApprovals.jsx'
import EmployeeLayout from './components/EmployeeLayout.jsx'
import EmployeeAttendance from './pages/EmployeeAttendance.jsx'
import EmployeeSummary from './pages/EmployeeSummary.jsx'

const Spinner = () => (
  <div className="flex items-center justify-center min-h-dvh" style={{ background: '#f5f4f0' }}>
    <div className="w-10 h-10 rounded-full border-[3px] border-teal-200 border-t-teal-600 animate-spin" />
  </div>
)

function RequireGuest({ children }) {
  const { user, loading, userRole } = useAuth()
  if (loading) return <Spinner />
  if (!user) return children
  if (userRole === 'employee') return <Navigate to="/employee/attendance" replace />
  return <Navigate to="/" replace />
}

function RequireEmployer({ children }) {
  const { user, loading, userRole } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (userRole === 'employee') return <Navigate to="/employee/attendance" replace />
  if (userRole === 'unknown') return (
    <div className="flex items-center justify-center min-h-dvh p-8 text-center" style={{ background: '#f5f4f0' }}>
      <div>
        <p className="text-xl font-bold text-stone-700 mb-2">Account not linked</p>
        <p className="text-stone-400 text-sm">Your email is not associated with any employer or worker profile. Ask your employer to add your email when setting up your worker profile.</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-6 btn-primary px-8">Sign out</button>
      </div>
    </div>
  )
  return children
}

function RequireEmployee({ children }) {
  const { user, loading, userRole } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (userRole === 'employer') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [splash, setSplash] = useState(true)

  return (
    <>
      {splash && <Splash onDone={() => setSplash(false)} />}
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />

          {/* Employer routes */}
          <Route path="/" element={<RequireEmployer><WorkerList /></RequireEmployer>} />
          <Route path="/pending-approvals" element={<RequireEmployer><PendingApprovals /></RequireEmployer>} />
          <Route path="/workers/new" element={<RequireEmployer><AddEditWorker /></RequireEmployer>} />
          <Route path="/workers/:id/edit" element={<RequireEmployer><AddEditWorker /></RequireEmployer>} />
          <Route path="/workers/:id" element={<RequireEmployer><WorkerLayout /></RequireEmployer>}>
            <Route index element={<Navigate to="attendance" replace />} />
            <Route path="attendance" element={<DailyAttendance />} />
            <Route path="payments" element={<LogPayment />} />
            <Route path="summary" element={<MonthlySummary />} />
            <Route path="history" element={<SettlementHistory />} />
          </Route>

          {/* Employee routes */}
          <Route path="/employee" element={<RequireEmployee><EmployeeLayout /></RequireEmployee>}>
            <Route index element={<Navigate to="attendance" replace />} />
            <Route path="attendance" element={<EmployeeAttendance />} />
            <Route path="summary" element={<EmployeeSummary />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
