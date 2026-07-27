import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, STATUS_META } from '../utils/salary.js'

export default function PendingApprovals() {
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: workers } = await supabase.from('workers').select('id, name, role, custom_role_label').eq('is_active', true)
    if (!workers?.length) { setItems([]); setLoading(false); return }

    const { data: pending } = await supabase
      .from('attendance')
      .select('*')
      .in('worker_id', workers.map(w => w.id))
      .eq('approval_status', 'pending')
      .order('date', { ascending: false })

    const workerMap = {}
    workers.forEach(w => { workerMap[w.id] = w })
    setItems((pending || []).map(p => ({ ...p, worker: workerMap[p.worker_id] })))
    setLoading(false)
  }

  async function approve(id) {
    setSaving(id + '_approve')
    await supabase.from('attendance').update({ approval_status: 'approved' }).eq('id', id)
    await loadData()
    setSaving(null)
  }

  async function reject(id) {
    setSaving(id + '_reject')
    await supabase.from('attendance').update({ approval_status: 'rejected' }).eq('id', id)
    await loadData()
    setSaving(null)
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#f5f4f0' }}>
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-stone-100 text-stone-600 text-xl"
          >
            ←
          </button>
          <h1 className="font-bold text-stone-800 text-xl flex-1">Pending Approvals</h1>
          {items.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{items.length}</span>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4">✅</span>
            <p className="text-lg font-bold text-stone-700">All caught up!</p>
            <p className="text-stone-400 text-sm mt-1">No pending approvals right now</p>
          </div>
        ) : (
          items.map(item => {
            const meta = STATUS_META[item.status]
            const isApprovingSaving = saving === item.id + '_approve'
            const isRejectingSaving = saving === item.id + '_reject'
            const isBusy = saving !== null

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${meta?.bg} ${meta?.color}`}>
                    {meta?.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-base">{item.worker?.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatDate(item.date)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(item.id)}
                    disabled={isBusy}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-500 text-white active:bg-green-600 disabled:opacity-50"
                  >
                    {isApprovingSaving ? '…' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => reject(item.id)}
                    disabled={isBusy}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 border border-red-200 active:bg-red-100 disabled:opacity-50"
                  >
                    {isRejectingSaving ? '…' : '✕ Reject'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
