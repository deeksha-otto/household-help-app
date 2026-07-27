import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentPeriod, formatDate, formatCurrency, todayStr } from '../utils/salary.js'

export default function LogPayment() {
  const { worker } = useOutletContext()
  const [payments, setPayments] = useState([])
  const [period, setPeriod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ amount: '', date: todayStr(), note: '' })

  useEffect(() => {
    if (worker) loadData()
  }, [worker])

  async function loadData() {
    setLoading(true)
    const p = await getCurrentPeriod(worker.id)
    setPeriod(p)
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('worker_id', worker.id)
      .gte('date', p.periodStart)
      .lte('date', p.periodEnd)
      .order('date', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSaving(true)
    setError('')
    const { error: insertError } = await supabase.from('payments').insert({
      worker_id: worker.id,
      amount: Number(form.amount),
      date: form.date,
      note: form.note.trim() || null,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setForm({ amount: '', date: todayStr(), note: '' })
      await loadData()
    }
    setSaving(false)
  }

  async function handleDelete(paymentId) {
    if (!window.confirm('Delete this payment?')) return
    await supabase.from('payments').delete().eq('id', paymentId)
    await loadData()
  }

  const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0)

  if (loading || !worker) {
    return <div className="flex items-center justify-center py-24 text-stone-400">Loading…</div>
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Running total card ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">
          Advances paid this period
        </p>
        {period && (
          <p className="text-xs text-stone-400 mb-3">
            {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
          </p>
        )}
        <p className="text-4xl font-bold text-stone-800 tracking-tight">
          {formatCurrency(total)}
        </p>
        {payments.length > 0 && (
          <p className="text-sm text-stone-400 mt-1">
            across {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Log payment form ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
          Log a payment
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Amount — big field */}
          <div>
            <label className="section-label block mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-2xl font-semibold pointer-events-none">₹</span>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="input-field pl-10 text-3xl font-bold h-16"
                placeholder="0"
                min="1"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="section-label block mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input-field"
            />
          </div>

          {/* Note */}
          <div>
            <label className="section-label block mb-2">Note <span className="normal-case font-normal text-stone-300">(optional)</span></label>
            <input
              type="text"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="input-field"
              placeholder="e.g. Diwali advance"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? 'Saving…' : 'Log Payment'}
          </button>
        </form>
      </div>

      {/* ── Payment list ─────────────────────────────────────────────── */}
      {payments.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-50">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
              Payment history
            </p>
          </div>
          {payments.map((payment, idx) => (
            <div key={payment.id}>
              {idx > 0 && <div className="border-t border-stone-50 mx-4" />}
              <div className="px-4 py-3.5 flex items-center gap-3">
                {/* Icon bubble */}
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg leading-none">💸</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-base">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {formatDate(payment.date)}
                    {payment.note && (
                      <span className="ml-1.5 text-stone-500">· {payment.note}</span>
                    )}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(payment.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-stone-300 active:bg-red-50 active:text-red-400 transition-colors"
                  aria-label="Delete payment"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-.654l-.753 9.04A1.5 1.5 0 0 1 10.598 14H5.402a1.5 1.5 0 0 1-1.495-1.46L3.154 3.5H2.5a.5.5 0 0 1-.5-.5zM4.156 4l.742 8.92a.5.5 0 0 0 .498.487h5.208a.5.5 0 0 0 .498-.487L11.844 4H4.156z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-3xl mb-3">💳</p>
          <p className="font-semibold text-stone-600 text-sm">No payments logged yet</p>
          <p className="text-xs text-stone-400 mt-1">Advance or partial payments will appear here</p>
        </div>
      )}
    </div>
  )
}
