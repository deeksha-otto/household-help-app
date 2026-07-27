import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  getCurrentPeriod, buildCalendarDays, computeSummary,
  formatDate, formatCurrency,
} from '../utils/salary.js'

const ATT_STATS = [
  { key: 'present',    label: 'Present',  color: 'text-green-600', bg: 'bg-green-50'  },
  { key: 'absent',     label: 'Absent',   color: 'text-red-600',   bg: 'bg-red-50'    },
  { key: 'half_day',   label: 'Half Day', color: 'text-amber-600', bg: 'bg-amber-50'  },
  { key: 'paid_leave', label: 'Leave',    color: 'text-blue-600',  bg: 'bg-blue-50'   },
  { key: 'weekly_off', label: 'Off',      color: 'text-stone-400', bg: 'bg-stone-50'  },
]

export default function EmployeeSummary() {
  const { workerRecord } = useAuth()
  const worker = workerRecord

  const [period, setPeriod]   = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => { if (worker) loadData() }, [worker])

  async function loadData() {
    setLoading(true)
    const p = await getCurrentPeriod(worker.id)
    setPeriod(p)
    const { data: records } = await supabase
      .from('attendance').select('*')
      .eq('worker_id', worker.id)
      .gte('date', p.periodStart).lte('date', p.periodEnd)

    const pending = (records || []).filter(r => r.approval_status === 'pending').length
    setPendingCount(pending)

    const days = buildCalendarDays(p.periodStart, p.periodEnd, worker, records || [])
    setSummary(computeSummary(worker, days, []))  // no payments visible to employee
    setLoading(false)
  }

  if (loading || !worker || !summary) return <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>

  const { counts, perDayRate, deductionTotal, grossSalary, finalAmountDue, extraPaidLeaves, paidLeavesUsed, expectedWorkingDays } = summary
  const absentDeduction    = counts.absent   * perDayRate
  const halfDayDeduction   = counts.half_day * (perDayRate / 2)
  const extraLeaveDeduction = extraPaidLeaves * perDayRate
  const hasDeductions      = deductionTotal > 0
  const afterDeductions    = grossSalary - deductionTotal

  return (
    <div className="p-4 space-y-4">

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <p className="text-sm text-amber-800 font-medium">
            {pendingCount} submission{pendingCount !== 1 ? 's' : ''} pending employer approval — not yet counted in salary below.
          </p>
        </div>
      )}

      {period && (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <p className="section-label mb-0.5">Current period</p>
          <p className="font-bold text-stone-800 text-base mt-1">{formatDate(period.periodStart)} – {formatDate(period.periodEnd)}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="section-label mb-4">Attendance (approved only)</p>
        <div className="grid grid-cols-5 gap-2">
          {ATT_STATS.map(({ key, label, color, bg }) => (
            <div key={key} className={`${bg} rounded-xl py-3 flex flex-col items-center gap-1`}>
              <span className={`text-2xl font-bold leading-none ${color}`}>{counts[key]}</span>
              <span className="text-[10px] font-semibold text-stone-400 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 text-center mt-3">
          Paid leaves: <span className="font-semibold text-stone-600">{paidLeavesUsed} used</span>
          {' '}/ <span className="font-semibold text-stone-600">{worker.allowed_paid_leaves} allowed</span>
        </p>
        {extraPaidLeaves > 0 && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-orange-800 leading-relaxed">
              <span className="font-bold">{extraPaidLeaves} leave{extraPaidLeaves > 1 ? 's' : ''} over limit</span> — treated as unpaid.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="section-label mb-4">Salary estimate</p>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-stone-600">Gross salary</span>
            <span className="text-sm font-semibold text-stone-800">{formatCurrency(grossSalary)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-400">Per-day rate</span>
            <span className="text-xs text-stone-400">{formatCurrency(perDayRate)}/day · {expectedWorkingDays} scheduled days</span>
          </div>

          {hasDeductions && <div className="border-t border-stone-100 my-1" />}
          {absentDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">Absent ({counts.absent} day{counts.absent !== 1 ? 's' : ''})</span>
              <span className="text-sm font-semibold text-red-600">−{formatCurrency(absentDeduction)}</span>
            </div>
          )}
          {halfDayDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-600">Half days ({counts.half_day})</span>
              <span className="text-sm font-semibold text-amber-600">−{formatCurrency(halfDayDeduction)}</span>
            </div>
          )}
          {extraLeaveDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-600">Exceeded leave ({extraPaidLeaves} day{extraPaidLeaves !== 1 ? 's' : ''})</span>
              <span className="text-sm font-semibold text-orange-600">−{formatCurrency(extraLeaveDeduction)}</span>
            </div>
          )}
          {hasDeductions && (
            <>
              <div className="border-t border-stone-100 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">After deductions</span>
                <span className="text-sm font-semibold text-stone-700">{formatCurrency(afterDeductions)}</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-5 rounded-2xl p-5 bg-teal-50 border-2 border-teal-200">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-teal-600">Estimated amount due</p>
          <p className="text-4xl font-bold tracking-tight text-teal-700">{formatCurrency(Math.abs(finalAmountDue))}</p>
          <p className="text-xs text-teal-500 mt-1">Advances paid by employer are not shown here</p>
        </div>
      </div>
    </div>
  )
}
