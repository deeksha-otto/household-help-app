import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext.jsx'
import Login from './pages/Login.jsx'
import WorkerList from './pages/WorkerList.jsx'
import AddEditWorker from './pages/AddEditWorker.jsx'
import WorkerLayout from './components/WorkerLayout.jsx'
import DailyAttendance from './pages/DailyAttendance.jsx'
import LogPayment from './pages/LogPayment.jsx'
import MonthlySummary from './pages/MonthlySummary.jsx'
import SettlementHistory from './pages/SettlementHistory.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-dvh text-gray-400">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

function RequireGuest({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-dvh text-gray-400">Loading…</div>
  return !user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />

        <Route path="/" element={<RequireAuth><WorkerList /></RequireAuth>} />
        <Route path="/workers/new" element={<RequireAuth><AddEditWorker /></RequireAuth>} />
        <Route path="/workers/:id/edit" element={<RequireAuth><AddEditWorker /></RequireAuth>} />

        <Route path="/workers/:id" element={<RequireAuth><WorkerLayout /></RequireAuth>}>
          <Route index element={<Navigate to="attendance" replace />} />
          <Route path="attendance" element={<DailyAttendance />} />
          <Route path="payments" element={<LogPayment />} />
          <Route path="summary" element={<MonthlySummary />} />
          <Route path="history" element={<SettlementHistory />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
