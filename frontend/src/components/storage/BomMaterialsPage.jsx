import { useEffect, useState } from 'react'
import { getBomAggregate, getProjects } from '../../api/client'

const BOM_UNITS = {
  pcs: 'Pièces', m: 'Mètre', m2: 'Mètre²',
  kg: 'Kilogramme', g: 'Gramme', l: 'Litre', mm: 'Millimètre',
}

export default function BomMaterialsPage() {
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(false)
  const [project, setProject]           = useState('')
  const [projectOptions, setProjectOptions] = useState([])
  const [search, setSearch]             = useState('')
  const [error, setError]               = useState(null)

  useEffect(() => {
    getProjects().then(setProjectOptions).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getBomAggregate(project)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err?.response?.data?.error ?? 'Erreur de chargement.'))
      .finally(() => setLoading(false))
  }, [project])

  const filtered = search.trim()
    ? rows.filter((r) =>
        r.reference.toLowerCase().includes(search.toLowerCase()) ||
        (r.designation ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : rows

  const totalComponents = filtered.length
  const totalQty = filtered.reduce((acc, r) => acc + parseFloat(r.total_qty ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">BOM — Matériaux & Composants</h2>
          <p className="text-sm text-slate-500">Agrégation de toutes les nomenclatures par projet</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Composants distincts</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{totalComponents}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Quantité totale agrégée</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{parseFloat(totalQty.toFixed(3))}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher référence, désignation…"
            className="input"
          />
        </div>
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="input w-auto"
        >
          <option value="">Tous les projets</option>
          {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {(search || project) && (
          <button onClick={() => { setSearch(''); setProject('') }} className="btn-secondary text-xs">Réinitialiser</button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm text-slate-500">{filtered.length} composant{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">Aucun composant</p>
            <p className="text-sm">Ajoutez des lignes BOM dans la vue Designer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Référence</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Désignation</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Qté totale</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Unité</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Échantillons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{row.reference}</td>
                    <td className="px-4 py-3 text-slate-700">{row.designation || '—'}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{parseFloat(row.total_qty)}</td>
                    <td className="px-4 py-3 text-slate-500">{BOM_UNITS[row.unit] ?? row.unit}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(row.samples ?? []).map((apn, j) => (
                          <span key={j} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-mono">
                            {apn}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
