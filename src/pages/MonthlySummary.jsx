import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  getCurrentPeriod,
  buildCalendarDays,
  computeSummary,
  formatDate,
  formatCurrency,
} from '../utils/salary.js'

const ATT_STATS = [
  { key: 'present',    label: 'Present',  color: 'text-green-600',  bg: 'bg-green-50'  },
  { key: 'absent',     label: 'Absent',   color: 'text-red-600',    bg: 'bg-red-50'    },
  { key: 'half_day',   label: 'Half Day', color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { key: 'paid_leave', label: 'Leave',    color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { key: 'weekly_off', label: 'Off',      color: 'text-stone-400',  bg: 'bg-stone-50'  },
]

export default function MonthlySummary() {
  const { worker } = useOutletContext()
  const [period, setPeriod] = useState(null)
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (worker) loadData()
  }, [worker])

  async function loadData() {
    setLoading(true)
    const p = await getCurrentPeriod(worker.id)
    setPeriod(p)

    const [{ data: attRecords }, { data: payRecords }] = await Promise.all([
      supabase.from('attendance').select('*').eq('worker_id', worker.id).gte('date', p.periodStart).lte('date', p.periodEnd),
      supabase.from('payments').select('*').eq('worker_id', worker.id).gte('date', p.periodStart).lte('date', p.periodEnd),
    ])

    const days = buildCalendarDays(p.periodStart, p.periodEnd, worker, attRecords || [])
    const s = computeSummary(worker, days, payRecords || [])
    setPayments(payRecords || [])
    setSummary(s)
    setLoading(false)
  }

  async function handleSettle() {
    if (!window.confirm(`Mark ${formatDate(period.periodStart)} – ${formatDate(period.periodEnd)} as settled?`)) return
    setSettling(true)
    const { error } = await supabase.from('settlements').insert({
      worker_id: worker.id,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      days_present: summary.counts.present,
      days_absent: summary.counts.absent,
      days_half_day: summary.counts.half_day,
      days_paid_leave: summary.counts.paid_leave,
      days_weekly_off: summary.counts.weekly_off,
      gross_salary: summary.grossSalary,
      deduction_amount: summary.deductionTotal,
      total_advances: summary.totalAdvances,
      final_amount_due: summary.finalAmountDue,
    })
    if (!error) {
      setSettled(true)
      await loadData()
    }
    setSettling(false)
  }

  if (loading || !worker || !summary) {
    return <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>
  }

  const { counts, perDayRate, deductionTotal, totalAdvances, grossSalary, finalAmountDue, extraPaidLeaves, paidLeavesUsed, expectedWorkingDays } = summary

  // Derive per-category deductions for the breakdown display
  const absentDeduction     = counts.absent   * perDayRate
  const halfDayDeduction    = counts.half_day * (perDayRate / 2)
  const extraLeaveDeduction = extraPaidLeaves * perDayRate
  const afterDeductions     = grossSalary - deductionTotal
  const isNegative          = finalAmountDue < 0
  const hasDeductions       = deductionTotal > 0

  return (
    <div className="p-4 space-y-4">

      {/* ── Settled banner ───────────────────────────────────────────── */}
      {settled && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-teal-800 text-sm">Period settled!</p>
            <p className="text-teal-600 text-xs mt-0.5">
              New cycle starts from {period && formatDate(period.periodEnd)}.
            </p>
          </div>
        </div>
      )}

      {/* ── Period header ────────────────────────────────────────────── */}
      {period && (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">
            Current period
          </p>
          <p className="font-bold text-stone-800 text-base">
            {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
          </p>
        </div>
      )}

      {/* ── Attendance stat cards ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
          Attendance
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ATT_STATS.map(({ key, label, color, bg }) => (
            <div key={key} className={`${bg} rounded-xl py-3 flex flex-col items-center gap-1`}>
              <span className={`text-2xl font-bold leading-none ${color}`}>{counts[key]}</span>
              <span className="text-[10px] font-semibold text-stone-400 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Paid leave sub-label */}
        <p className="text-xs text-stone-400 text-center mt-3">
          Paid leaves: <span className="font-semibold text-stone-600">{paidLeavesUsed} used</span>
          {' '}/ <span className="font-semibold text-stone-600">{worker.allowed_paid_leaves} allowed</span>
        </p>

        {/* Exceeded leave warning */}
        {extraPaidLeaves > 0 && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-orange-800 leading-relaxed">
              <span className="font-bold">{extraPaidLeaves} paid leave{extraPaidLeaves > 1 ? 's' : ''} exceeded limit</span>
              {' '}— treated as unpaid and deducted from salary.
            </p>
          </div>
        )}
      </div>

      {/* ── Salary breakdown ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
          Salary calculation
        </p>

        <div className="space-y-2.5">

          {/* Gross */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-stone-600">Gross salary</span>
            <span className="text-sm font-semibold text-stone-800">{formatCurrency(grossSalary)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-400">Per-day rate</span>
            <span className="text-xs text-stone-400">{formatCurrency(perDayRate)}/day · {expectedWorkingDays} scheduled days</span>
          </div>

          {/* Deductions — only show non-zero lines */}
          {hasDeductions && <div className="border-t border-stone-100 my-1" />}

          {absentDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">
                Absent ({counts.absent} day{counts.absent !== 1 ? 's' : ''})
              </span>
              <span className="text-sm font-semibold text-red-600">−{formatCurrency(absentDeduction)}</span>
            </div>
          )}

          {halfDayDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-600">
                Half days ({counts.half_day})
              </span>
              <span className="text-sm font-semibold text-amber-600">−{formatCurrency(halfDayDeduction)}</span>
            </div>
          )}

          {extraLeaveDeduction > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-600 font-medium">
                Exceeded leave limit ({extraPaidLeaves} day{extraPaidLeaves !== 1 ? 's' : ''})
              </span>
              <span className="text-sm font-semibold text-orange-600">−{formatCurrency(extraLeaveDeduction)}</span>
            </div>
          )}

          {/* After deductions subtotal */}
          {hasDeductions && (
            <>
              <div className="border-t border-stone-100 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">After deductions</span>
                <span className="text-sm font-semibold text-stone-700">{formatCurrency(afterDeductions)}</span>
              </div>
            </>
          )}

          {/* Advances */}
          {totalAdvances > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-500">
                Advances paid ({payments.length})
              </span>
              <span className="text-sm font-semibold text-stone-600">−{formatCurrency(totalAdvances)}</span>
            </div>
          )}
        </div>

        {/* Final amount — prominent */}
        <div className={`mt-5 rounded-2xl p-5 ${isNegative ? 'bg-red-50 border-2 border-red-200' : 'bg-teal-50 border-2 border-teal-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isNegative ? 'text-red-500' : 'text-teal-600'}`}>
            {isNegative ? 'Overpaid' : 'Amount due'}
          </p>
          <p className={`text-4xl font-bold tracking-tight ${isNegative ? 'text-red-700' : 'text-teal-700'}`}>
            {formatCurrency(Math.abs(finalAmountDue))}
          </p>
          {isNegative && (
            <p className="text-xs text-red-500 mt-1">
              Advances exceed salary owed — no further payment needed
            </p>
          )}
        </div>
      </div>

      {/* ── Mark Settled ─────────────────────────────────────────────── */}
      <button
        onClick={handleSettle}
        disabled={settling}
        className="btn-primary w-full text-lg"
      >
        {settling ? 'Settling…' : 'Mark as Settled'}
      </button>

      <p className="text-xs text-center text-stone-400 pb-2">
        Archives this period and starts a fresh cycle
      </p>
    </div>
  )
}
