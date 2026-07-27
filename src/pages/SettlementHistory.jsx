import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../utils/salary.js'

const ATT_STATS = [
  { key: 'days_present',    label: 'Present',  color: 'text-green-600', bg: 'bg-green-50'  },
  { key: 'days_absent',     label: 'Absent',   color: 'text-red-600',   bg: 'bg-red-50'    },
  { key: 'days_half_day',   label: 'Half Day', color: 'text-amber-600', bg: 'bg-amber-50'  },
  { key: 'days_paid_leave', label: 'Leave',    color: 'text-blue-600',  bg: 'bg-blue-50'   },
  { key: 'days_weekly_off', label: 'Off',      color: 'text-stone-400', bg: 'bg-stone-50'  },
]

export default function SettlementHistory() {
  const { worker } = useOutletContext()
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (worker) loadData()
  }, [worker])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('settlements')
      .select('*')
      .eq('worker_id', worker.id)
      .order('period_end', { ascending: false })
    setSettlements(data || [])
    setLoading(false)
  }

  if (loading || !worker) {
    return <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>
  }

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <span className="text-5xl mb-4">🗂️</span>
        <p className="text-base font-bold text-stone-600">No settlements yet</p>
        <p className="text-sm text-stone-400 mt-1 leading-relaxed">
          Go to the Summary tab and tap "Mark as Settled" to archive a period
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest px-1">
        {settlements.length} settled period{settlements.length !== 1 ? 's' : ''}
      </p>

      {settlements.map(s => {
        const isOpen     = expanded === s.id
        const isNegative = s.final_amount_due < 0
        const settledOn  = s.settled_at ? formatDate(s.settled_at.split('T')[0]) : null

        return (
          <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* ── Collapsed row / header ─────────────────────────────── */}
            <button
              onClick={() => setExpanded(isOpen ? null : s.id)}
              className="w-full px-5 py-4 flex items-center gap-3 text-left active:bg-stone-50"
            >
              {/* Green checkmark circle */}
              <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                <span className="text-base leading-none">✅</span>
              </div>

              {/* Period dates */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-800 text-sm leading-tight">
                  {formatDate(s.period_start)} – {formatDate(s.period_end)}
                </p>
                {settledOn && (
                  <p className="text-xs text-stone-400 mt-0.5">Settled {settledOn}</p>
                )}
              </div>

              {/* Amount + chevron */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className={`text-base font-bold leading-tight ${isNegative ? 'text-red-600' : 'text-brand-700'}`}>
                    {formatCurrency(s.final_amount_due)}
                  </p>
                  <p className="text-[10px] text-stone-400 text-right">paid</p>
                </div>
                <span className={`text-stone-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>

            {/* ── Expanded drawer ────────────────────────────────────── */}
            {isOpen && (
              <div className="border-t border-stone-100 bg-stone-50 px-4 py-4 space-y-4">

                {/* Attendance stat bubbles */}
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
                    Attendance
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ATT_STATS.map(({ key, label, color, bg }) => (
                      <div key={key} className={`${bg} rounded-xl py-2.5 flex flex-col items-center gap-0.5`}>
                        <span className={`text-xl font-bold leading-none ${color}`}>{s[key]}</span>
                        <span className="text-[9px] font-semibold text-stone-400 text-center leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary breakdown */}
                <div className="bg-white rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-600">Gross salary</span>
                    <span className="font-semibold text-stone-800">{formatCurrency(s.gross_salary)}</span>
                  </div>

                  {s.deduction_amount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-red-500">Deductions</span>
                      <span className="font-semibold text-red-500">−{formatCurrency(s.deduction_amount)}</span>
                    </div>
                  )}

                  {s.total_advances > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500">Advances paid</span>
                      <span className="font-semibold text-stone-600">−{formatCurrency(s.total_advances)}</span>
                    </div>
                  )}

                  <div className="border-t border-stone-100 pt-2.5 flex justify-between items-center">
                    <span className={`text-sm font-bold ${isNegative ? 'text-red-600' : 'text-brand-700'}`}>
                      Final paid
                    </span>
                    <span className={`text-lg font-bold ${isNegative ? 'text-red-600' : 'text-brand-700'}`}>
                      {formatCurrency(s.final_amount_due)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
