import { useCallback, useEffect, useState } from 'react'
import { createProjectSample, deleteProjectSample, getProjectSamples } from '../../../api/client'

const FILL_OPTIONS = [
  { value: 'full',    label: 'Complet (toutes broches)' },
  { value: 'empty',   label: 'Vide (aucune broche)' },
  { value: 'partial', label: 'Partiel (broches partielles)' },
]
const FILL_LABELS   = { full: 'Complet', empty: 'Vide', partial: 'Partiel', mixed: 'Mixte', '': '—' }
const CLIENT_OPTIONS = ['Aptiv', 'Yazaki', 'Lear', 'Renault', 'Stellantis', 'Sumitomo', 'Other']
const PLACEMENT_RE  = /^[A-Z][0-9]{1,2}$/

function AddSampleForm({ projectName, onAdded, onCancel }) {
  const [form, setForm] = useState({ apn: '', quantity: 1, connector_fill: 'empty', placement: 'A1', client: 'Other' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const f = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

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

export default function SamplesStep({ projectName, isApproved }) {
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSamples(await getProjectSamples(projectName)) } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [projectName])

  useEffect(() => { load() }, [load])

  async function handleDelete(s) {
    if (!window.confirm(`Supprimer ${s.apn} ?`)) return
    try {
      await deleteProjectSample(projectName, s.id)
      setSamples(prev => prev.filter(x => x.id !== s.id))
    } catch { alert('Erreur lors de la suppression.') }
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
          <AddSampleForm projectName={projectName}
            onAdded={s => { setSamples(prev => [...prev, s]); setShowForm(false) }}
            onCancel={() => setShowForm(false)} />
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
                <th className="px-3 py-2 text-center">Statut étude</th>
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
                  <td className="px-3 py-2 text-slate-500 max-w-[240px]">
                    <div className="truncate">{s.description || '—'}</div>
                    {s.commentaire && <div className="truncate text-slate-400 italic">{s.commentaire}</div>}
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
