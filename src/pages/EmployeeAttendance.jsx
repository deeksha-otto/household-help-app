import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  getCurrentPeriod, buildCalendarDays, countExpectedWorkingDays,
  getWeekdayName, formatDate, formatShortDate, formatCurrency,
  todayStr, STATUS_META, isDateScheduled,
} from '../utils/salary.js'

const ATT_BUTTONS = [
  { status: 'present',    label: 'Present',    icon: '✅', activeClass: 'bg-green-500 border-green-500 text-white', idleClass: 'bg-green-50 border-green-300 text-green-700 active:bg-green-100' },
  { status: 'absent',     label: 'Absent',     icon: '❌', activeClass: 'bg-red-500 border-red-500 text-white',    idleClass: 'bg-red-50 border-red-300 text-red-700 active:bg-red-100' },
  { status: 'half_day',   label: 'Half Day',   icon: '🌓', activeClass: 'bg-amber-500 border-amber-500 text-white',idleClass: 'bg-amber-50 border-amber-300 text-amber-700 active:bg-amber-100' },
  { status: 'paid_leave', label: 'Paid Leave', icon: '📋', activeClass: 'bg-blue-500 border-blue-500 text-white',  idleClass: 'bg-blue-50 border-blue-300 text-blue-700 active:bg-blue-100' },
]

