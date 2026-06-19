import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Spinner } from '@chakra-ui/react'
import {
  approveProjectApn, approveValidation, createProject, createProjectSample,
  deleteProjectSample, deleteMatrixEntry, createMatrixEntry,
  getMatrix, getProjectSamples, getValidationList,
  importMatrix, importProjectExcel, runValidation, updateMatrixEntry,
  updateProjectStatus,
} from '../../api/client'
import { StatCard } from './_shared'

// ── Constants ─────────────────────────────────────────────────────────────────

const FILL_LABELS  = { full: 'Complet', empty: 'Vide', partial: 'Partiel', mixed: 'Mixte', '': '—' }
// Types libres (import Excel : Equipment) → afficher le texte tel quel
const fillLabel = (value) => FILL_LABELS[value] ?? value ?? '—'
const FILL_OPTIONS = [
  { value: 'full',    label: 'Complet (toutes broches)' },
  { value: 'empty',   label: 'Vide (aucune broche)' },
  { value: 'partial', label: 'Partiel (broches partielles)' },
]
const CLIENT_OPTIONS = ['Aptiv', 'Yazaki', 'Lear', 'Renault', 'Stellantis', 'Sumitomo', 'Other']
const PLACEMENT_RE   = /^[A-Z][0-9]{1,2}$/

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function validationBadge(status, approvedAt = null) {
  if (approvedAt)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white whitespace-nowrap">Approuvé ✓</span>
  if (status === 'approved')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">Vérifié ✓</span>
  if (status === 'rejected')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 whitespace-nowrap">Rejeté ✗</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 whitespace-nowrap">En attente</span>
}

function statusCell(rowStatus) {
  if (rowStatus === 'matched')    return <span className="font-bold text-emerald-600">✓</span>
  if (rowStatus === 'missing')    return <span className="font-bold text-red-600">✗</span>
  if (rowStatus === 'mismatched') return <span className="font-bold text-amber-500">⚠</span>
  if (rowStatus === 'extra')      return <span className="font-bold text-purple-600">+</span>
  return null
}
function rowBg(s) {
  if (s === 'missing')    return 'bg-red-50'
  if (s === 'mismatched') return 'bg-amber-50'
  if (s === 'extra')      return 'bg-purple-50'
  return ''
}

// ── Matrix panel (shared between list view and project detail) ────────────────

