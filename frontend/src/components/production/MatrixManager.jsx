import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createMatrixEntry, deleteMatrixEntry, getMatrix, importMatrix, updateMatrixEntry,
} from '../../api/client'

const FILL_OPTIONS = [
  { value: 'full',    label: 'Complet (toutes broches)' },
  { value: 'empty',   label: 'Vide (aucune broche)' },
  { value: 'partial', label: 'Partiel (broches partielles)' },
]
const FILL_LABELS = { full: 'Complet', empty: 'Vide', partial: 'Partiel', mixed: 'Mixte', '': '—' }
const fillLabel = v => FILL_LABELS[v] ?? v ?? '—'

const EMPTY_FORM = { reference: '', designation: '', quantity: 1, sample_type: '', notes: '' }

export default function MatrixManager({ isAdmin, reloadSignal, onRequestCsvImport }) {
  const [entries, setEntries]           = useState([])
  const [loading, setLoading]           = useState(false)
  const [showForm, setShowForm]         = useState(false)
  const [editId, setEditId]             = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [formError, setFormError]       = useState(null)
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await getMatrix()
      setEntries(Array.isArray(raw) ? raw : (raw?.results ?? []))
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (reloadSignal !== undefined) load() }, [reloadSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); setFormError(null) }
  function openEdit(e) { setEditId(e.id); setForm({ reference: e.reference, designation: e.designation, quantity: e.quantity, sample_type: e.sample_type, notes: e.notes }); setShowForm(true); setFormError(null) }

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

  async function handleInlineImport(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportResult(null)
    try { const r = await importMatrix(file); setImportResult(r); load() }
    catch (err) { setImportResult({ error: err?.response?.data?.error || "Erreur lors de l'import." }) }
    finally { setImporting(false); e.target.value = '' }
  }

  const f = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

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
              onClick={() => onRequestCsvImport ? onRequestCsvImport() : fileRef.current?.click()}
              disabled={importing}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {importing ? 'Import…' : 'Importer CSV'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleInlineImport} />
            <button className="btn-primary text-xs px-2 py-1" onClick={openNew}>+ Ajouter</button>
          </div>
        )}
      </div>

      {importResult && (
        <div className={`px-4 py-2 text-xs border-b ${importResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {importResult.error ? importResult.error : `Import terminé : ${importResult.created} créé(s), ${importResult.updated} mis à jour.`}
          {importResult.errors?.map((e, i) => <div key={i} className="mt-0.5 text-amber-700">{e}</div>)}
        </div>
      )}

      {showForm && isAdmin && (
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/40">
          <p className="text-xs font-semibold text-slate-600 mb-2">{editId ? 'Modifier' : 'Nouvelle entrée'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Référence (APN) *</label>
              <input className="input text-xs" value={form.reference} onChange={f('reference')} placeholder="ex: 12345678AB" autoFocus />
            </div>
            <div><label className="label">Quantité</label>
              <input className="input text-xs" type="number" min="1" value={form.quantity} onChange={f('quantity')} /></div>
            <div><label className="label">Type connecteur</label>
              <select className="input text-xs" value={form.sample_type} onChange={f('sample_type')}>
                <option value="">Non spécifié</option>
                {FILL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
            <div className="col-span-2 sm:col-span-3">
              <label className="label">Désignation</label>
              <input className="input text-xs" value={form.designation} onChange={f('designation')} placeholder="Description (optionnel)" />
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
