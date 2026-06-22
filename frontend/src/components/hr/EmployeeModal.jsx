import { useState } from 'react'
import { createEmployee, updateEmployee } from '../../api/client'

const STATUS_OPTIONS = [
  { value: 'active',     label: 'Actif' },
  { value: 'on_leave',   label: 'En congé' },
  { value: 'suspended',  label: 'Suspendu' },
  { value: 'terminated', label: 'Résilié' },
]

const GENDER_OPTIONS = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function cleanTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

function Field({ name, label, type = 'text', required = false, form, errors, onChange }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => onChange(name, e.target.value)}
        className={`input ${errors[name] ? 'border-red-400 focus:ring-red-400' : ''}`}
      />
      {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
    </div>
  )
}

export default function EmployeeModal({ employee, departments, onClose, onSaved }) {
  const isEdit = !!employee
  const [form, setForm] = useState({
    employee_number: employee?.employee_number ?? '',
    first_name: employee?.first_name ?? '',
    last_name: employee?.last_name ?? '',
    cin: employee?.cin ?? '',
    date_of_birth: employee?.date_of_birth ?? '',
    gender: employee?.gender ?? '',
    phone_number: employee?.phone_number ?? '',
    email: employee?.email ?? '',
    address: employee?.address ?? '',
    emergency_contact: employee?.emergency_contact ?? '',
    hire_date: employee?.hire_date ?? today(),
    shift_start: cleanTime(employee?.shift_start),
    shift_end: cleanTime(employee?.shift_end),
    position: employee?.position ?? '',
    department: employee?.department ?? '',
    status: employee?.status ?? 'active',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function validate() {
    const errs = {}
    if (!form.employee_number.trim()) errs.employee_number = 'Champ obligatoire.'
    if (!form.first_name.trim()) errs.first_name = 'Champ obligatoire.'
    if (!form.last_name.trim()) errs.last_name = 'Champ obligatoire.'
    if (!form.cin.trim()) errs.cin = 'Champ obligatoire.'
    if (!form.hire_date) errs.hire_date = 'Champ obligatoire.'
    if (!form.position.trim()) errs.position = 'Champ obligatoire.'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Adresse e-mail invalide.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.department) payload.department = null
      if (!payload.date_of_birth) payload.date_of_birth = null
      if (!payload.gender) payload.gender = ''
      if (!payload.shift_start) payload.shift_start = null
      if (!payload.shift_end) payload.shift_end = null

      if (isEdit) await updateEmployee(employee.id, payload)
      else await createEmployee(payload)

      onSaved()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') setErrors(data)
      else setErrors({ __all__: 'Une erreur est survenue.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-semibold text-slate-800 text-lg">
            {isEdit ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            {errors.__all__ && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {errors.__all__}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identification</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field name="employee_number" label="Matricule" required form={form} errors={errors} onChange={set} />
                <Field name="cin" label="CIN / N° National" required form={form} errors={errors} onChange={set} />
                <Field name="first_name" label="Prénom" required form={form} errors={errors} onChange={set} />
                <Field name="last_name" label="Nom" required form={form} errors={errors} onChange={set} />
                <Field name="date_of_birth" label="Date de naissance" type="date" form={form} errors={errors} onChange={set} />
                <div>
                  <label className="label">Genre</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="input">
                    <option value="">– Choisir –</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field name="phone_number" label="Téléphone" type="tel" form={form} errors={errors} onChange={set} />
                <Field name="email" label="E-mail" type="email" form={form} errors={errors} onChange={set} />
                <div className="sm:col-span-2">
                  <label className="label">Adresse</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    rows={2}
                    className="input resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field name="emergency_contact" label="Contact d'urgence" form={form} errors={errors} onChange={set} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Emploi</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field name="hire_date" label="Date d'embauche" type="date" required form={form} errors={errors} onChange={set} />
                <Field name="position" label="Poste / Titre" required form={form} errors={errors} onChange={set} />
                <Field name="shift_start" label="Début shift" type="time" form={form} errors={errors} onChange={set} />
                <Field name="shift_end" label="Fin shift" type="time" form={form} errors={errors} onChange={set} />

                <div>
                  <label className="label">Département</label>
                  <select value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} className="input">
                    <option value="">– Sans département –</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {errors.department && <p className="text-xs text-red-600 mt-1">{errors.department}</p>}
                </div>

                <div>
                  <label className="label">Statut</label>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}