function MatrixPanel({ isAdmin, onRequestImport, reloadSignal }) {
  const [entries, setEntries]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [editId, setEditId]           = useState(null)
  const [form, setForm] = useState({ reference: '', designation: '', quantity: 1, sample_type: '', notes: '' })
  const [formError, setFormError]     = useState(null)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await getMatrix()
      // Guard against paginated response { count, results } vs plain array
      setEntries(Array.isArray(raw) ? raw : (raw?.results ?? []))
    } catch { /* ignore — show empty state */ }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  // Refresh after a matrix import performed from the unified import modal
  useEffect(() => { if (reloadSignal !== undefined) load() }, [reloadSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    setEditId(null)
    setForm({ reference: '', designation: '', quantity: 1, sample_type: '', notes: '' })
    setShowForm(true); setFormError(null)
  }
  function openEdit(entry) {
    setEditId(entry.id)
    setForm({ reference: entry.reference, designation: entry.designation, quantity: entry.quantity, sample_type: entry.sample_type, notes: entry.notes })
    setShowForm(true); setFormError(null)
  }
  async function handleSubmit() {
    if (!form.reference.trim()) { setFormError('La référence est obligatoire.'); return }
    try {
      const payload = { ...form, quantity: Number(form.quantity) }
      editId ? await updateMatrixEntry(editId, payload) : await createMatrixEntry(payload)
      setShowForm(false); setEditId(null); load()
    } catch (err) {
      const d = err?.response?.data
      setFormError(d?.reference?.[0] || d?.detail || d?.error || 'Erreur lors de la sauvegarde.')
    }
  }
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette entrée ?')) return
    try { await deleteMatrixEntry(id); load() } catch { alert('Erreur lors de la suppression.') }
  }
  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportResult(null)
    try { const r = await importMatrix(file); setImportResult(r); load() }
    catch (err) { setImportResult({ error: err?.response?.data?.error || "Erreur lors de l'import." }) }
    finally { setImporting(false); e.target.value = '' }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-wrap gap-2">
        <h2 className="font-semibold text-slate-700 text-sm">
          Matrice de référence
          <span className="ml-2 text-slate-400 font-normal">({entries.length} entrée{entries.length !== 1 ? 's' : ''})</span>
        </h2>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 hidden sm:inline">
              CSV : <code className="bg-slate-100 px-1 rounded">reference, designation, quantity, sample_type, notes</code>
            </span>
            <button
              className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
              onClick={() => onRequestImport ? onRequestImport() : fileRef.current?.click()}
              disabled={importing}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {importing ? 'Import…' : 'Importer CSV'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <button className="btn-primary text-xs px-2 py-1" onClick={openNew}>+ Ajouter</button>
          </div>
        )}
      </div>

      {importResult && (
        <div className={`px-4 py-2 text-xs border-b ${importResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {importResult.error
            ? importResult.error
            : `Import terminé : ${importResult.created} créé(s), ${importResult.updated} mis à jour.`}
          {importResult.errors?.map((e, i) => <div key={i} className="mt-0.5 text-amber-700">{e}</div>)}
        </div>
      )}

      {showForm && isAdmin && (
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/40">
          <p className="text-xs font-semibold text-slate-600 mb-2">{editId ? 'Modifier' : 'Nouvelle entrée'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Référence (APN) *</label>
              <input className="input text-xs" value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="ex: 12345678AB" autoFocus />
            </div>
            <div>
              <label className="label">Quantité</label>
              <input className="input text-xs" type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type connecteur</label>
              <select className="input text-xs" value={form.sample_type}
                onChange={e => setForm(f => ({ ...f, sample_type: e.target.value }))}>
                <option value="">Non spécifié</option>
                {FILL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="label">Désignation</label>
              <input className="input text-xs" value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                placeholder="Description (optionnel)" />
            </div>
          </div>
          {formError && <p className="text-xs text-red-600 mb-2">{formError}</p>}
          <div className="flex gap-2">
            <button className="btn-primary text-xs" onClick={handleSubmit}>Enregistrer</button>
            <button className="btn-secondary text-xs" onClick={() => { setShowForm(false); setFormError(null) }}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center py-8 text-slate-400 text-sm">Chargement…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          <p>Aucune entrée dans la matrice.</p>
          {isAdmin && <p className="text-xs mt-1">Ajoutez des entrées ou importez un CSV.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                <th className="text-left px-4 py-2">Référence</th>
                <th className="text-left px-3 py-2">Désignation</th>
                <th className="text-center px-3 py-2">Qté</th>
                <th className="text-center px-3 py-2">Type</th>
                {isAdmin && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono font-semibold text-slate-800">{entry.reference}</td>
                  <td className="px-3 py-2 text-slate-500">{entry.designation || '—'}</td>
                  <td className="px-3 py-2 text-center font-semibold">{entry.quantity}</td>
                  <td className="px-3 py-2 text-center">{fillLabel(entry.sample_type)}</td>
                  {isAdmin && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button className="text-blue-500 hover:text-blue-700 mr-3" onClick={() => openEdit(entry)}>Modifier</button>
                      <button className="text-red-400 hover:text-red-600" onClick={() => handleDelete(entry.id)}>Supprimer</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Add-sample form ───────────────────────────────────────────────────────────

function AddSampleForm({ projectName, onAdded, onCancel }) {
  const [form, setForm] = useState({ apn: '', quantity: 1, connector_fill: 'empty', placement: 'A1', client: 'Other' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.apn.trim()) { setError("L'APN est obligatoire."); return }
    const placement = form.placement.trim().toUpperCase()
    if (!PLACEMENT_RE.test(placement)) { setError('Placement invalide (ex: A1, B12).'); return }
    setSaving(true); setError(null)
    try {
      const s = await createProjectSample(projectName, { ...form, placement, quantity: Number(form.quantity) })
      onAdded(s)
    } catch (err) {
      const d = err?.response?.data
      setError(d?.error || d?.apn?.[0] || d?.placement?.[0] || 'Erreur lors de la création.')
    } finally { setSaving(false) }
  }

  const f = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2">Ajouter un échantillon</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="label">APN *</label>
          <input className="input text-xs" value={form.apn} onChange={f('apn')} placeholder="ex: 12345678AB" autoFocus />
        </div>
        <div><label className="label">Qté</label>
          <input className="input text-xs" type="number" min="1" value={form.quantity} onChange={f('quantity')} /></div>
        <div><label className="label">Placement *</label>
          <input className="input text-xs" value={form.placement} onChange={f('placement')} placeholder="A1" maxLength={3} /></div>
        <div><label className="label">Type connecteur</label>
          <select className="input text-xs" value={form.connector_fill} onChange={f('connector_fill')}>
            {FILL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div><label className="label">Client</label>
          <select className="input text-xs" value={form.client} onChange={f('client')}>
            {CLIENT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select></div>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary text-xs" onClick={handleSave} disabled={saving}>{saving ? 'Ajout…' : 'Ajouter'}</button>
        <button className="btn-secondary text-xs" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}

// ── Samples panel ─────────────────────────────────────────────────────────────

function ProjectSamplesPanel({ projectName, isApproved }) {
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSamples(await getProjectSamples(projectName)) } catch { /* ignore */ } finally { setLoading(false) }
  }, [projectName])
  useEffect(() => { load() }, [load])

  async function handleDelete(s) {
    if (!window.confirm(`Supprimer ${s.apn} ?`)) return
    try { await deleteProjectSample(projectName, s.id); setSamples(prev => prev.filter(x => x.id !== s.id)) }
    catch { alert('Erreur lors de la suppression.') }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm">
          Échantillons du projet <span className="ml-2 text-slate-400 font-normal">({samples.length})</span>
        </h3>
        {!isApproved && (
          <button className="btn-primary text-xs px-2 py-1" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Annuler' : '+ Ajouter'}
          </button>
        )}
      </div>

      {showForm && !isApproved && (
        <div className="px-4 py-3 border-b border-slate-100">
          <AddSampleForm
            projectName={projectName}
            onAdded={s => { setSamples(prev => [...prev, s]); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? <p className="text-center py-8 text-slate-400 text-sm">Chargement…</p>
      : samples.length === 0 ? (
        <p className="text-center py-8 text-slate-400 text-sm">
          Aucun échantillon.{!isApproved && ' Cliquez sur "+ Ajouter" pour commencer.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                <th className="px-4 py-2">APN</th>
                <th className="px-3 py-2 text-center">N° série</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-center">Qté</th>
                <th className="px-3 py-2 text-center">Type</th>
                <th className="px-3 py-2 text-center">Placement</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2 text-center">Échantillons</th>
                {!isApproved && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {samples.map(s => (
                <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 ${s.study_approved ? 'bg-emerald-50/40' : ''}`}>
                  <td className="px-4 py-2 font-mono font-semibold text-slate-800">{s.apn}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-500">
                    {s.serial_number != null ? `#${s.serial_number}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-500 max-w-[260px]"
                    title={[s.description, s.commentaire].filter(Boolean).join('\n— Commentaire : ')}>
                    <div className="truncate">{s.description || '—'}</div>
                    {s.commentaire && (
                      <div className="truncate text-slate-400 italic">{s.commentaire}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{s.quantity}</td>
                  <td className="px-3 py-2 text-center">{FILL_LABELS[s.connector_fill] || '—'}</td>
                  <td className="px-3 py-2 text-center">{s.placement}</td>
                  <td className="px-3 py-2 text-slate-500">{s.client}</td>
                  <td className="px-3 py-2 text-center">
                    {s.study_approved
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Approuvé</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">En attente</span>}
                  </td>
                  {!isApproved && (
                    <td className="px-3 py-2 text-right">
                      <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => handleDelete(s)}>Supprimer</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Project detail view ───────────────────────────────────────────────────────

function ProjectDetailView({ project: initialProject, currentUser, onBack, onStatusChanged }) {
  const projectName = initialProject.project_name
  const isAdmin = ['admin', 'etude_technique'].includes(currentUser?.role)

  const [result, setResult]           = useState(null)
  const [validation, setValidation]   = useState(null)
  const [running, setRunning]         = useState(false)
  const [approving, setApproving]     = useState(false)
  const [error, setError]             = useState(null)
  // Per-APN approval state: Set of approved APN strings
  const [approvedApns, setApprovedApns] = useState(new Set())
  const [approvingApn, setApprovingApn] = useState(null)

  // Status edit state (admin only)
  const [showStatusEdit, setShowStatusEdit] = useState(false)
  const [editStatus, setEditStatus]         = useState('pending')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusError, setStatusError]       = useState(null)

  // Matrix panel — open by default so CSV import is immediately accessible
  const [showMatrix, setShowMatrix] = useState(true)

  const finallyApproved = !!(validation?.approved_at ?? initialProject.approved_at)
  const valStatus = result?.validation_status ?? validation?.validation_status ?? initialProject.validation_status
  const currentApprovedAt = validation?.approved_at ?? initialProject.approved_at

  async function handleRun() {
    setRunning(true); setError(null)
    try {
      const d = await runValidation(projectName)
      setResult(d)
      setValidation(d.validation)
      // Seed approved APNs from returned row data
      const approved = new Set(
        [...(d.matched||[]),...(d.mismatched||[]),...(d.extra||[])]
          .filter(r => r.approved).map(r => r.reference)
      )
      setApprovedApns(approved)
    }
    catch (err) { setError(err?.response?.data?.error || 'Erreur lors de la vérification.') }
    finally { setRunning(false) }
  }

  async function handleToggleApn(apn) {
    const nowApproved = !approvedApns.has(apn)
    setApprovingApn(apn)
    try {
      await approveProjectApn(projectName, apn, nowApproved)
      setApprovedApns(prev => {
        const next = new Set(prev)
        nowApproved ? next.add(apn) : next.delete(apn)
        return next
      })
    } catch { /* ignore — revert by not changing state */ }
    finally { setApprovingApn(null) }
  }

  async function handleApprove() {
    setApproving(true); setError(null)
    try { const v = await approveValidation(projectName); setValidation(v) }
    catch (err) { setError(err?.response?.data?.error || "Erreur lors de l'approbation.") }
    finally { setApproving(false) }
  }

  async function handleStatusUpdate() {
    setUpdatingStatus(true); setStatusError(null)
    try {
      const updated = await updateProjectStatus(projectName, { validation_status: editStatus })
      setValidation({ ...updated, validated_at: updated.validated_at, approved_at: null, approved_by: null })
      setResult(null)
      setShowStatusEdit(false)
      onStatusChanged?.(updated)
    } catch (err) {
      setStatusError(err?.response?.data?.error || 'Erreur lors de la mise à jour.')
    } finally { setUpdatingStatus(false) }
  }

  const allRows = result
    ? [...(result.matched || []), ...(result.missing || []), ...(result.mismatched || []), ...(result.extra || [])]
        .sort((a, b) => a.reference.localeCompare(b.reference))
    : []
  const summary = result?.summary

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <button onClick={onBack} className="btn-secondary text-sm py-1.5 px-3">← Retour</button>
          <h2 className="font-bold text-slate-800 text-lg flex-1 min-w-0 truncate">{projectName}</h2>
          {validationBadge(valStatus, currentApprovedAt)}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary flex items-center gap-2" onClick={handleRun} disabled={running}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {running ? 'Vérification…' : 'Lancer la vérification'}
          </button>

          {!finallyApproved && isAdmin && (
            <button className="btn-primary flex items-center gap-2" onClick={handleApprove} disabled={approving}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {approving ? 'Approbation…' : 'Approuver le projet'}
            </button>
          )}

          {/* Matrix toggle */}
          <button className="btn-secondary flex items-center gap-2" onClick={() => setShowMatrix(v => !v)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {showMatrix ? 'Masquer matrice' : 'Voir la matrice'}
          </button>

          {/* Admin: modify status */}
          {isAdmin && (
            <button
              className="btn-secondary flex items-center gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => { setShowStatusEdit(v => !v); setStatusError(null) }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier le statut
            </button>
          )}
        </div>

        {/* Status edit panel */}
        {showStatusEdit && isAdmin && (
          <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-700 mb-2">Modifier manuellement le statut</p>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="input text-sm"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
              >
                <option value="pending">Réinitialiser → En attente (supprime validation et approbation)</option>
                <option value="rejected">Marquer comme Rejeté (supprime l'approbation)</option>
              </select>
              <button className="btn-danger text-sm" onClick={handleStatusUpdate} disabled={updatingStatus}>
                {updatingStatus ? 'Enregistrement…' : 'Appliquer'}
              </button>
              <button className="btn-secondary text-sm" onClick={() => { setShowStatusEdit(false); setStatusError(null) }}>
                Annuler
              </button>
            </div>
            {statusError && <p className="text-xs text-red-600 mt-2">{statusError}</p>}
            <p className="text-xs text-amber-600 mt-2">
              ⚠ Cette action est irréversible. Le projet devra être re-vérifié.
            </p>
          </div>
        )}

        {/* Status messages */}
        {error && <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
        {finallyApproved && (
          <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
            ✓ Projet approuvé — ses échantillons apparaissent dans l'onglet Échantillons.
          </p>
        )}
        {valStatus === 'approved' && !finallyApproved && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
            Vérification réussie. Cliquez sur "Approuver le projet" pour le rendre visible dans l'onglet Échantillons.
          </p>
        )}
        {valStatus === 'rejected' && !finallyApproved && isAdmin && (
          <p className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg p-2">
            ⚠ Ce projet a des écarts avec la matrice. En tant qu'administrateur vous pouvez l'approuver malgré tout.
          </p>
        )}
      </div>

      {/* ── Samples management ── */}
      <ProjectSamplesPanel projectName={projectName} isApproved={finallyApproved} />

      {/* ── Matrix panel (toggled from header, open by default) ── */}
      {showMatrix && <MatrixPanel isAdmin={isAdmin} />}

      {/* ── Comparison summary cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Conformes',     value: summary.matched,    color: 'text-emerald-600' },
            { label: 'Manquants',     value: summary.missing,    color: 'text-red-600' },
            { label: 'Écarts',        value: summary.mismatched, color: 'text-amber-500' },
            { label: 'Hors-matrice',  value: summary.extra,      color: 'text-purple-600' },
          ].map(c => <StatCard key={c.label} {...c} />)}
        </div>
      )}

      {validation?.validated_at && (
        <p className="text-xs text-slate-400 px-1">
          Dernière vérification le {fmt(validation.validated_at)}
          {validation.validatedBy ? ` par ${validation.validatedBy}` : ''}
        </p>
      )}

      {!result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 text-center py-10 text-slate-400">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm">Ajoutez des échantillons puis cliquez sur "Lancer la vérification".</p>
        </div>
      )}

      {/* ── Comparison table ── */}
      {allRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-4 flex-wrap">
            <p className="text-sm font-semibold text-slate-700">Tableau comparatif</p>
            <div className="flex gap-3 text-xs text-slate-400">
              <span><span className="font-bold text-emerald-600">✓</span> Conforme</span>
              <span><span className="font-bold text-red-600">✗</span> Manquant</span>
              <span><span className="font-bold text-amber-500">⚠</span> Écart</span>
              <span><span className="font-bold text-purple-600">+</span> Hors-matrice</span>
            </div>
            {isAdmin && (
              <span className="text-xs text-slate-400 ml-auto">
                Cliquez sur <span className="font-semibold text-emerald-600">Approuver</span> pour rendre un échantillon visible dans l'onglet Échantillons.
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="px-4 py-2">Référence (APN)</th>
                  <th className="px-3 py-2 text-center">Qté matrice</th>
                  <th className="px-3 py-2 text-center">Qté projet</th>
                  <th className="px-3 py-2 text-center">Type matrice</th>
                  <th className="px-3 py-2 text-center">Type projet</th>
                  <th className="px-3 py-2 text-center">Conformité</th>
                  {isAdmin && <th className="px-3 py-2 text-center">Échantillons</th>}
                </tr>
              </thead>
              <tbody>
                {allRows.map((row, i) => {
                  const isApproved = approvedApns.has(row.reference)
                  const isBusy    = approvingApn === row.reference
                  const hasSamples = row.status !== 'missing'
                  return (
                    <tr key={i} className={`border-b border-slate-50 ${isApproved ? 'bg-emerald-50/60' : rowBg(row.status)}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-semibold text-slate-800">{row.reference}</span>
                        {row.designation && <span className="block text-slate-400 text-xs">{row.designation}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">{row.matrix_quantity ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">{row.project_quantity ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">{fillLabel(row.matrix_type)}</td>
                      <td className="px-3 py-2.5 text-center">{fillLabel(row.project_type)}</td>
                      <td className="px-3 py-2.5 text-center">{statusCell(row.status)}</td>
                      {isAdmin && (
                        <td className="px-3 py-2.5 text-center">
                          {hasSamples ? (
                            <button
                              disabled={isBusy}
                              onClick={() => handleToggleApn(row.reference)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              } disabled:opacity-50`}
                            >
                              {isBusy
                                ? '…'
                                : isApproved
                                  ? '✓ Approuvé'
                                  : 'Approuver'}
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {isAdmin && approvedApns.size > 0 && (
            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700">
              ✓ {approvedApns.size} APN approuvé{approvedApns.size > 1 ? 's' : ''} — ces échantillons apparaîtront dans l'onglet Échantillons une fois le projet approuvé.
            </div>
          )}
        </div>
      )}
    </main>
  )
}

// ── Import Excel modal (Board Specification) ─────────────────────────────────

function ImportExcelModal({ onClose, onImported, initialTab = 'excel' }) {
  const [tab, setTab]               = useState(initialTab)   // 'excel' | 'matrix'
  // ── Excel (Board Specification) state ──
  const [file, setFile]             = useState(null)
  const [projectName, setProjectName] = useState('')
  const [client, setClient]         = useState(CLIENT_OPTIONS[0])
  const [comment, setComment]       = useState('')
  const [preview, setPreview]       = useState(null)
  const [result, setResult]         = useState(null)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState(null)
  const fileRef = useRef(null)
  // ── Matrix (CSV) state ──
  const [mFile, setMFile]           = useState(null)
  const [mDragging, setMDragging]   = useState(false)
  const [mBusy, setMBusy]           = useState(false)
  const [mResult, setMResult]       = useState(null)
  const [mError, setMError]         = useState(null)
  const mFileRef = useRef(null)

  const tabBtn = active =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`

  async function handleMatrixImport() {
    if (!mFile) { setMError('Sélectionnez un fichier CSV.'); return }
    setMBusy(true); setMError(null); setMResult(null)
    try {
      const r = await importMatrix(mFile)
      setMResult(r)
      onImported?.('matrix')
    } catch (err) {
      setMError(err?.response?.data?.error || "Erreur lors de l'import.")
    } finally { setMBusy(false) }
  }

  function handleMatrixDrop(e) {
    e.preventDefault(); setMDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.csv')) { setMFile(f); setMResult(null) }
  }

  async function handlePreview() {
    if (!file) { setError('Sélectionnez un fichier Excel (.xlsm).'); return }
    if (!projectName.trim()) { setError('Le nom du projet est requis.'); return }
    setBusy(true); setError(null)
    try {
      setPreview(await importProjectExcel({
        file, projectName: projectName.trim(), client, mode: 'preview', comment,
      }))
    } catch (err) {
      setError(err?.response?.data?.error || "Erreur lors de la lecture du fichier.")
    } finally { setBusy(false) }
  }

  async function handleConfirm() {
    setBusy(true); setError(null)
    try {
      const r = await importProjectExcel({
        file, projectName: projectName.trim(), client, mode: 'commit', comment,
      })
      setResult(r)
      onImported?.('excel')
    } catch (err) {
      setError(err?.response?.data?.error || "Erreur lors de l'import.")
    } finally { setBusy(false) }
  }

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center" size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx="4" maxH="92vh" display="flex" flexDirection="column">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Dialog.Title>Importer des données</Dialog.Title>
          </Dialog.Header>

          <div className="flex gap-1 px-5 py-3 border-b border-slate-100 shrink-0">
            <button className={tabBtn(tab === 'excel')} onClick={() => setTab('excel')}>Spécification Excel</button>
            <button className={tabBtn(tab === 'matrix')} onClick={() => setTab('matrix')}>Matrice CSV</button>
          </div>

          <Dialog.Body overflowY="auto" flex="1" spaceY="4">

            {/* ── Excel tab ── */}
            {tab === 'excel' && (
              <>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}

                {result ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-emerald-600 text-4xl">✓</div>
                    <p className="font-semibold text-slate-800">Import terminé</p>
                    <p className="text-sm text-slate-600">
                      <b>{result.created_samples}</b> échantillon(s) créé(s) —{' '}
                      <b>{result.created_matrix}</b> entrée(s) de matrice —{' '}
                      <b>{result.ignored}</b> ligne(s) ignorée(s)
                    </p>
                    <p className="text-xs text-slate-400">
                      Projet « {result.project_name} » — statut En attente
                    </p>
                    <Button colorPalette="blue" mx="auto" onClick={onClose}>Fermer</Button>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3">
                        <label className="label">Fichier Excel (.xlsm / .xlsx)</label>
                        <input ref={fileRef} type="file" accept=".xlsm,.xlsx" className="hidden"
                          onChange={e => { setFile(e.target.files[0] || null); setPreview(null) }} />
                        <button type="button" className="btn-secondary w-full justify-center"
                          onClick={() => fileRef.current?.click()}>
                          {file ? `📄 ${file.name}` : 'Choisir un fichier…'}
                        </button>
                        <p className="text-xs text-slate-400 mt-1">
                          Feuille « Board Specification » — en-têtes ligne 11, données à partir de la ligne 13.
                        </p>
                      </div>
                      <div>
                        <label className="label">Nom du projet</label>
                        <input className="input" value={projectName}
                          onChange={e => { setProjectName(e.target.value); setPreview(null) }}
                          placeholder="PRJ-2026-01" />
                      </div>
                      <div>
                        <label className="label">Client</label>
                        <select className="input" value={client} onChange={e => setClient(e.target.value)}>
                          {CLIENT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Statut</label>
                        <input className="input bg-slate-50 text-slate-500" value="En attente" disabled />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="label">Commentaire (appliqué à tous les échantillons)</label>
                        <textarea className="input resize-none" rows={2}
                          value={comment} onChange={e => setComment(e.target.value)}
                          placeholder="Optionnel — s'ajoute au commentaire de chaque ligne (colonne « Description / Comments » du fichier)…" />
                      </div>
                    </div>

                    {preview && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-sm">
                          <b>{preview.total}</b> échantillon(s) seront créés
                          {preview.ignored > 0 && (
                            <span className="text-amber-600"> — {preview.ignored} ligne(s) ignorée(s) (APN manquants)</span>
                          )}
                          {preview.truncated && (
                            <span className="text-slate-400"> — aperçu limité aux 100 premières lignes</span>
                          )}
                        </div>
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white">
                              <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                                <th className="px-3 py-2">Ligne</th>
                                <th className="px-3 py-2">APN (Holder)</th>
                                <th className="px-3 py-2">Equipment</th>
                                <th className="px-3 py-2">Component APN</th>
                                <th className="px-3 py-2">Customer ID</th>
                                <th className="px-3 py-2">Kit</th>
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2">Commentaire</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.rows.map(r => (
                                <tr key={r.row} className="border-b border-slate-50">
                                  <td className="px-3 py-1.5 text-slate-400">{r.row}</td>
                                  <td className="px-3 py-1.5 font-mono font-semibold">{r.apn}</td>
                                  <td className="px-3 py-1.5">{r.equipment || '—'}</td>
                                  <td className="px-3 py-1.5 font-mono">{r.component_apn || '—'}</td>
                                  <td className="px-3 py-1.5">{r.customer_id || '—'}</td>
                                  <td className="px-3 py-1.5">{r.kit || '—'}</td>
                                  <td className="px-3 py-1.5">{r.item || '—'}</td>
                                  <td className="px-3 py-1.5 text-slate-500 max-w-[180px] truncate" title={r.comments || ''}>
                                    {r.comments || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {preview.ignored_details?.length > 0 && (
                          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 max-h-20 overflow-y-auto">
                            {preview.ignored_details.map(d => (
                              <div key={d.row}>Ligne {d.row} : {d.reason}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── Matrix tab ── */}
            {tab === 'matrix' && (
              <>
                {mError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{mError}</p>}

                {mResult ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-emerald-600 text-4xl">✓</div>
                    <p className="font-semibold text-slate-800">Import terminé</p>
                    <p className="text-sm text-slate-600">
                      <b>{mResult.created}</b> créé(s), <b>{mResult.updated}</b> mis à jour.
                    </p>
                    {mResult.errors?.length > 0 && (
                      <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 max-h-24 overflow-y-auto text-left">
                        {mResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}
                    <Button colorPalette="blue" mx="auto" onClick={onClose}>Fermer</Button>
                  </div>
                ) : (
                  <>
                    <div
                      onDragOver={e => { e.preventDefault(); setMDragging(true) }}
                      onDragLeave={() => setMDragging(false)}
                      onDrop={handleMatrixDrop}
                      onClick={() => mFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        mDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                      }`}
                    >
                      <input ref={mFileRef} type="file" accept=".csv" className="hidden"
                        onChange={e => { setMFile(e.target.files[0] || null); setMResult(null) }} />
                      {mFile ? (
                        <div>
                          <p className="font-medium text-slate-700">{mFile.name}</p>
                          <p className="text-xs text-slate-400 mt-1">{(mFile.size / 1024).toFixed(1)} Ko</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-500 mb-1">Glissez un fichier CSV ici</p>
                          <p className="text-xs text-slate-400">ou cliquez pour parcourir</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                      <p className="font-medium text-slate-600 mb-1">Colonnes attendues :</p>
                      <code>reference, designation, quantity, sample_type, notes</code>
                    </div>
                  </>
                )}
              </>
            )}

          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100">
            {tab === 'excel' && !result && (
              <>
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                {!preview ? (
                  <Button colorPalette="blue" onClick={handlePreview} loading={busy} loadingText="Lecture…">Aperçu</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handlePreview} disabled={busy}>Relire le fichier</Button>
                    <Button colorPalette="blue" onClick={handleConfirm} disabled={busy || preview.total === 0}
                      loading={busy} loadingText="Import…">
                      Confirmer ({preview.total} échantillons)
                    </Button>
                  </>
                )}
              </>
            )}
            {tab === 'matrix' && !mResult && (
              <>
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                <Button colorPalette="blue" onClick={handleMatrixImport} disabled={mBusy || !mFile}
                  loading={mBusy} loadingText="Import…">
                  Importer
                </Button>
              </>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// ── Project list (main landing view) ─────────────────────────────────────────

function ProjectListView({ currentUser, onSelectProject }) {
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showMatrix, setShowMatrix]     = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [importTab, setImportTab]       = useState('excel')
  const [matrixReload, setMatrixReload] = useState(0)
  const [newName, setNewName]           = useState('')
  const [createError, setCreateError]   = useState(null)
  const [creating, setCreating]         = useState(false)
  const isAdmin = ['admin', 'etude_technique'].includes(currentUser?.role)

  const load = useCallback(async () => {
    setLoading(true)
    try { setProjects(await getValidationList()) } catch { /* ignore */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) { setCreateError('Le nom est obligatoire.'); return }
    setCreating(true); setCreateError(null)
    try {
      const p = await createProject(newName.trim())
      setProjects(prev => [...prev, p])
      setNewName(''); setShowCreate(false)
    } catch (err) {
      setCreateError(err?.response?.data?.error || 'Erreur lors de la création.')
    } finally { setCreating(false) }
  }

  // Derived stats
  const total    = projects.length
  const pending  = projects.filter(p => p.validation_status === 'pending').length
  const verified = projects.filter(p => p.validation_status === 'approved' && !p.approved_at).length
  const approved = projects.filter(p => !!p.approved_at).length

  const filtered = projects
    .filter(p => {
      if (filterStatus === 'pending')  return p.validation_status === 'pending'
      if (filterStatus === 'verified') return p.validation_status === 'approved' && !p.approved_at
      if (filterStatus === 'approved') return !!p.approved_at
      return true
    })
    .filter(p => !search || p.project_name.toLowerCase().includes(search.toLowerCase()))

  const STATUS_TABS = [
    { key: 'all',      label: 'Tous',        count: total },
    { key: 'pending',  label: 'En attente',  count: pending },
    { key: 'verified', label: 'Vérifiés',    count: verified },
    { key: 'approved', label: 'Approuvés',   count: approved },
  ]

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un projet…" className="input flex-1"
          />
          <div className="flex flex-wrap gap-2 shrink-0">
            {isAdmin && (
              <button className="btn-secondary flex items-center gap-2" onClick={() => setShowMatrix(v => !v)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {showMatrix ? 'Masquer matrice' : 'Gérer la matrice'}
              </button>
            )}
            {isAdmin && (
              <button className="btn-success flex items-center gap-2" onClick={() => { setImportTab('excel'); setShowImport(true) }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
                </svg>
                Importer
              </button>
            )}
            <button className="btn-primary flex items-center gap-2" onClick={() => { setShowCreate(true); setCreateError(null) }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau projet
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === t.key
                  ? t.key === 'approved' ? 'bg-emerald-600 text-white'
                    : t.key === 'verified' ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      {/* ── Create project panel ── */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-3 sm:p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Nouveau projet</p>
          <div className="flex gap-2 items-start flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                className="input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom du projet (ex: PRJ-2024-01)" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              {createError && <p className="text-xs text-red-600 mt-1">{createError}</p>}
            </div>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Création…' : 'Créer'}
            </button>
            <button className="btn-secondary" onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null) }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Matrix panel (collapsible, admin only) ── */}
      {showMatrix && isAdmin && (
        <MatrixPanel
          isAdmin={isAdmin}
          onRequestImport={() => { setImportTab('matrix'); setShowImport(true) }}
          reloadSignal={matrixReload}
        />
      )}

      {/* ── Import modal (Excel / Matrix tabs) ── */}
      {showImport && (
        <ImportExcelModal
          initialTab={importTab}
          onClose={() => { setShowImport(false); setImportTab('excel') }}
          onImported={src => {
            if (src === 'matrix') setMatrixReload(v => v + 1)
            else load()
          }}
        />
      )}

      {/* ── Stats row ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Projets total', value: total,    color: 'text-slate-700' },
            { label: 'En attente',    value: pending,  color: 'text-slate-500' },
            { label: 'Vérifiés',      value: verified, color: 'text-emerald-600' },
            { label: 'Approuvés',     value: approved, color: 'text-emerald-700' },
          ].map(c => <StatCard key={c.label} {...c} />)}
        </div>
      )}

      {/* ── Projects table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm text-slate-500">
            {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
            {filterStatus !== 'all' && <span className="ml-1 text-slate-400">· filtrés</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement des projets…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <p className="text-3xl">📋</p>
            <p className="text-sm">
              {projects.length === 0
                ? 'Aucun projet. Cliquez sur "Nouveau projet" pour commencer.'
                : 'Aucun projet ne correspond aux filtres sélectionnés.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nom du projet</th>
                  <th className="text-center px-3 py-3">Échantillons</th>
                  <th className="text-center px-3 py-3">Statut</th>
                  <th className="text-left px-3 py-3 hidden md:table-cell">Dernière vérification</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Date d'approbation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.project_name}
                    onClick={() => onSelectProject(p)}
                    className="border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.sample_count}</td>
                    <td className="px-3 py-3 text-center">{validationBadge(p.validation_status, p.approved_at)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs hidden md:table-cell">
                      {p.validated_at
                        ? <span>{fmt(p.validated_at)}{p.validated_by && <span className="ml-1 text-slate-300">· {p.validated_by}</span>}</span>
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs hidden lg:table-cell">
                      {p.approved_at
                        ? <span className="text-emerald-600">{fmt(p.approved_at)}{p.approved_by && <span className="ml-1 text-emerald-400">· {p.approved_by}</span>}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

// ── Top-level page ────────────────────────────────────────────────────────────

export default function TechnicalStudyPage({ currentUser }) {
  const [view, setView]                       = useState('list')
  const [selectedProject, setSelectedProject] = useState(null)
  const [projects, setProjects]               = useState(null)

  function handleStatusChanged(updated) {
    setProjects(prev => prev
      ? prev.map(p => p.project_name === updated.project_name ? { ...p, ...updated } : p)
      : prev
    )
    setSelectedProject(prev => prev ? { ...prev, ...updated } : prev)
  }

  if (view === 'project' && selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        currentUser={currentUser}
        onBack={() => { setSelectedProject(null); setView('list') }}
        onStatusChanged={handleStatusChanged}
      />
    )
  }

  return (
    <ProjectListView
      currentUser={currentUser}
      onSelectProject={p => { setSelectedProject(p); setView('project') }}
    />
  )
}
