import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ROLES = [
  { value: 'cook',       label: 'Cook',        icon: '🍳' },
  { value: 'maid',       label: 'Maid',        icon: '🧹' },
  { value: 'car_washer', label: 'Car Washer',  icon: '🚗' },
  { value: 'newspaper',  label: 'Newspaper',   icon: '📰' },
  { value: 'milk',       label: 'Milk',        icon: '🥛' },
  { value: 'gardener',   label: 'Gardener',    icon: '🌱' },
  { value: 'nanny',      label: 'Nanny',       icon: '👶' },
  { value: 'custom',     label: 'Custom',      icon: '✏️' },
]

const DAYS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
]

const DEFAULT_FORM = {
  name: '',
  role: 'maid',
  custom_role_label: '',
  monthly_salary: '',
  weekly_off_day: 'Sunday',
  allowed_paid_leaves: '0',
}

export default function AddEditWorker() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => { if (isEdit) loadWorker() }, [id])

  async function loadWorker() {
    const { data } = await supabase.from('workers').select('*').eq('id', id).single()
    if (data) {
      setForm({
        name: data.name,
        role: data.role,
        custom_role_label: data.custom_role_label || '',
        monthly_salary: String(data.monthly_salary),
        weekly_off_day: data.weekly_off_day,
        allowed_paid_leaves: String(data.allowed_paid_leaves),
      })
    }
    setFetching(false)
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim())                                  { setError('Name is required'); return }
    if (!form.monthly_salary || isNaN(Number(form.monthly_salary))) { setError('Enter a valid salary'); return }
    if (form.role === 'custom' && !form.custom_role_label.trim())   { setError('Enter a custom role name'); return }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('employers').upsert({ id: user.id }, { onConflict: 'id' })

    const payload = {
      name: form.name.trim(),
      role: form.role,
      custom_role_label: form.role === 'custom' ? form.custom_role_label.trim() : null,
      monthly_salary: Number(form.monthly_salary),
      weekly_off_day: form.weekly_off_day,
      allowed_paid_leaves: Number(form.allowed_paid_leaves) || 0,
      employer_id: user.id,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('workers').update(payload).eq('id', id))
    } else {
      ;({ error } = await supabase.from('workers').insert(payload))
    }

    setLoading(false)
    if (error) { setError(error.message) } else { navigate('/') }
  }

  async function handleDeactivate() {
    if (!window.confirm(`Remove ${form.name} from your worker list?`)) return
    await supabase.from('workers').update({ is_active: false }).eq('id', id)
    navigate('/')
  }

  if (fetching) {
    return <div className="flex items-center justify-center min-h-dvh text-stone-400">Loading…</div>
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#f5f4f0' }}>

      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-stone-100 text-stone-600 text-xl"
          >
            ←
          </button>
          <h1 className="font-bold text-stone-800 text-xl flex-1">
            {isEdit ? 'Edit Worker' : 'Add Worker'}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSave} className="flex-1 p-4 space-y-5 pb-10">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-2xl">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <label className="section-label block mb-3">Worker Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className="input-field text-lg font-semibold"
            placeholder="e.g. Sunita Devi"
            required
          />
        </div>

        {/* Role grid */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <label className="section-label block mb-3">Role</label>
          <div className="grid grid-cols-4 gap-2">
            {ROLES.map(r => {
              const isActive = form.role === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => update('role', r.value)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-stone-100 bg-stone-50 active:bg-stone-100'
                  }`}
                >
                  <span className="text-2xl leading-none">{r.icon}</span>
                  <span className={`text-xs font-semibold leading-tight text-center ${isActive ? 'text-teal-700' : 'text-stone-500'}`}>
                    {r.label}
                  </span>
                </button>
              )
            })}
          </div>

          {form.role === 'custom' && (
            <div className="mt-4">
              <label className="section-label block mb-2">Custom Role Name</label>
              <input
                type="text"
                value={form.custom_role_label}
                onChange={e => update('custom_role_label', e.target.value)}
                className="input-field"
                placeholder="e.g. Watchman"
              />
            </div>
          )}
        </div>

        {/* Salary + leaves */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
          <div>
            <label className="section-label block mb-3">Monthly Salary</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg font-semibold">₹</span>
              <input
                type="number"
                value={form.monthly_salary}
                onChange={e => update('monthly_salary', e.target.value)}
                className="input-field pl-9 text-lg font-bold"
                placeholder="0"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="section-label block mb-3">
              Allowed Paid Leaves / Month
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update('allowed_paid_leaves', String(Math.max(0, Number(form.allowed_paid_leaves) - 1)))}
                className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 text-2xl font-bold flex items-center justify-center active:bg-stone-200"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-stone-800">{form.allowed_paid_leaves}</span>
                <p className="text-xs text-stone-400 mt-0.5">days</p>
              </div>
              <button
                type="button"
                onClick={() => update('allowed_paid_leaves', String(Number(form.allowed_paid_leaves) + 1))}
                className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 text-2xl font-bold flex items-center justify-center active:bg-stone-200"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Weekly off — day pills */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <label className="section-label block mb-3">Weekly Off Day</label>
          <div className="flex gap-2 justify-between">
            {DAYS.map(d => {
              const isActive = form.weekly_off_day === d.full
              return (
                <button
                  key={d.full}
                  type="button"
                  onClick={() => update('weekly_off_day', d.full)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-stone-50 text-stone-500 border-stone-100 active:bg-stone-100'
                  }`}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Worker'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDeactivate}
            className="w-full py-4 rounded-2xl text-base font-semibold text-red-500 border-2 border-red-100 bg-red-50 active:bg-red-100"
          >
            Remove Worker
          </button>
        )}
      </form>
    </div>
  )
}
