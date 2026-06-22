import { useEffect, useState } from 'react'
import {
  getProcurementRequests,
  approveProcurementRequest,
  rejectProcurementRequest,
  updateProcurementRequest,
} from '../../api/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_META = {
  low:    { label: 'Faible',  cls: 'bg-slate-100 text-slate-600'    },
  medium: { label: 'Moyenne', cls: 'bg-blue-100 text-blue-700'      },
  high:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-700'  },
  urgent: { label: 'Urgent',  cls: 'bg-red-100 text-red-700'        },
}

const STATUS_META = {
  pending:  { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700'   },
  approved: { label: 'Approuvé',   cls: 'bg-green-100 text-green-700'     },
  rejected: { label: 'Rejeté',     cls: 'bg-red-100 text-red-700'         },
  ordered:  { label: 'Commandé',   cls: 'bg-blue-100 text-blue-700'       },
  received: { label: 'Reçu',       cls: 'bg-emerald-100 text-emerald-700' },
}

const MODULE_LABELS = {
  production: 'Production', storage: 'Stockage', accounting: 'Comptabilité',
  hr: 'RH', logistics: 'Logistique', installation: 'Installation', sales: 'Ventes',
}

function Badge({ meta }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Action modal ──────────────────────────────────────────────────────────────

function ActionModal({ req, action, onConfirm, onClose }) {
  const [notes, setNotes]   = useState('')
  const [poNum, setPoNum]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const isApprove = action === 'approve'

  async function handleConfirm() {
    setSaving(true); setError(null)
    try {
      const payload = { accounting_notes: notes }
      if (isApprove && poNum) payload.po_number = poNum
      await onConfirm(payload)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className={`text-base font-semibold ${isApprove ? 'text-green-700' : 'text-red-700'}`}>
          {isApprove ? 'Approuver la demande' : 'Rejeter la demande'}
        </h3>

        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-slate-800">{req.title}</p>
          <p className="text-slate-500">{req.module_display} · {req.quantity} {req.unit} · {req.item_type_display}</p>
          <p className="text-slate-500">Demandé par <span className="font-medium">{req.requested_by}</span> le {fmt(req.created_at)}</p>
        </div>

        {isApprove && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              N° Bon de commande <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              value={poNum}
              onChange={e => setPoNum(e.target.value)}
              placeholder="Ex: BC-2026-001"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {isApprove ? 'Notes comptabilité' : 'Motif du rejet'} {!isApprove && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isApprove ? 'Budget alloué, conditions…' : 'Expliquez la raison du rejet…'}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleConfirm}
            disabled={saving || (!isApprove && !notes.trim())}
            className={`flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {saving ? '…' : isApprove ? 'Approuver' : 'Rejeter'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProcurementAccountingTab() {
  const [tab, setTab]           = useState('demands')
  const [all, setAll]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // { req, action }
  const [filterMod, setFilterMod] = useState('')
  const [filterPri, setFilterPri] = useState('')

  useEffect(() => {
    getProcurementRequests()
      .then(setAll)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function update(saved) {
    setAll(prev => prev.map(r => r.id === saved.id ? saved : r))
  }

  async function handleApprove(payload) {
    const saved = await approveProcurementRequest(modal.req.id, payload)
    update(saved)
  }

  async function handleReject(payload) {
    const saved = await rejectProcurementRequest(modal.req.id, payload)
    update(saved)
  }

  async function handleStatusChange(req, status) {
    const saved = await updateProcurementRequest(req.id, { status })
    update(saved)
  }

  // Pending demands for Tab 1
  const demands = all.filter(r => r.status === 'pending')

  // Approved/ordered/received for Tab 2
  const orders = all.filter(r => ['approved', 'ordered', 'received'].includes(r.status))

  function applyFilters(list) {
    return list.filter(r => {
      if (filterMod && r.module !== filterMod) return false
      if (filterPri && r.priority !== filterPri) return false
      return true
    })
  }

  const filteredDemands = applyFilters(demands)
  const filteredOrders  = applyFilters(orders)

  // Stats
  const stats = {
    pending:  demands.length,
    approved: all.filter(r => r.status === 'approved').length,
    ordered:  all.filter(r => r.status === 'ordered').length,
    received: all.filter(r => r.status === 'received').length,
  }

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Achats — Demandes d'achat</h1>
        <p className="text-sm text-slate-500 mt-0.5">Approuvez ou rejetez les demandes des responsables de modules</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'En attente', value: stats.pending,  color: 'text-yellow-600' },
          { label: 'Approuvé',   value: stats.approved, color: 'text-green-600'  },
          { label: 'Commandé',   value: stats.ordered,  color: 'text-blue-600'   },
          { label: 'Reçu',       value: stats.received, color: 'text-emerald-600'},
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[['demands', `Demandes en attente (${stats.pending})`], ['orders', 'Bons de commande']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterMod} onChange={e => setFilterMod(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
          <option value="">Tous les modules</option>
          {Object.entries(MODULE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterPri} onChange={e => setFilterPri(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
          <option value="">Toutes les priorités</option>
          {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
      </div>

      {/* ── TAB: DEMANDS ── */}
      {tab === 'demands' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">Chargement…</div>
          ) : filteredDemands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p className="text-slate-500 font-medium">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Module','Article / Service','Type','Qté','Priorité','Coût estimé','Demandé par','Date','Facture','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDemands.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {req.module_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="font-medium text-slate-800 truncate">{req.title}</p>
                        {req.description && <p className="text-xs text-slate-400 truncate mt-0.5">{req.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{req.item_type_display}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{req.quantity} {req.unit}</td>
                      <td className="px-4 py-3"><Badge meta={PRIORITY_META[req.priority] ?? { label: req.priority, cls: 'bg-slate-100 text-slate-600' }} /></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {req.estimated_cost ? `${parseFloat(req.estimated_cost).toLocaleString('fr-FR')} ¥` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{req.requested_by}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(req.created_at)}</td>
                      <td className="px-4 py-3">
                        {req.has_invoice
                          ? <a href={req.invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs font-medium">Voir</a>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModal({ req, action: 'approve' })}
                            className="px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => setModal({ req, action: 'reject' })}
                            className="px-2.5 py-1 border border-red-300 text-red-600 text-xs font-medium rounded-md hover:bg-red-50 transition-colors"
                          >
                            Rejeter
                          </button>
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

      {/* ── TAB: ORDERS ── */}
      {tab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">Chargement…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              <p className="text-slate-500 font-medium">Aucun bon de commande</p>
              <p className="text-slate-400 text-sm mt-1">Les demandes approuvées apparaîtront ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['N° BC','Module','Article / Service','Qté','Priorité','Coût estimé','Statut','Approuvé par','Date approbation','Facture','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-700 whitespace-nowrap">
                        {req.po_number ? `BC-${req.po_number}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {req.module_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="font-medium text-slate-800 truncate">{req.title}</p>
                        {req.accounting_notes && (
                          <p className="text-xs text-slate-400 truncate mt-0.5" title={req.accounting_notes}>{req.accounting_notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{req.quantity} {req.unit}</td>
                      <td className="px-4 py-3"><Badge meta={PRIORITY_META[req.priority] ?? { label: req.priority, cls: 'bg-slate-100 text-slate-600' }} /></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {req.estimated_cost ? `${parseFloat(req.estimated_cost).toLocaleString('fr-FR')} ¥` : '—'}
                      </td>
                      <td className="px-4 py-3"><Badge meta={STATUS_META[req.status] ?? { label: req.status, cls: 'bg-slate-100 text-slate-600' }} /></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{req.reviewed_by ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(req.reviewed_at)}</td>
                      <td className="px-4 py-3">
                        {req.has_invoice
                          ? <a href={req.invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs font-medium">Voir</a>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {req.status === 'approved' && (
                            <button
                              onClick={() => handleStatusChange(req, 'ordered')}
                              className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              Marquer commandé
                            </button>
                          )}
                          {req.status === 'ordered' && (
                            <button
                              onClick={() => handleStatusChange(req, 'received')}
                              className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
                            >
                              Marquer reçu
                            </button>
                          )}
                          {req.status === 'received' && (
                            <span className="text-xs text-emerald-600 font-medium">✓ Reçu</span>
                          )}
                          <button
                            onClick={() => setModal({ req, action: 'reject' })}
                            className="text-xs text-red-500 hover:underline whitespace-nowrap"
                          >
                            Annuler
                          </button>
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

      {/* Action modal */}
      {modal && (
        <ActionModal
          req={modal.req}
          action={modal.action}
          onConfirm={modal.action === 'approve' ? handleApprove : handleReject}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