export default function EmployeeAttendance() {
  const { workerRecord } = useAuth()
  const worker = workerRecord

  const [calendarDays, setCalendarDays] = useState([])
  const [period, setPeriod]             = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(null)
  const [justMarked, setJustMarked]     = useState(null)
  const [leavePreview, setLeavePreview] = useState(false)
  const [showPastDays, setShowPastDays] = useState(false)

  const today = todayStr()

  const loadData = useCallback(async (showSpinner = true) => {
    if (!worker) return
    if (showSpinner) setLoading(true)
    const p = await getCurrentPeriod(worker.id)
    setPeriod(p)
    const { data: records } = await supabase
      .from('attendance').select('*')
      .eq('worker_id', worker.id)
      .gte('date', p.periodStart).lte('date', p.periodEnd)
    setCalendarDays(buildCalendarDays(p.periodStart, p.periodEnd, worker, records || []))
    if (showSpinner) setLoading(false)
  }, [worker])

  useEffect(() => { loadData() }, [loadData])

  if (loading || !worker) return <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>

  const freq             = worker.attendance_frequency || 'daily'
  const todayIsScheduled = isDateScheduled(today, worker)
  const todayIsWeeklyOff = freq === 'daily' && getWeekdayName(today) === (worker.weekly_off_day || 'Sunday')
  const todayDay         = calendarDays.find(d => d.date === today)
  const pastDays         = [...calendarDays].reverse().filter(d => d.date !== today)
  const todayStatus      = todayDay?.status ?? null
  const todayApproval    = todayDay?.approval_status ?? null
  const todayMeta        = todayStatus ? STATUS_META[todayStatus] : null

  // Leave impact for preview
  const approvedPaidLeaves = calendarDays.filter(
    d => d.date !== today && d.status === 'paid_leave' && d.approval_status === 'approved'
  ).length
  const allowed    = worker.allowed_paid_leaves ?? 0
  const wouldExceed = approvedPaidLeaves >= allowed
  const expectedDays = period ? countExpectedWorkingDays(period.periodStart, period.periodEnd, worker) : 26
  const perDayRate   = parseFloat(worker.monthly_salary) / Math.max(expectedDays, 1)

  async function submit(status) {
    setSaving(status)
    await supabase.from('attendance').upsert({
      worker_id: worker.id, date: today, status,
      submitted_by: 'employee', approval_status: 'pending',
    }, { onConflict: 'worker_id,date' })
    await loadData(false)
    setJustMarked(status)
    setTimeout(() => setJustMarked(null), 2500)
    setLeavePreview(false)
    setSaving(null)
  }

  function handleButton(status) {
    if (status === 'paid_leave') { setLeavePreview(true); return }
    submit(status)
  }

  // ── Leave impact preview ─────────────────────────────────────────────
  if (leavePreview) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="section-label block mb-4">Paid Leave — Impact</p>
          <div className={`rounded-2xl p-4 border-2 ${wouldExceed ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`font-bold text-base ${wouldExceed ? 'text-orange-800' : 'text-blue-800'}`}>
              {wouldExceed ? '⚠️ Will be deducted' : '✅ Paid leave'}
            </p>
            <p className={`text-sm mt-2 leading-relaxed ${wouldExceed ? 'text-orange-700' : 'text-blue-700'}`}>
              {wouldExceed
                ? `You've used all ${allowed} allowed paid leave${allowed !== 1 ? 's' : ''} this period. This will be treated as unpaid — estimated deduction: ${formatCurrency(perDayRate)}.`
                : `This will bring your paid leaves to ${approvedPaidLeaves + 1} / ${allowed} allowed this period. Fully paid.`}
            </p>
          </div>
          <p className="text-xs text-stone-400 mt-3">Your request goes to your employer for approval.</p>
          <div className="mt-4 space-y-3">
            <button onClick={() => submit('paid_leave')} disabled={saving !== null}
              className="w-full py-4 rounded-2xl font-bold text-base bg-blue-100 text-blue-800 border-2 border-blue-300 active:bg-blue-200 disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit Leave Request'}
            </button>
            <button onClick={() => setLeavePreview(false)}
              className="w-full py-4 rounded-2xl font-semibold text-base bg-stone-100 text-stone-600 active:bg-stone-200">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Today card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-stone-50">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Today</p>
          <p className="text-2xl font-bold text-stone-800 mt-0.5">{formatDate(today)}</p>
          <p className="text-stone-400 text-sm">{getWeekdayName(today)}</p>
        </div>

        <div className="p-4">
          {!todayIsScheduled ? (
            <div className="bg-stone-50 rounded-2xl p-6 text-center border border-stone-100">
              <span className="text-4xl">🗓️</span>
              <p className="font-bold text-stone-600 text-lg mt-2">Not Scheduled Today</p>
            </div>

          ) : todayIsWeeklyOff ? (
            <div className="bg-stone-50 rounded-2xl p-6 text-center border border-stone-100">
              <span className="text-4xl">😴</span>
              <p className="font-bold text-stone-600 text-lg mt-2">Weekly Off</p>
              <p className="text-stone-400 text-sm mt-1">No attendance needed today</p>
            </div>

          ) : todayStatus && justMarked === null ? (
            <div>
              <div className={`rounded-2xl p-5 flex items-center gap-4 border-2 ${
                todayApproval === 'pending'  ? 'bg-amber-50 border-amber-200' :
                todayApproval === 'rejected' ? 'bg-red-50 border-red-200' :
                `${todayMeta?.bg} ${todayMeta?.border}`
              }`}>
                <span className="text-4xl">{ATT_BUTTONS.find(b => b.status === todayStatus)?.icon}</span>
                <div>
                  <p className={`text-xl font-bold ${
                    todayApproval === 'pending'  ? 'text-amber-700' :
                    todayApproval === 'rejected' ? 'text-red-600'   :
                    todayMeta?.color
                  }`}>{todayMeta?.label}</p>
                  <p className="text-stone-400 text-sm mt-0.5">
                    {todayApproval === 'pending'  ? 'Submitted — awaiting employer approval' :
                     todayApproval === 'rejected' ? 'Rejected by employer' : 'Approved'}
                  </p>
                </div>
              </div>
              {todayApproval === 'rejected' && (
                <button onClick={() => setJustMarked('__edit__')}
                  className="mt-3 w-full py-3 rounded-xl text-sm font-semibold text-stone-500 bg-stone-50 border border-stone-100 active:bg-stone-100">
                  Resubmit attendance
                </button>
              )}
            </div>

          ) : justMarked && justMarked !== '__edit__' ? (
            <div className="bg-teal-50 rounded-2xl p-6 text-center border border-teal-200">
              <span className="text-4xl">✅</span>
              <p className="font-bold text-teal-700 text-lg mt-2">{STATUS_META[justMarked]?.label} submitted!</p>
              <p className="text-teal-500 text-sm mt-0.5">Waiting for your employer to approve</p>
            </div>

          ) : (
            <div>
              <p className="text-sm font-semibold text-stone-500 mb-4 text-center">
                {justMarked === '__edit__' ? 'Resubmit as:' : 'Mark attendance for today'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ATT_BUTTONS.map(btn => (
                  <button key={btn.status} onClick={() => handleButton(btn.status)} disabled={saving !== null}
                    className={`border-2 rounded-2xl py-6 flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                      saving === btn.status ? btn.activeClass : btn.idleClass
                    }`}>
                    <span className="text-3xl leading-none">{btn.icon}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
              {justMarked === '__edit__' && (
                <button onClick={() => setJustMarked(null)} className="mt-3 w-full py-2 text-sm text-stone-400 font-medium">
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Past days ───────────────────────────────────────────────── */}
      {pastDays.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setShowPastDays(p => !p)}
            className="w-full px-5 py-4 flex items-center justify-between text-left active:bg-stone-50">
            <div>
              <p className="font-bold text-stone-700 text-sm">Past days this period</p>
              {period && <p className="text-xs text-stone-400 mt-0.5">{formatDate(period.periodStart)} – {formatDate(today)}</p>}
            </div>
            <span className="text-stone-400 text-sm font-medium">
              {showPastDays ? '▲ Hide' : `▼ Show ${pastDays.length} days`}
            </span>
          </button>
          {showPastDays && (
            <div className="border-t border-stone-50">
              {pastDays.map((day, idx) => {
                const meta = day.status && day.status !== 'not_scheduled' ? STATUS_META[day.status] : null
                return (
                  <div key={day.date}>
                    {idx > 0 && <div className="border-t border-stone-50 mx-4" />}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-stone-700">{formatShortDate(day.date)}</p>
                        <p className="text-xs text-stone-400">{day.dayName}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {meta ? (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                        ) : day.status === 'not_scheduled' ? (
                          <span className="text-xs font-semibold text-stone-300 px-3 py-1 rounded-full bg-stone-50">Not scheduled</span>
                        ) : (
                          <span className="text-xs text-stone-300">Not marked</span>
                        )}
                        {day.approval_status === 'pending' && (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Pending</span>
                        )}
                        {day.approval_status === 'rejected' && (
                          <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Rejected</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
