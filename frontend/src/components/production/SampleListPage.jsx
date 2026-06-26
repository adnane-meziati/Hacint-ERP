import { useCallback, useEffect, useRef, useState } from 'react'
import { exportCsvUrl, getSamples } from '../../api/client'
import DetailModal from './DetailModal'

const STATUS_TABS = [
  { key: '',         label: 'Tous' },
  { key: 'pending',  label: 'En attente' },
  { key: 'approved', label: 'Approuvés' },
  { key: 'archived', label: 'Archivés' },
]

const ROW_META = {
  pending:  { border: 'border-l-blue-400',    icon: '○', label: 'En attente', cls: 'text-blue-600'    },
  approved: { border: 'border-l-emerald-400', icon: '✓', label: 'Approuvé',   cls: 'text-emerald-600' },
  rejected: { border: 'border-l-red-400',     icon: '✗', label: 'Rejeté',     cls: 'text-red-600'     },
  archived: { border: 'border-l-slate-300',   icon: '·', label: 'Archivé',    cls: 'text-slate-400'   },
}

const FILL_LABELS = { full: 'Complet', empty: 'Vide', partial: 'Partiel', mixed: 'Mixte' }

export default function SampleListPage() {
  const [samples, setSamples]               = useState([])
  const [pagination, setPagination]         = useState({ count: 0, next: null, previous: null, page: 1 })
  const [loading, setLoading]               = useState(false)
  const [search, setSearch]                 = useState('')
  const [debouncedSearch, setDebounced]     = useState('')
  const [activeTab, setActiveTab]           = useState('')
  const [showFilters, setShowFilters]       = useState(false)
  const [filterProject, setFilterProject]   = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')
  const [selectedSample, setSelectedSample] = useState(null)
  const [projectOptions, setProjectOptions] = useState([])
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchSamples = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, approved_only: 'true' }
      if (debouncedSearch) params.search    = debouncedSearch
      if (activeTab)       params.status    = activeTab
      if (filterProject)   params.project   = filterProject
      if (filterDateFrom)  params.date_from = filterDateFrom
      if (filterDateTo)    params.date_to   = filterDateTo
      const data = await getSamples(params)
      setSamples(data.results)
      setPagination({ count: data.count, next: data.next, previous: data.previous, page: p })
      if (p === 1 && !filterProject && !activeTab && !debouncedSearch) {
        setProjectOptions(prev => {
          const names = [...new Set([...prev, ...data.results.map(s => s.project).filter(Boolean)])].sort()
          return names
        })
      }
    } finally { setLoading(false) }
  }, [debouncedSearch, activeTab, filterProject, filterDateFrom, filterDateTo])

  useEffect(() => { fetchSamples(1) }, [fetchSamples])

  const buildExportUrl = () => {
    const p = { approved_only: 'true' }
    if (debouncedSearch) p.search    = debouncedSearch
    if (activeTab)       p.status    = activeTab
    if (filterProject)   p.project   = filterProject
    if (filterDateFrom)  p.date_from = filterDateFrom
    if (filterDateTo)    p.date_to   = filterDateTo
    return exportCsvUrl(p)
  }

  const hasFilters = search || filterProject || filterDateFrom || filterDateTo || activeTab

  function resetFilters() {
    setSearch(''); setActiveTab(''); setFilterProject('')
    setFilterDateFrom(''); setFilterDateTo('')
  }

  const totalPages = Math.ceil(pagination.count / 20)

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3">

      {/* Summary line */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{pagination.count}</span>
          {' '}échantillon{pagination.count !== 1 ? 's' : ''} disponibles
          <span className="ml-2 text-xs text-slate-400">· projets approuvés uniquement</span>
        </p>
        <a href={buildExportUrl()} download className="btn-success text-xs">Exporter CSV</a>
      </div>

      {/* Search + tabs + filter toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 space-y-3">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher… APN, N° série, projet, placement, client"
          className="input w-full" autoComplete="off"
        />

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >{t.label}</button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showFilters || filterProject || filterDateFrom || filterDateTo
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtres{(filterProject || filterDateFrom || filterDateTo) ? ' ·' : ''}
          </button>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-slate-600 px-2">
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Projet</label>
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                className="input text-xs w-auto max-w-[180px]">
                <option value="">Tous les projets</option>
                {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div><label className="label">Du</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input text-xs w-auto" /></div>
              <div><label className="label">au</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input text-xs w-auto" /></div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="text-center py-16 text-slate-400 text-sm">Chargement…</p>
        ) : samples.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="text-sm">{hasFilters ? 'Aucun résultat pour ces filtres.' : 'Aucun échantillon disponible.'}</p>
            <p className="text-xs text-slate-300">Seuls les échantillons issus de projets approuvés apparaissent ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="px-4 py-3">APN</th>
                  <th className="px-3 py-3 text-center">N° série</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Projet</th>
                  <th className="px-3 py-3 text-center">Qté</th>
                  <th className="px-3 py-3 text-center">Connecteur</th>
                  <th className="px-3 py-3 text-center">Placement</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {samples.map(s => {
                  const meta = ROW_META[s.status] ?? ROW_META.pending
                  return (
                    <tr key={s.id} onClick={() => setSelectedSample(s)}
                      className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${meta.border}`}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{s.apn}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                        {s.serial_number != null ? `#${s.serial_number}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[200px]">
                        <div className="truncate">{s.description || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-medium">{s.project || '—'}</td>
                      <td className="px-3 py-2.5 text-center">{s.quantity}</td>
                      <td className="px-3 py-2.5 text-center">{FILL_LABELS[s.connector_fill] ?? (s.connector_fill || '—')}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{s.placement || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{s.client || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 font-medium ${meta.cls}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {pagination.page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => fetchSamples(pagination.page - 1)} disabled={!pagination.previous}
                className="btn-secondary text-xs disabled:opacity-40">← Préc.</button>
              <button onClick={() => fetchSamples(pagination.page + 1)} disabled={!pagination.next}
                className="btn-secondary text-xs disabled:opacity-40">Suiv. →</button>
            </div>
          </div>
        )}
      </div>

      {selectedSample && (
        <DetailModal sampleId={selectedSample.id} onClose={() => setSelectedSample(null)} />
      )}
    </main>
  )
}
