import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createSalesProject,
  createSalesRecord,
  deleteSalesProject,
  deleteSalesProjectDocument,
  exportSalesOpportunitiesExcelUrl,
  exportSalesProjectsExcelUrl,
  exportSalesTargetsExcelUrl,
  getSalesDashboard,
  getSalesProjects,
  getSalesRecords,
  getSalesReports,
  getSalesTargets,
  getSalespeople,
  getTiers,
  saveSalesTargets,
  updateSalesProject,
  updateSalesRecord,
} from '../../api/client'
import { DocumentsTab } from '../accounting/AccountingPage'
import SearchableRecordSelect from '../common/SearchableRecordSelect'

const PAGES = [
  ['dashboard', 'Tableau de bord'],
  ['projects', 'Projets'],
  ['opportunity', 'Opportunités'],
  ['quotes', 'Devis'],
  ['reports', 'Rapports'],
]

const PROJECT_STAGES = [
  ['prospect', 'Prospect'],
  ['opportunity', 'Opportunité'],
  ['quotation_sent', 'Devis envoyé'],
  ['negotiation', 'Négociation'],
  ['contract_signed', 'Contrat signé'],
  ['invoice_issued', 'Facture émise'],
  ['won', 'Gagné'],
  ['lost', 'Perdu'],
]

const OPPORTUNITY_STAGES = [
  ['new', 'Nouveau'],
  ['qualified', 'Qualifiée'],
  ['proposal_sent', 'Proposition envoyee'],
  ['negotiation', 'Négociation'],
  ['verbal_agreement', 'Accord verbal'],
  ['won', 'Gagnée'],
  ['lost', 'Perdu'],
]

const PERIOD_OPTIONS = [
  ['month', 'Mois'],
  ['quarter', 'Trimestre'],
  ['year', 'Année'],
]

const STAGE_PROBABILITY = {
  new: 10,
  qualified: 30,
  proposal_sent: 50,
  negotiation: 75,
  verbal_agreement: 90,
  won: 100,
  lost: 0,
}

const MONTH_OPTIONS = [
  ['1', 'Janvier'],
  ['2', 'Février'],
  ['3', 'Mars'],
  ['4', 'Avril'],
  ['5', 'Mai'],
  ['6', 'Juin'],
  ['7', 'Juillet'],
  ['8', 'Août'],
  ['9', 'Septembre'],
  ['10', 'Octobre'],
  ['11', 'Novembre'],
  ['12', 'Décembre'],
]

const list = (data) => data?.results || data || []

const money = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

const stageLabel = (value) => Object.fromEntries(OPPORTUNITY_STAGES)[value] || value || '-'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorText({ value }) {
  if (!value) return null
  return <p className="mt-1 text-xs text-red-600">{Array.isArray(value) ? value.join(' ') : value}</p>
}

