import { useState } from 'react'
import { createAttendance, updateAttendance } from '../../api/client'

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Présent' },
  { value: 'absent',   label: 'Absent' },
  { value: 'late',     label: 'En retard' },
  { value: 'half_day', label: 'Mi-journée' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function calcWorkedHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return ''
  const [h1, m1] = checkIn.split(':').map(Number)
  const [h2, m2] = checkOut.split(':').map(Number)
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
  return mins > 0 ? (mins / 60).toFixed(2) : ''
}

export default function AttendanceModal({ record, employees, onClose, onSaved }) {
  const isEdit = !!record
  const [form, setForm] = useState({
    employee:       record?.employee ?? '',
    date:           record?.date ?? today(),
    check_in:       record?.check_in ?? '',
    check_out:      record?.check_out ?? '',
    worked_hours:   record?.worked_hours ?? '',
    overtime_hours: record?.overtime_hours ?? '0',
    status:         record?.status ?? 'present',
    notes:          record?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function set(name, value) {
    setForm((f) => {
      const next = { ...f, [name]: value }
      // Auto-compute worked hours when times change
      if (name === 'check_in' || name === 'check_out') {
        const computed = calcWorkedHours(
          name === 'check_in' ? value : next.check_in,
          name === 'check_out' ? value : next.check_out,
        )
        if (computed) next.worked_hours = computed
      }
      return next
    })
  }

  function validate() {
    const errs = {}
    if (!form.employee)   errs.employee = 'Champ obligatoire.'
    if (!form.date)       errs.date     = 'Champ obligatoire.'
    if (form.check_in && form.check_out && form.check_out < form.check_in)
      errs.check_out = 'L\'heure de sortie doit être après l\'entrée.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.check_in)  delete payload.check_in
      if (!payload.check_out) delete payload.check_out
      if (payload.worked_hours === '') payload.worked_hours = 0
      if (payload.overtime_hours === '') payload.overtime_hours = 0

      if (isEdit) {
        await updateAttendance(record.id, payload)
      } else {
        await createAttendance(payload)
      }
      onSaved()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') setErrors(data)
      else setErrors({ __all__: 'Une erreur est survenue.' })
    } finally {
      setSaving(false)
    }
  }

  const autoHours = calcWorkedHours(form.check_in, form.check_out)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-semibold text-slate-800 text-lg">
            {isEdit ? 'Modifier la présence' : 'Saisir une présence'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">
            {errors.__all__ && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {errors.__all__}
              </div>
            )}

            <div>
              <label className="label">Employé <span className="text-red-500">*</span></label>
              <select
                value={form.employee}
                onChange={(e) => set('employee', e.target.value)}
                className={`input ${errors.employee ? 'border-red-400' : ''}`}
              >
                <option value="">– Sélectionner –</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
              {errors.employee && <p className="text-xs text-red-600 mt-1">{errors.employee}</p>}
            </div>

            <div>
              <label className="label">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className={`input ${errors.date ? 'border-red-400' : ''}`}
              />
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
            </div>

            {/* Status selector */}
            <div>
              <label className="label">Statut</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set('status', s.value)}
                    className={`border-2 rounded-lg py-2 px-3 text-sm font-medium text-left transition-all ${
                      form.status === s.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Heure d'entrée</label>
                <input
                  type="time"
                  value={form.check_in}
                  onChange={(e) => set('check_in', e.target.value)}
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="label">Heure de sortie</label>
                <input
                  type="time"
                  value={form.check_out}
                  onChange={(e) => set('check_out', e.target.value)}
                  className={`input font-mono ${errors.check_out ? 'border-red-400' : ''}`}
                />
                {errors.check_out && <p className="text-xs text-red-600 mt-1">{errors.check_out}</p>}
              </div>
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Heures travaillées</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.worked_hours}
                  onChange={(e) => set('worked_hours', e.target.value)}
                  placeholder={autoHours || '0'}
                  className="input font-mono"
                />
                {autoHours && (
                  <p className="text-xs text-slate-400 mt-1">Calculé : {autoHours}h</p>
                )}
              </div>
              <div>
                <label className="label">Heures supplémentaires</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.overtime_hours}
                  onChange={(e) => set('overtime_hours', e.target.value)}
                  className="input font-mono"
                />
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="Observations…"
                className="input resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Saisir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}