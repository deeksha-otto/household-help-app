import { supabase } from '../lib/supabase'

export function getDaysInMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function formatCurrency(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN')
}

export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getWeekdayName(dateStr) {
  return WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()]
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export async function getCurrentPeriod(workerId) {
  const { data } = await supabase
    .from('settlements')
    .select('period_end')
    .eq('worker_id', workerId)
    .order('period_end', { ascending: false })
    .limit(1)

  const today = todayStr()

  if (data && data.length > 0) {
    const lastEnd = new Date(data[0].period_end + 'T00:00:00')
    lastEnd.setDate(lastEnd.getDate() + 1)
    const start = lastEnd.toISOString().split('T')[0]
    return { periodStart: start, periodEnd: today }
  }

  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  return { periodStart: start, periodEnd: today }
}

// Returns days in chronological order (oldest first)
export function buildCalendarDays(periodStart, periodEnd, weeklyOffDay, attendanceRecords) {
  const attendanceMap = {}
  attendanceRecords.forEach(a => {
    attendanceMap[a.date] = a
  })

  const days = []
  const current = new Date(periodStart + 'T00:00:00')
  const end = new Date(periodEnd + 'T00:00:00')

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    const dayName = WEEKDAYS[current.getDay()]
    const isWeeklyOffDay = dayName === weeklyOffDay

    if (attendanceMap[dateStr]) {
      days.push({
        date: dateStr,
        dayName,
        status: attendanceMap[dateStr].status,
        id: attendanceMap[dateStr].id,
        isAutoWeeklyOff: false,
      })
    } else if (isWeeklyOffDay) {
      days.push({
        date: dateStr,
        dayName,
        status: 'weekly_off',
        id: null,
        isAutoWeeklyOff: true,
      })
    } else {
      days.push({
        date: dateStr,
        dayName,
        status: null,
        id: null,
        isAutoWeeklyOff: false,
      })
    }

    current.setDate(current.getDate() + 1)
  }

  return days
}

export function computeSummary(worker, calendarDays, payments) {
  const periodStart = calendarDays.length > 0 ? calendarDays[0].date : todayStr()
  const daysInMonth = getDaysInMonth(periodStart)
  const perDayRate = parseFloat(worker.monthly_salary) / daysInMonth

  const counts = { present: 0, absent: 0, half_day: 0, paid_leave: 0, weekly_off: 0 }
  let deductionTotal = 0
  let paidLeavesUsed = 0
  let extraPaidLeaves = 0

  calendarDays.forEach(day => {
    if (!day.status) return

    switch (day.status) {
      case 'present':
        counts.present++
        break
      case 'weekly_off':
        counts.weekly_off++
        break
      case 'absent':
        counts.absent++
        deductionTotal += perDayRate
        break
      case 'half_day':
        counts.half_day++
        deductionTotal += perDayRate / 2
        break
      case 'paid_leave':
        paidLeavesUsed++
        counts.paid_leave++
        if (paidLeavesUsed > (worker.allowed_paid_leaves || 0)) {
          extraPaidLeaves++
          deductionTotal += perDayRate
        }
        break
    }
  })

  const totalAdvances = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
  const grossSalary = parseFloat(worker.monthly_salary)
  const finalAmountDue = grossSalary - deductionTotal - totalAdvances

  return {
    counts,
    perDayRate,
    deductionTotal,
    totalAdvances,
    grossSalary,
    finalAmountDue,
    extraPaidLeaves,
    paidLeavesUsed,
  }
}

export function roleLabel(worker) {
  if (worker.role === 'custom') return worker.custom_role_label || 'Custom'
  const labels = {
    cook: 'Cook',
    maid: 'Maid',
    car_washer: 'Car Washer',
    newspaper: 'Newspaper',
    milk: 'Milk Delivery',
    gardener: 'Gardener',
    nanny: 'Nanny',
  }
  return labels[worker.role] || worker.role
}

export function roleIcon(role) {
  const icons = {
    cook: '🍳',
    maid: '🧹',
    car_washer: '🚗',
    newspaper: '📰',
    milk: '🥛',
    gardener: '🌱',
    nanny: '👶',
    custom: '👤',
  }
  return icons[role] || '👤'
}

export const STATUS_META = {
  present:     { label: 'Present',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300',  dot: 'bg-green-500'  },
  absent:      { label: 'Absent',      color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',    dot: 'bg-red-500'    },
  half_day:    { label: 'Half Day',    color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300',  dot: 'bg-amber-500'  },
  paid_leave:  { label: 'Paid Leave',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',   dot: 'bg-blue-500'   },
  weekly_off:  { label: 'Weekly Off',  color: 'text-stone-500',  bg: 'bg-stone-50',  border: 'border-stone-200',  dot: 'bg-stone-400'  },
}