function StatCard({ label, value, help, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200',
    blue: 'border-blue-200',
    emerald: 'border-emerald-200',
    amber: 'border-amber-200',
  }

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
    </div>
  )
}

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  const color = safe >= 100 ? 'bg-emerald-500' : safe >= 70 ? 'bg-blue-500' : 'bg-amber-500'

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Atteinte</span>
        <span>{safe.toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(safe, 100)}%` }} />
      </div>
    </div>
  )
}

function Toolbar({ search, setSearch, onAdd, label, exportUrl }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input className="input min-w-60 flex-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." />
      <a href={exportUrl} className="btn-secondary" download>Exporter Excel</a>
      <button type="button" className="btn-primary" onClick={onAdd}>{label}</button>
    </div>
  )
}

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            {headers.map((header) => <th className="p-3" key={header}>{header}</th>)}
            <th className="p-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td className="p-3 align-top" key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function toProjectFormData(form, documents, clients) {
  const client = clients.find((item) => String(item.id) === String(form.accounting_client))
  const payload = {
    ...form,
    customer_name: client?.raison_sociale || '',
    accounting_client: form.accounting_client || '',
    sales_owner: form.sales_owner || '',
    estimated_value: Number(form.estimated_value || 0),
    expected_close_date: form.expected_close_date || '',
    actual_close_date: form.actual_close_date || '',
    sales_notes: form.description,
    description: form.description,
  }

  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => body.append(key, value ?? ''))
  documents.forEach((file) => body.append('documents', file))
  return body
}

function ProjectForm({ record, clients, people, currentUser, onClose, onSaved, onDelete }) {
  const isEmployee = currentUser?.role === 'sales_employee'
  const [form, setForm] = useState({
    project_name: record?.project_name || '',
    accounting_client: record?.accounting_client || '',
    sales_owner: record?.sales_owner || '',
    estimated_value: record?.estimated_value || '',
    expected_close_date: record?.expected_close_date || '',
    actual_close_date: record?.actual_close_date || '',
    sales_stage: record?.sales_stage || 'prospect',
    description: record?.sales_notes || '',
  })
  const [documents, setDocuments] = useState([])
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }))
    setErrors((old) => ({ ...old, [key]: null, form: null, error: null }))
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.code} - ${client.raison_sociale}`,
    description: client.email || client.ice || '',
    keywords: [client.code, client.raison_sociale, client.email, client.ice].join(' '),
  }))
  const peopleOptions = people.map((person) => ({
    value: person.id,
    label: `${person.name} (${person.ongoing_projects} projets actifs)`,
    description: `${person.department || 'Sales'} - ${person.ongoing_projects} projets actifs`,
    keywords: [person.name, person.department, person.position, person.employee_id, person.ongoing_projects].join(' '),
  }))

  const isValid = Boolean(
    form.project_name.trim()
      && form.accounting_client
      && (isEmployee || form.sales_owner)
      && String(form.estimated_value).trim() !== ''
      && form.expected_close_date
      && form.description.trim(),
  )

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.project_name.trim()) nextErrors.project_name = 'Le titre du projet est obligatoire.'
    if (!form.accounting_client) nextErrors.accounting_client = 'Le client est obligatoire.'
    if (!isEmployee && !form.sales_owner) nextErrors.sales_owner = 'Le commercial responsable est obligatoire.'
    if (String(form.estimated_value).trim() === '') nextErrors.estimated_value = 'La valeur estimée est obligatoire.'
    if (!form.expected_close_date) nextErrors.expected_close_date = 'La date de clôture prévue est obligatoire.'
    if (!form.description.trim()) nextErrors.description = 'La description est obligatoire.'
    if (Object.keys(nextErrors).length) {
      setErrors({ ...nextErrors, form: 'Veuillez compléter tous les champs obligatoires du projet.' })
      return
    }

    setErrors({})
    try {
      const body = toProjectFormData(form, documents, clients)
      await (record ? updateSalesProject(record.id, body) : createSalesProject(body))
      onSaved()
      onClose()
    } catch (error) {
      setErrors(error.response?.data || { form: 'Enregistrement impossible.' })
    }
  }

  async function removeDocument(document) {
    try {
      await deleteSalesProjectDocument(record.id, document.id)
      onSaved()
      onClose()
    } catch {
      setErrors({ form: 'Suppression du document impossible.' })
    }
  }

  return (
    <Modal title={record ? 'Modifier le projet' : 'Nouveau projet'} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4 p-5">
        <ErrorText value={errors.form} />

        <div>
          <label className="label">Titre *</label>
          <input disabled={Boolean(record)} className="input" value={form.project_name} onChange={(event) => set('project_name', event.target.value)} />
          <ErrorText value={errors.project_name} />
        </div>

        <div className={`grid gap-4 ${isEmployee ? '' : 'sm:grid-cols-2'}`}>
          <div>
            <label className="label">Client *</label>
            <SearchableRecordSelect value={form.accounting_client} onChange={(value) => set('accounting_client', value)} options={clientOptions} placeholder="Rechercher un client..." required />
            <ErrorText value={errors.accounting_client} />
          </div>

          {!isEmployee ? (
            <div>
              <label className="label">Commercial responsable *</label>
              <SearchableRecordSelect value={form.sales_owner} onChange={(value) => set('sales_owner', value)} options={peopleOptions} placeholder="Rechercher un collaborateur..." required />
              <ErrorText value={errors.sales_owner} />
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Valeur estimée (EUR) *</label>
            <input type="number" min="0" className="input" value={form.estimated_value} onChange={(event) => set('estimated_value', event.target.value)} />
            <ErrorText value={errors.estimated_value} />
          </div>
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.sales_stage} onChange={(event) => set('sales_stage', event.target.value)}>
              {PROJECT_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Clôture prévue *</label>
            <input type="date" className="input" value={form.expected_close_date || ''} onChange={(event) => set('expected_close_date', event.target.value)} />
            <ErrorText value={errors.expected_close_date} />
          </div>
          <div>
            <label className="label">Clôture réelle</label>
            <input type="date" className="input" value={form.actual_close_date || ''} onChange={(event) => set('actual_close_date', event.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Description *</label>
          <textarea rows="3" className="input" value={form.description} onChange={(event) => set('description', event.target.value)} />
          <ErrorText value={errors.description} />
        </div>

        <div>
          <label className="label">Documents</label>
          <input type="file" multiple className="input" onChange={(event) => setDocuments(Array.from(event.target.files || []))} />
          {record?.documents?.length ? (
            <div className="mt-3 divide-y rounded-xl border border-slate-200">
              {record.documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <a href={document.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{document.file_name}</a>
                  <button type="button" className="text-red-500 hover:underline" onClick={() => removeDocument(document)}>Supprimer</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <ErrorText value={errors.form || errors.error} />

        <div className="flex justify-between border-t border-slate-200 pt-4">
          {record ? <button type="button" className="btn-danger" onClick={() => onDelete(record)}>Supprimer</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={!isValid}>Enregistrer</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function OpportunityForm({ record, clients, projects, people, currentUser, onClose, onSaved }) {
  const isEmployee = currentUser?.role === 'sales_employee'
  const [form, setForm] = useState({
    title: record?.title || '',
    accounting_client: record?.accounting_client || '',
    project: record?.project || '',
    assigned_employee: record?.assigned_employee || '',
    value: record?.value || '',
    probability: record?.probability ?? 10,
    due_date: record?.due_date || '',
    status: record?.status || 'new',
    source: record?.source || '',
    contact_person: record?.contact_person || '',
    notes: record?.notes || '',
  })
  const [manualProbability, setManualProbability] = useState(Boolean(record))
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }))
    setErrors((old) => ({ ...old, [key]: null, form: null, assigned_employee: null }))
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.code} - ${client.raison_sociale}`,
    description: client.email || client.ice || '',
    keywords: [client.code, client.raison_sociale, client.email, client.ice].join(' '),
  }))
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.project_name,
    description: project.sales_reference || project.customer_name || '',
    keywords: [project.project_name, project.sales_reference, project.customer_name].join(' '),
  }))
  const peopleOptions = people.map((person) => ({
    value: person.id,
    label: `${person.name} (${person.ongoing_projects} projets actifs)`,
    description: `${person.department || 'Sales'} - ${person.ongoing_projects} projets actifs`,
    keywords: [person.name, person.department, person.position, person.employee_id, person.ongoing_projects].join(' '),
  }))

  const isValid = Boolean(
    form.title.trim()
      && form.accounting_client
      && (isEmployee || form.assigned_employee)
      && String(form.value).trim()
      && String(form.contact_person).trim()
      && String(form.source).trim()
      && form.due_date
      && String(form.notes).trim(),
  )

  function setStatus(nextStatus) {
    setForm((old) => ({
      ...old,
      status: nextStatus,
      probability: manualProbability ? old.probability : (STAGE_PROBABILITY[nextStatus] ?? old.probability),
    }))
    setErrors((old) => ({ ...old, status: null, probability: null }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Le titre est obligatoire.'
    if (!form.accounting_client) nextErrors.accounting_client = 'Le client est obligatoire.'
    if (!isEmployee && !form.assigned_employee) nextErrors.assigned_employee = 'Le commercial assigne est obligatoire.'
    if (!String(form.value).trim()) nextErrors.value = 'La valeur estimee est obligatoire.'
    if (!String(form.contact_person).trim()) nextErrors.contact_person = 'Le contact est obligatoire.'
    if (!String(form.source).trim()) nextErrors.source = 'La source est obligatoire.'
    if (!form.due_date) nextErrors.due_date = 'La date de clôture prévue est obligatoire.'
    if (!String(form.notes).trim()) nextErrors.notes = 'Les notes sont obligatoires.'
    if (Object.keys(nextErrors).length) {
      setErrors({ ...nextErrors, form: "Veuillez compléter tous les champs obligatoires de l'opportunité." })
      return
    }

    setErrors({})
    const payload = {
      ...form,
      record_type: 'opportunity',
      accounting_client: form.accounting_client || null,
      project: form.project || null,
      assigned_employee: form.assigned_employee || null,
      value: Number(form.value || 0),
      probability: Number(form.probability || 0),
      due_date: form.due_date || null,
    }

    if (isEmployee) {
      payload.assigned_employee = currentUser?.employee_profile_id || payload.assigned_employee
    }

    try {
      onSaved(record ? await updateSalesRecord(record.id, payload) : await createSalesRecord(payload))
      onClose()
    } catch (error) {
      setErrors(error.response?.data || { form: 'Enregistrement impossible.' })
    }
  }

  return (
    <Modal title={record ? "Modifier l'opportunité" : 'Nouvelle opportunité'} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4 p-5">
        <ErrorText value={errors.form} />

        <div>
          <label className="label">Titre *</label>
          <input className="input" value={form.title} onChange={(event) => set('title', event.target.value)} />
          <ErrorText value={errors.title} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Client *</label>
            <SearchableRecordSelect value={form.accounting_client} onChange={(value) => set('accounting_client', value)} options={clientOptions} placeholder="Rechercher un client..." required />
            <ErrorText value={errors.accounting_client} />
          </div>
          <div>
            <label className="label">Projet</label>
            <SearchableRecordSelect value={form.project} onChange={(value) => set('project', value)} options={projectOptions} placeholder="Rechercher un projet..." />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!isEmployee ? (
            <div>
              <label className="label">Commercial assigné *</label>
              <SearchableRecordSelect value={form.assigned_employee} onChange={(value) => set('assigned_employee', value)} options={peopleOptions} placeholder="Rechercher un employé..." required />
              <ErrorText value={errors.assigned_employee} />
            </div>
          ) : <div />}
          <div>
            <label className="label">Valeur estimée (EUR) *</label>
            <input type="number" min="0" className="input" value={form.value} onChange={(event) => set('value', event.target.value)} />
            <ErrorText value={errors.value} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Contact *</label>
            <input className="input" value={form.contact_person} onChange={(event) => set('contact_person', event.target.value)} />
            <ErrorText value={errors.contact_person} />
          </div>
          <div>
            <label className="label">Source *</label>
            <input className="input" value={form.source} onChange={(event) => set('source', event.target.value)} placeholder="Website, referral, call..." />
            <ErrorText value={errors.source} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Étape du pipeline</label>
            <select className="input" value={form.status} onChange={(event) => setStatus(event.target.value)}>
              {OPPORTUNITY_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Clôture prévue *</label>
            <input type="date" className="input" value={form.due_date || ''} onChange={(event) => set('due_date', event.target.value)} />
            <ErrorText value={errors.due_date} />
          </div>
        </div>

        <div>
          <label className="label">Probabilité de closing (%)</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            className="w-full accent-blue-600"
            value={form.probability}
            onChange={(event) => {
              setManualProbability(true)
              set('probability', event.target.value)
            }}
          />
          <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
            <span>{stageLabel(form.status)}</span>
            <strong>{form.probability}%</strong>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cette valeur représente la probabilité estimée de convertir cette opportunité en vente confirmée.
          </p>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={!manualProbability}
              onChange={(event) => {
                const automatic = event.target.checked
                setManualProbability(!automatic)
                if (automatic) set('probability', STAGE_PROBABILITY[form.status] ?? form.probability)
              }}
            />
            Utiliser la probabilité par défaut de l'étape
          </label>
        </div>

        <div>
          <label className="label">Notes *</label>
          <textarea className="input" rows="3" value={form.notes} onChange={(event) => set('notes', event.target.value)} />
          <ErrorText value={errors.notes} />
        </div>

        <ErrorText value={errors.form || errors.assigned_employee} />

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn-primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmDelete({ record, error, onCancel, onConfirm }) {
  return (
    <Modal title="Supprimer le projet" onClose={onCancel}>
      <div className="space-y-4 p-5">
        <p>Confirmer la suppression de &ldquo;{record.project_name}&rdquo;&nbsp;?</p>
        <ErrorText value={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>Annuler</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>Supprimer</button>
        </div>
      </div>
    </Modal>
  )
}

function TargetSection({ currentUser, people, targets, targetFilter, setTargetFilter, onRefresh }) {
  const canManage = ['admin', 'sales_manager'].includes(currentUser?.role)
  const [form, setForm] = useState({ employee_id: 'all', target_amount: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const options = people.map((person) => ({
    value: person.id,
    label: person.name,
    description: `${person.department || 'Sales'} - ${person.ongoing_projects} projets actifs`,
    keywords: [person.name, person.department, person.position].join(' '),
  }))
  const targetOptions = [
    { value: 'all', label: 'Appliquer pour tous', description: 'Affecte tous les commerciaux visibles.' },
    ...options,
  ]
  const canSubmit = Boolean(form.target_amount !== '' && Number(form.target_amount) >= 0)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!canSubmit) {
      setError("Le montant de l'objectif est obligatoire.")
      return
    }

    setSaving(true)
    try {
      await saveSalesTargets({
        ...targetFilter,
        employee_id: form.employee_id === 'all' ? '' : form.employee_id,
        target_amount: Number(form.target_amount || 0),
        apply_all: form.employee_id === 'all',
      })
      setForm({ employee_id: 'all', target_amount: '' })
      setMessage('Objectif enregistré avec succès.')
      await onRefresh()
    } catch (saveError) {
      setError(saveError.response?.data?.employee_id || saveError.response?.data?.error || "Impossible d'enregistrer l'objectif.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Objectifs commerciaux</h3>
          <p className="mt-1 text-sm text-slate-500">Définition des objectifs mensuels, suivi individuel et lecture claire des performances.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-40" value={targetFilter.period} onChange={(event) => setTargetFilter((old) => ({ ...old, period: event.target.value }))}>
            {PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className="input w-28" type="number" value={targetFilter.year} onChange={(event) => setTargetFilter((old) => ({ ...old, year: event.target.value }))} />
          {targetFilter.period === 'month' ? (
            <select className="input w-44" value={targetFilter.month} onChange={(event) => setTargetFilter((old) => ({ ...old, month: event.target.value }))}>
              {MONTH_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ) : null}
          {targetFilter.period === 'quarter' ? (
            <select className="input w-28" value={targetFilter.quarter} onChange={(event) => setTargetFilter((old) => ({ ...old, quarter: event.target.value }))}>
              <option value="1">T1</option>
              <option value="2">T2</option>
              <option value="3">T3</option>
              <option value="4">T4</option>
            </select>
          ) : null}
          <a href={exportSalesTargetsExcelUrl(targetFilter)} className="btn-secondary" download>Exporter Excel</a>
        </div>
      </div>

      {canManage ? (
        <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm lg:grid-cols-[1fr_220px_auto]">
          <SearchableRecordSelect value={form.employee_id} onChange={(value) => setForm((old) => ({ ...old, employee_id: value || 'all' }))} options={targetOptions} placeholder="Sélectionner un commercial" required />
          <input className="input" type="number" min="0" step="0.01" placeholder="Objectif EUR" value={form.target_amount} onChange={(event) => setForm((old) => ({ ...old, target_amount: event.target.value }))} required />
          <button type="submit" className="btn-primary" disabled={saving || !canSubmit}>{saving ? 'Enregistrement...' : 'Définir objectif'}</button>
        </form>
      ) : null}

      {message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="pb-3">Employé</th>
              <th className="pb-3">Objectif</th>
              <th className="pb-3">Réalisé</th>
              <th className="pb-3">Taux d&apos;atteinte</th>
              <th className="pb-3">Opportunités gagnées</th>
              <th className="pb-3">Projets créés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {targets.map((row) => (
              <tr key={row.employee_id}>
                <td className="py-3">
                  <div className="font-medium text-slate-900">{row.employee_name}</div>
                  <div className="text-xs text-slate-500">{row.department || 'Sales'}</div>
                </td>
                <td className="py-3">{money(row.target_amount)}</td>
                <td className={`py-3 font-medium ${row.achievement_rate >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>{money(row.achieved_amount)}</td>
                <td className="py-3 min-w-52"><ProgressBar value={row.achievement_rate} /></td>
                <td className="py-3">{row.won_opportunities}</td>
                <td className="py-3">{row.projects_created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SalesPage({ currentUser }) {
  const [page, setPage] = useState(() => sessionStorage.getItem('hacint_sales_page') || 'dashboard')
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [people, setPeople] = useState([])
  const [reports, setReports] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [targets, setTargets] = useState([])
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'updated_at', direction: 'desc' })
  const [message, setMessage] = useState('')
  const [targetFilter, setTargetFilter] = useState(() => {
    const today = new Date()
    return {
      period: 'month',
      year: String(today.getFullYear()),
      month: String(today.getMonth() + 1),
      quarter: String(Math.floor(today.getMonth() / 3) + 1),
    }
  })

  const loadTargets = useCallback(async () => {
    const data = await getSalesTargets(targetFilter)
    setTargets(data.rows || [])
  }, [targetFilter])

  const load = useCallback(async () => {
    const [clientData, projectData, opportunityData, peopleData, reportData, dashboardData] = await Promise.all([
      getTiers({ type: 'client', actif: true, page_size: 200 }),
      getSalesProjects(),
      getSalesRecords({ record_type: 'opportunity', page_size: 200 }),
      getSalespeople(),
      getSalesReports(targetFilter),
      getSalesDashboard(targetFilter),
    ])

    setClients(list(clientData))
    setProjects(projectData)
    setOpportunities(list(opportunityData))
    setPeople(peopleData)
    setReports(reportData)
    setDashboard(dashboardData)
  }, [targetFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadTargets() }, [loadTargets])

  function navigate(nextPage) {
    setPage(nextPage)
    sessionStorage.setItem('hacint_sales_page', nextPage)
    setSearch('')
  }

  function saved() {
    setMessage('Enregistré avec succès.')
    setTimeout(() => setMessage(''), 2000)
    load()
    loadTargets()
  }

  async function confirmDelete() {
    try {
      await deleteSalesProject(modal.record.id)
      setModal(null)
      saved()
    } catch (error) {
      setModal((old) => ({ ...old, error: error.response?.data?.error || 'Suppression impossible.' }))
    }
  }

  const sortedOpportunities = useMemo(() => (
    [...opportunities]
      .filter((item) => !search || [item.title, item.client_name, item.assigned_employee_name, item.status].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        const av = a[sort.key] ?? ''
        const bv = b[sort.key] ?? ''
        const result = String(av).localeCompare(String(bv), 'fr', { numeric: true })
        return sort.direction === 'asc' ? result : -result
      })
  ), [opportunities, search, sort])

  const filteredProjects = useMemo(() => (
    projects.filter((project) => !search || [project.project_name, project.customer_name, project.sales_owner_name, project.sales_reference].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())))
  ), [projects, search])

  const sortBy = (key) => setSort((old) => ({ key, direction: old.key === key && old.direction === 'asc' ? 'desc' : 'asc' }))
  const targetRows = dashboard?.target_rows || targets
  const canManageTargets = ['admin', 'sales_manager'].includes(currentUser?.role)

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Ventes</h1>
        <p className="text-sm text-slate-500">Opportunités, projets, devis et performance commerciale en euro.</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {PAGES.map(([id, label]) => (
          <button key={id} type="button" onClick={() => navigate(id)} className={`px-3 py-2.5 text-sm font-medium ${page === id ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </nav>

      {message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

      {page === 'dashboard' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clients" value={clients.length} tone="blue" />
            <StatCard label="Projets actifs" value={dashboard?.active_projects || 0} tone="emerald" />
            <StatCard label="Opportunités ouvertes" value={dashboard?.open_opportunities || 0} tone="amber" />
            <StatCard label="Pipeline" value={money(reports?.pipeline_value)} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{canManageTargets ? 'Performance équipe' : 'Performance personnelle'}</h3>
                    <p className="text-sm text-slate-500">Objectifs, ventes gagnées et progression visuelle.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Objectif</div>
                    <div className="text-lg font-semibold text-slate-900">{money(dashboard?.target_amount)}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <StatCard label="Ventes du mois" value={dashboard?.total_sales_this_month || 0} />
                  <StatCard label="CA généré" value={money(dashboard?.revenue_generated)} />
                  <StatCard label="Réalisé" value={money(dashboard?.target_achieved)} help={`${dashboard?.target_rate || 0}% de l'objectif`} />
                </div>
                <div className="mt-4">
                  <ProgressBar value={dashboard?.target_rate || 0} />
                </div>
              </div>

              {currentUser?.role === 'sales_employee' ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">Mon objectif</h3>
                  <p className="mt-1 text-sm text-slate-500">Vue personnelle centrée sur l&apos;objectif assigné et la progression individuelle.</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <StatCard label="Objectif assigné" value={money(targetRows?.[0]?.target_amount)} />
                    <StatCard label="Réalisé" value={money(targetRows?.[0]?.achieved_amount)} />
                    <StatCard label="Atteinte" value={`${targetRows?.[0]?.achievement_rate || 0}%`} />
                  </div>
                  <div className="mt-5">
                    <ProgressBar value={targetRows?.[0]?.achievement_rate || 0} />
                  </div>
                </div>
              ) : (
                <TargetSection currentUser={currentUser} people={people} targets={targetRows} targetFilter={targetFilter} setTargetFilter={setTargetFilter} onRefresh={async () => { await load(); await loadTargets() }} />
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Opportunités par étape</h3>
                <div className="mt-4 space-y-3">
                  {(dashboard?.pipeline || []).map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{stageLabel(item.status)}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.count} · {money(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Rendez-vous et suivis</h3>
                <div className="mt-4 space-y-2">
                  {[...(dashboard?.upcoming_meetings || []), ...(dashboard?.upcoming_followups || [])].slice(0, 8).map((item) => (
                    <div key={`${item.id}-${item.title || item.project_name}`} className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="font-medium text-slate-800">{item.title || item.project_name}</div>
                      <div className="text-xs text-slate-500">{item.due_date || item.next_action_date} {item.next_action ? `· ${item.next_action}` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                <div className="mt-4 space-y-2">
                  {(dashboard?.notifications || []).length ? (dashboard.notifications || []).map((item, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{item.message}</div>
                  )) : <p className="text-sm text-slate-500">Aucune notification pour le moment.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {page === 'projects' ? (
        <>
          <Toolbar search={search} setSearch={setSearch} onAdd={() => setModal({ type: 'project' })} label="+ Projet" exportUrl={exportSalesProjectsExcelUrl({ search })} />
          <DataTable
            headers={['Référence', 'Projet', 'Client', 'Commercial', 'Valeur', 'Statut', 'Documents']}
            rows={filteredProjects.map((project) => [
              project.sales_reference || '-',
              project.project_name,
              project.customer_name || '-',
              project.sales_owner_name || '-',
              money(project.estimated_value),
              project.sales_stage_display,
              project.documents?.length || 0,
              <button type="button" className="text-blue-600" onClick={() => setModal({ type: 'project', record: project })}>Modifier</button>,
            ])}
          />
        </>
      ) : null}

      {page === 'opportunity' ? (
        <>
          <Toolbar search={search} setSearch={setSearch} onAdd={() => setModal({ type: 'opportunity' })} label="+ Opportunité" exportUrl={exportSalesOpportunitiesExcelUrl({ search })} />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {[
                    ['code', 'Référence'],
                    ['title', 'Titre'],
                    ['client_name', 'Client'],
                    ['assigned_employee_name', 'Commercial'],
                    ['value', 'Valeur'],
                    ['probability', 'Probabilité'],
                    ['due_date', 'Clôture'],
                    ['status', 'Statut'],
                  ].map(([key, label]) => (
                    <th key={key} className="cursor-pointer p-3" onClick={() => sortBy(key)}>
                      {label}{sort.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOpportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td className="p-3">{opportunity.code}</td>
                    <td className="p-3 font-medium text-slate-900">{opportunity.title}</td>
                    <td className="p-3">{opportunity.client_name || '-'}</td>
                    <td className="p-3">{opportunity.assigned_employee_name || '-'}</td>
                    <td className="p-3">{money(opportunity.value)}</td>
                    <td className="p-3">{opportunity.probability}%</td>
                    <td className="p-3">{opportunity.due_date || '-'}</td>
                    <td className="p-3">{stageLabel(opportunity.status)}</td>
                    <td className="p-3"><button type="button" className="text-blue-600" onClick={() => setModal({ type: 'opportunity', record: opportunity })}>Modifier</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {page === 'reports' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <a href={exportSalesProjectsExcelUrl()} className="btn-secondary" download>Exporter projets</a>
            <a href={exportSalesOpportunitiesExcelUrl()} className="btn-secondary" download>Exporter opportunités</a>
            <a href={exportSalesTargetsExcelUrl(targetFilter)} className="btn-secondary" download>Exporter objectifs</a>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Valeur gagnée" value={money(reports?.total_revenue)} />
            <StatCard label="Pipeline actif" value={money(reports?.pipeline_value)} />
            <StatCard label="Projets gagnés" value={reports?.won || 0} />
            <StatCard label="Projets perdus" value={reports?.lost || 0} />
          </div>
          <TargetSection currentUser={currentUser} people={people} targets={reports?.targets || targets} targetFilter={targetFilter} setTargetFilter={setTargetFilter} onRefresh={async () => { await load(); await loadTargets() }} />
        </div>
      ) : null}

      {page === 'quotes' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <DocumentsTab tab="devis" currentUser={currentUser} />
        </div>
      ) : null}

      {modal?.type === 'project' ? <ProjectForm record={modal.record} clients={clients} people={people} currentUser={currentUser} onClose={() => setModal(null)} onSaved={saved} onDelete={(record) => setModal({ type: 'delete', record })} /> : null}
      {modal?.type === 'opportunity' ? <OpportunityForm record={modal.record} clients={clients} projects={projects} people={people} currentUser={currentUser} onClose={() => setModal(null)} onSaved={saved} /> : null}
      {modal?.type === 'delete' ? <ConfirmDelete record={modal.record} error={modal.error} onCancel={() => setModal(null)} onConfirm={confirmDelete} /> : null}
    </div>
  )
}
