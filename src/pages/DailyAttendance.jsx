import { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  getCurrentPeriod,
  buildCalendarDays,
  getWeekdayName,
  formatDate,
  formatShortDate,
  todayStr,
  STATUS_META,
  isDateScheduled,
} from '../utils/salary.js'

const ATT_BUTTONS = [
  { status: 'present',    label: 'Present',    icon: '✅', activeClass: 'bg-green-500 border-green-500 text-white', idleClass: 'bg-green-50 border-green-300 text-green-700 active:bg-green-100' },
  { status: 'absent',     label: 'Absent',     icon: '❌', activeClass: 'bg-red-500 border-red-500 text-white',    idleClass: 'bg-red-50 border-red-300 text-red-700 active:bg-red-100' },
  { status: 'half_day',   label: 'Half Day',   icon: '🌓', activeClass: 'bg-amber-500 border-amber-500 text-white',idleClass: 'bg-amber-50 border-amber-300 text-amber-700 active:bg-amber-100' },
  { status: 'paid_leave', label: 'Paid Leave', icon: '📋', activeClass: 'bg-blue-500 border-blue-500 text-white',  idleClass: 'bg-blue-50 border-blue-300 text-blue-700 active:bg-blue-100' },
]

export default function DailyAttendance() {
  const { worker } = useOutletContext()
  const [calendarDays, setCalendarDays] = useState([])
  const [period, setPeriod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [justMarked, setJustMarked] = useState(null)
  const [showPaidLeaveWarning, setShowPaidLeaveWarning] = useState(false)
  const [editingDate, setEditingDate] = useState(null)
  const [showPastDays, setShowPastDays] = useState(false)

  const today = todayStr()
  const freq  = worker?.attendance_frequency || 'daily'

  // Is today scheduled for this worker at all?
  const todayIsScheduled = worker ? isDateScheduled(today, worker) : true
  // Weekly off only applies to daily-frequency workers
  const todayIsWeeklyOff = freq === 'daily' && worker ? getWeekdayName(today) === worker.weekly_off_day : false

  const loadData = useCallback(async (showSpinner = true) => {
    if (!worker) return
    if (showSpinner) setLoading(true)
    const p = await getCurrentPeriod(worker.id)
    setPeriod(p)
    const { data: records } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', worker.id)
      .gte('date', p.periodStart)
      .lte('date', p.periodEnd)
    setCalendarDays(buildCalendarDays(p.periodStart, p.periodEnd, worker, records || []))
    if (showSpinner) setLoading(false)
  }, [worker])

  useEffect(() => { loadData() }, [loadData])

  const todayDay = calendarDays.find(d => d.date === today)
  const pastDays = [...calendarDays].reverse().filter(d => d.date !== today)

  const paidLeavesUsedExcludingToday = calendarDays.filter(
    d => d.date !== today && d.status === 'paid_leave'
  ).length
  const paidLeaveWouldExceed =
    worker && paidLeavesUsedExcludingToday >= (worker.allowed_paid_leaves ?? 0)

  async function markAttendance(date, status) {
    setSaving(status)
    const { error } = await supabase
      .from('attendance')
      .upsert({ worker_id: worker.id, date, status }, { onConflict: 'worker_id,date' })
    if (!error) {
      await loadData(false)
      if (date === today) {
        setJustMarked(status)
        setTimeout(() => setJustMarked(null), 2000)
      }
      setEditingDate(null)
      setShowPaidLeaveWarning(false)
    }
    setSaving(null)
  }

  function handleTodayButton(status) {
    if (status === 'paid_leave' && paidLeaveWouldExceed) {
      setShowPaidLeaveWarning(true)
      return
    }
    markAttendance(today, status)
  }

  if (loading || !worker) {
    return <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>
  }

  const todayStatus = todayDay?.status ?? null
  const todayMeta   = todayStatus ? STATUS_META[todayStatus] : null

  // ── Paid-leave warning overlay ────────────────────────────────────────────
  if (showPaidLeaveWarning) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Today · {getWeekdayName(today)}, {formatDate(today)}</p>
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-orange-800 text-base">Paid leave limit reached</p>
                <p className="text-orange-700 text-sm mt-1 leading-relaxed">
                  {worker.name} has already used all{' '}
                  <span className="font-bold">{worker.allowed_paid_leaves} paid leave{worker.allowed_paid_leaves !== 1 ? 's' : ''}</span>{' '}
                  this period. Marking today as Paid Leave will deduct it from salary — same as Absent.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => markAttendance(today, 'paid_leave')}
              disabled={saving !== null}
              className="w-full py-4 rounded-2xl font-bold text-base bg-orange-100 text-orange-800 border-2 border-orange-300 active:bg-orange-200 disabled:opacity-50"
            >
              Mark Paid Leave anyway (will be deducted)
            </button>
            <button
              onClick={() => setShowPaidLeaveWarning(false)}
              className="w-full py-4 rounded-2xl font-semibold text-base bg-stone-100 text-stone-600 active:bg-stone-200"
            >
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
          {/* Not scheduled — specific_days or alternate_days workers on their off days */}
          {!todayIsScheduled ? (
            <div className="bg-stone-50 rounded-2xl p-6 text-center border border-stone-100">
              <span className="text-4xl">🗓️</span>
              <p className="font-bold text-stone-600 text-lg mt-2">Not Scheduled Today</p>
              <p className="text-stone-400 text-sm mt-1">
                {freq === 'specific_days'
                  ? `Scheduled on ${(worker.scheduled_days || []).join(', ')}`
                  : 'Comes every other day — not scheduled today'}
              </p>
            </div>

          ) : todayIsWeeklyOff ? (
            /* Weekly off — Daily-frequency workers */
            <div className="bg-stone-50 rounded-2xl p-6 text-center border border-stone-100">
              <span className="text-4xl">😴</span>
              <p className="font-bold text-stone-600 text-lg mt-2">Weekly Off</p>
              <p className="text-stone-400 text-sm mt-1">No attendance needed today</p>
            </div>

          ) : todayStatus && justMarked === null ? (
            /* Already marked */
            <div>
              <div className={`${todayMeta.bg} rounded-2xl p-5 flex items-center gap-4 border ${todayMeta.border}`}>
                <span className="text-4xl">{ATT_BUTTONS.find(b => b.status === todayStatus)?.icon}</span>
                <div>
                  <p className={`text-xl font-bold ${todayMeta.color}`}>{todayMeta.label}</p>
                  <p className="text-stone-400 text-sm mt-0.5">Marked for today</p>
                </div>
              </div>
              <button
                onClick={() => setJustMarked('__edit__')}
                className="mt-3 w-full py-3 rounded-xl text-sm font-semibold text-stone-500 bg-stone-50 border border-stone-100 active:bg-stone-100"
              >
                Change attendance
              </button>
            </div>

          ) : justMarked && justMarked !== '__edit__' ? (
            /* Brief success flash */
            <div className="bg-teal-50 rounded-2xl p-6 text-center border border-teal-200">
              <span className="text-4xl">✅</span>
              <p className="font-bold text-teal-700 text-lg mt-2">{STATUS_META[justMarked]?.label} saved!</p>
              <p className="text-teal-500 text-sm mt-0.5">Attendance recorded for today</p>
            </div>

          ) : (
            /* 4 big buttons */
            <div>
              <p className="text-sm font-semibold text-stone-500 mb-4 text-center">
                {justMarked === '__edit__' ? 'Change to:' : 'Mark attendance for today'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ATT_BUTTONS.map(btn => {
                  const isSaving = saving === btn.status
                  return (
                    <button
                      key={btn.status}
                      onClick={() => handleTodayButton(btn.status)}
                      disabled={saving !== null}
                      className={`border-2 rounded-2xl py-6 flex flex-col items-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                        isSaving ? btn.activeClass : btn.idleClass
                      }`}
                    >
                      <span className="text-3xl leading-none">{btn.icon}</span>
                      {btn.label}
                    </button>
                  )
                })}
              </div>
              {justMarked === '__edit__' && (
                <button
                  onClick={() => setJustMarked(null)}
                  className="mt-3 w-full py-2 text-sm text-stone-400 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Past days (collapsible) ──────────────────────────────────── */}
      {pastDays.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPastDays(p => !p)}
            className="w-full px-5 py-4 flex items-center justify-between text-left active:bg-stone-50"
          >
            <div>
              <p className="font-bold text-stone-700 text-sm">Past days this period</p>
              {period && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
                </p>
              )}
            </div>
            <span className="text-stone-400 text-sm font-medium">
              {showPastDays ? '▲ Hide' : `▼ Show ${pastDays.length} days`}
            </span>
          </button>

          {showPastDays && (
            <div className="border-t border-stone-50">
              {pastDays.map((day, idx) => {
                const meta          = day.status && day.status !== 'not_scheduled' ? STATUS_META[day.status] : null
                const isEditingThis = editingDate === day.date
                const isNotScheduled = day.status === 'not_scheduled'

                return (
                  <div key={day.date}>
                    {idx > 0 && <div className="border-t border-stone-50 mx-4" />}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold text-sm ${isNotScheduled ? 'text-stone-400' : 'text-stone-700'}`}>
                            {formatShortDate(day.date)}
                          </p>
                          <p className="text-xs text-stone-400">{day.dayName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isNotScheduled ? (
                            <span className="text-xs font-semibold text-stone-300 px-3 py-1 rounded-full bg-stone-50 border border-stone-100">
                              Not scheduled
                            </span>
                          ) : meta ? (
                            <>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                                {meta.label}{day.isAutoWeeklyOff ? ' (auto)' : ''}
                              </span>
                              {!day.isAutoWeeklyOff && (
                                <button
                                  onClick={() => setEditingDate(isEditingThis ? null : day.date)}
                                  className="text-xs font-semibold text-stone-400 underline"
                                >
                                  {isEditingThis ? 'Close' : 'Edit'}
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingDate(isEditingThis ? null : day.date)}
                              className="text-xs font-bold text-teal-600 px-3 py-1 rounded-full bg-teal-50"
                            >
                              Mark
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditingThis && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {ATT_BUTTONS.map(btn => (
                            <button
                              key={btn.status}
                              onClick={() => markAttendance(day.date, btn.status)}
                              disabled={saving !== null}
                              className={`border-2 rounded-xl py-2.5 flex flex-col items-center gap-1 text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform ${btn.idleClass}`}
                            >
                              <span className="text-base">{btn.icon}</span>
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
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
