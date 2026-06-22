import { useEffect, useRef, useState } from 'react'
import {
  getProcurementRequests, createProcurementRequest,
  updateProcurementRequest, deleteProcurementRequest,
} from '../../api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_META = {
  low:    { label: 'Faible',  cls: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Moyenne', cls: 'bg-blue-100 text-blue-700'   },
  high:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent',  cls: 'bg-red-100 text-red-700'     },
}

const STATUS_META = {
  pending:  { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approuvé',   cls: 'bg-green-100 text-green-700'   },
  rejected: { label: 'Rejeté',     cls: 'bg-red-100 text-red-700'       },
  ordered:  { label: 'Commandé',   cls: 'bg-blue-100 text-blue-700'     },
  received: { label: 'Reçu',       cls: 'bg-emerald-100 text-emerald-700' },
}

function Badge({ meta }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = { title: '', item_type: 'product', quantity: '1', unit: 'pcs', priority: 'medium', description: '', estimated_cost: '', invoice: null }

// ── Main component ────────────────────────────────────────────────────────────

export default function ProcurementPage({ currentUser }) {
  const [tab, setTab]           = useState('list')
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [deleting, setDeleting] = useState(null)
  const fileRef                 = useRef(null)

  useEffect(() => {
    getProcurementRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setError(null)
    setSuccess(null)
    setTab('form')
  }

  function openEdit(req) {
    setForm({
      title:          req.title,
      item_type:      req.item_type,
      quantity:       req.quantity,
      unit:           req.unit,
      priority:       req.priority,
      description:    req.description,
      estimated_cost: req.estimated_cost ?? '',
      invoice:        null,
    })
    setEditId(req.id)
    setError(null)
    setSuccess(null)
    setTab('form')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setSuccess(null); setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.estimated_cost) delete payload.estimated_cost
      const saved = editId
        ? await updateProcurementRequest(editId, payload)
        : await createProcurementRequest(payload)
      setRequests(prev =>
        editId
          ? prev.map(r => r.id === editId ? saved : r)
          : [saved, ...prev]
      )
      setSuccess(editId ? 'Demande mise à jour.' : 'Demande envoyée avec succès.')
      setEditId(null)
      setForm(EMPTY_FORM)
      if (fileRef.current) fileRef.current.value = ''
      setTab('list')
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(req) {
    if (!window.confirm(`Supprimer la demande « ${req.title} » ?`)) return
    setDeleting(req.id)
    try {
      await deleteProcurementRequest(req.id)
      setRequests(prev => prev.filter(r => r.id !== req.id))
    } catch {
    } finally {
      setDeleting(null)
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    ordered:  requests.filter(r => r.status === 'ordered').length,
  }

  return (
    <div className="max-w-screen-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Demandes d'achat</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gérez vos demandes de produits et services</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nouvelle demande
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,    color: 'text-slate-700'   },
          { label: 'En attente',value: stats.pending,  color: 'text-yellow-600'  },
          { label: 'Approuvé',  value: stats.approved, color: 'text-green-600'   },
          { label: 'Commandé',  value: stats.ordered,  color: 'text-blue-600'    },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[['list','Mes demandes'],['form', editId ? 'Modifier' : 'Nouvelle demande']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">Chargement…</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-slate-500 font-medium">Aucune demande</p>
              <p className="text-slate-400 text-sm mt-1">Cliquez sur « Nouvelle demande » pour commencer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Article / Service','Type','Qté','Priorité','Statut','Date','Facture','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                        <p className="truncate">{req.title}</p>
                        {req.description && <p className="text-xs text-slate-400 truncate mt-0.5">{req.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {req.item_type === 'product'
                          ? <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>Produit</span>
                          : <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Service</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{req.quantity} {req.unit}</td>
                      <td className="px-4 py-3"><Badge meta={PRIORITY_META[req.priority] ?? { label: req.priority, cls: 'bg-slate-100 text-slate-600' }} /></td>
                      <td className="px-4 py-3"><Badge meta={STATUS_META[req.status] ?? { label: req.status, cls: 'bg-slate-100 text-slate-600' }} /></td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmt(req.created_at)}</td>
                      <td className="px-4 py-3">
                        {req.has_invoice
                          ? <a href={req.invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Voir</a>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => openEdit(req)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                              <button onClick={() => handleDelete(req)} disabled={deleting === req.id} className="text-xs text-red-500 hover:underline disabled:opacity-50">
                                {deleting === req.id ? '…' : 'Supprimer'}
                              </button>
                            </>
                          )}
                          {req.status !== 'pending' && req.accounting_notes && (
                            <span className="text-xs text-slate-400 italic truncate max-w-[120px]" title={req.accounting_notes}>{req.accounting_notes}</span>
                          )}
                          {req.po_number && (
                            <span className="text-xs text-emerald-600 font-mono">BC#{req.po_number}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── FORM TAB ── */}
      {tab === 'form' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-5">
            {editId ? 'Modifier la demande' : 'Nouvelle demande d\'achat'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Article / Service <span className="text-red-500">*</span></label>
              <input required value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="Ex: Imprimante laser, Maintenance climatisation…"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Type + Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <div className="flex gap-3">
                  {[['product','Produit'],['service','Service']].map(([v, l]) => (
                    <label key={v} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm font-medium transition-colors ${form.item_type === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <input type="radio" name="item_type" value={v} checked={form.item_type === v} onChange={() => set('item_type', v)} className="sr-only" />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priorité</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                <input type="number" min="0.01" step="0.01" required value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="pcs, kg, L…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* Estimated cost */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coût estimé (optionnel)</label>
              <div className="relative">
                <input type="number" min="0" step="0.01" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">CNY</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description / Justification</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Pourquoi avez-vous besoin de cet article ?"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>

            {/* Invoice upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Facture / Devis (optionnel)</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={e => set('invoice', e.target.files[0] ?? null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              <p className="text-xs text-slate-400 mt-1">PDF, image ou Excel — max 10 Mo</p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Envoi…' : editId ? 'Enregistrer' : 'Soumettre la demande'}
              </button>
              <button type="button" onClick={() => { setTab('list'); setEditId(null); setError(null) }}
                className="px-4 py-2.5 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
