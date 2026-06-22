import { useState } from 'react'
import {
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
} from '../../api/client'

const LEAVE_TYPE_OPTIONS = [
  { value: 'paid',        label: 'Congé payé' },
  { value: 'sick',        label: 'Congé maladie' },
  { value: 'unpaid',      label: 'Congé sans solde' },
  { value: 'exceptional', label: 'Congé exceptionnel' },
]

const STATUS_STYLES = {
  pending:   { badge: 'bg-amber-100 text-amber-700',     label: 'En attente' },
  approved:  { badge: 'bg-emerald-100 text-emerald-700', label: 'Approuvé' },
  rejected:  { badge: 'bg-red-100 text-red-700',         label: 'Rejeté' },
  cancelled: { badge: 'bg-slate-100 text-slate-500',     label: 'Annulé' },
}

function daysBetween(start, end) {
  if (!start || !end) return ''
  const diff = (new Date(end) - new Date(start)) / 86400000
  return diff >= 0 ? diff + 1 : ''
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDocumentUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value, window.location.origin)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return value
  }
}

function InfoRow({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
      <p className={`text-sm text-slate-700 font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '–'}
      </p>
    </div>
  )
}

export default function LeaveModal({ leave, employees, onClose, onSaved }) {
  const isView = !!leave && leave !== 'create'
  const isCreate = !leave || leave === 'create'

  const [form, setForm] = useState({
    employee:   leave?.employee ?? '',
    leave_type: leave?.leave_type ?? 'paid',
    start_date: leave?.start_date ?? today(),
    end_date:   leave?.end_date ?? today(),
    reason:     leave?.reason ?? '',
    document:   null,
  })
  const [approvalComment, setApprovalComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(null)
  const [errors, setErrors] = useState({})

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  const computedDays = daysBetween(form.start_date, form.end_date)

  function validate() {
    const errs = {}
    if (!form.employee) errs.employee = 'Champ obligatoire.'
    if (!form.start_date) errs.start_date = 'Champ obligatoire.'
    if (!form.end_date) errs.end_date = 'Champ obligatoire.'
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errs.end_date = 'La date de fin doit être après la date de début.'
    }
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
      const payload = new FormData()
      payload.append('employee', form.employee)
      payload.append('leave_type', form.leave_type)
      payload.append('start_date', form.start_date)
      payload.append('end_date', form.end_date)
      payload.append('reason', form.reason)
      payload.append('number_of_days', computedDays)

      if (form.document) {
        payload.append('document', form.document)
      }

      await createLeaveRequest(payload)
      onSaved()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') setErrors(data)
      else setErrors({ __all__: 'Une erreur est survenue.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(action) {
    setActing(action)
    setErrors({})

    try {
      if (action === 'cancel') {
        await cancelLeaveRequest(leave.id)
      } else if (action === 'approve') {
        await approveLeaveRequest(leave.id, { comment: approvalComment })
      } else if (action === 'reject') {
        await rejectLeaveRequest(leave.id, { comment: approvalComment })
      }

      onSaved()
    } catch {
      setErrors({ __all__: 'L’action a échoué. Veuillez réessayer.' })
    } finally {
      setActing(null)
    }
  }

  const statusInfo = isView ? STATUS_STYLES[leave.status] : null

  const fileUrl = isView
    ? normalizeDocumentUrl(
      leave.document_url ||
      leave.document ||
      leave.attachment_url ||
      leave.attachment ||
      leave.justificatif_url ||
      leave.justificatif ||
      leave.file_url ||
      leave.file ||
      leave.supporting_document_url ||
      leave.supporting_document
    )
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-800 text-lg">
              {isCreate ? 'Nouvelle demande de congé' : 'Demande de congé'}
            </h2>
            {statusInfo && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.badge}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isView ? (
            <div className="p-6 space-y-5">
              {errors.__all__ && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {errors.__all__}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Employé" value={leave.employee_name} />
                <InfoRow label="Type" value={leave.leave_type_display} />
                <InfoRow label="Du" value={leave.start_date} mono />
                <InfoRow label="Au" value={leave.end_date} mono />
                <InfoRow label="Jours" value={`${leave.number_of_days} jour(s)`} />
                <InfoRow label="Demandé le" value={leave.created_at?.slice(0, 10)} mono />
              </div>

              {leave.reason && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Motif</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{leave.reason}</p>
                </div>
              )}

              {fileUrl && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Justificatif</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ouvrir le document
                  </a>
                </div>
              )}

              {leave.approved_by_name && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Décision par</span>
                    <span className="font-medium text-slate-700">{leave.approved_by_name}</span>
                  </div>
                  {leave.approval_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Le</span>
                      <span className="font-mono text-slate-700">{leave.approval_date?.slice(0, 10)}</span>
                    </div>
                  )}
                  {leave.approval_comment && (
                    <div>
                      <p className="text-slate-500 mb-1">Commentaire</p>
                      <p className="text-slate-700 italic">"{leave.approval_comment}"</p>
                    </div>
                  )}
                </div>
              )}

              {leave.status === 'pending' && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Décision</p>
                  <div>
                    <label className="label">Commentaire</label>
                    <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      rows={2}
                      placeholder="Observations…"
                      className="input resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction('approve')}
                      disabled={!!acting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {acting === 'approve' ? 'En cours…' : '✓ Approuver'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('reject')}
                      disabled={!!acting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {acting === 'reject' ? 'En cours…' : '✕ Rejeter'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction('cancel')}
                    disabled={!!acting}
                    className="w-full text-slate-500 hover:text-slate-700 text-sm py-1.5 transition-colors disabled:opacity-60"
                  >
                    Annuler la demande
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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
                  <label className="label">Type de congé</label>
                  <select
                    value={form.leave_type}
                    onChange={(e) => set('leave_type', e.target.value)}
                    className="input"
                  >
                    {LEAVE_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date de début <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => set('start_date', e.target.value)}
                      className={`input ${errors.start_date ? 'border-red-400' : ''}`}
                    />
                    {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date}</p>}
                  </div>
                  <div>
                    <label className="label">Date de fin <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => set('end_date', e.target.value)}
                      className={`input ${errors.end_date ? 'border-red-400' : ''}`}
                    />
                    {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date}</p>}
                  </div>
                </div>

                {computedDays !== '' && (
                  <p className="text-sm text-blue-600 font-medium">
                    Durée calculée : {computedDays} jour(s)
                  </p>
                )}

                <div>
                  <label className="label">Motif</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => set('reason', e.target.value)}
                    rows={3}
                    placeholder="Raison de la demande…"
                    className="input resize-none"
                  />
                </div>

                <div>
                  <label className="label">Justificatif</label>
                  <input
                    type="file"
                    accept=".png,.pdf,.doc,.docx,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => set('document', e.target.files?.[0] ?? null)}
                    className="input"
                  />
                  <p className="text-xs text-slate-400 mt-1">PNG, PDF ou Word.</p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Envoi…' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          )}
        </div>

        {isView && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
            <button onClick={onClose} className="btn-secondary">Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
