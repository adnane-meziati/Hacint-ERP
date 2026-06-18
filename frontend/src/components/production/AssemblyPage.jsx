import { useCallback, useEffect, useRef, useState } from 'react'
import { getProjects, getSamples, resetAssembly, setAssemblyRework, setAssemblyStatus, setQualityRework } from '../../api/client'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%2394a3b8"%3E📷%3C/text%3E%3C/svg%3E'

const PAUSE_REASONS = [
  { value: 'manque_detail', label: 'Manque de détail' },
  { value: 'rework',        label: 'Rework' },
  { value: 'technical',     label: 'Problème technique' },
  { value: 'lunch',         label: 'Lunch' },
  { value: 'clock_out',     label: 'Clock out' },
]

function getLiveMinutes(sample, now) {
  const base = sample.assembly_time_spent_minutes || 0
  if (sample.assembly_status === 'ongoing' && sample.assembly_time_started) {
    const delta = Math.floor((now - new Date(sample.assembly_time_started)) / 60000)
    return base + Math.max(0, delta)
  }
  return base
}
function formatTime(minutes) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function PauseModal({ sample, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-sm p-6">
        <h3 className="font-semibold text-slate-800 text-lg mb-1">Justification de la pause</h3>
        <p className="text-sm text-slate-500 mb-4">
          <span className="font-medium text-slate-700">{sample.apn}</span>
          <span className="mx-1.5 text-slate-300">—</span>{sample.project}
        </p>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
          <option value="">Sélectionner une raison…</option>
          {PAUSE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary">Annuler</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason} className="btn-primary">⏸ Mettre en pause</button>
        </div>
      </div>
    </div>
  )
}

function ReworkModal({ sample, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-sm p-6">
        <h3 className="font-semibold text-slate-800 text-lg mb-1">Retourner en rework CNC</h3>
        <p className="text-sm text-slate-500 mb-5">
          Renvoyer <span className="font-medium text-slate-700">{sample.apn}</span> au technicien CNC pour correction ? Le chrono sera remis à zéro.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} className="btn-danger">↺ Confirmer rework</button>
        </div>
      </div>
    </div>
  )
}

export default function AssemblyPage({ currentUser }) {
  const [samples, setSamples]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null, page: 1 })
  const [now, setNow]               = useState(() => Date.now())

  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterDone, setFilterDone]       = useState('')
  const [filterDateFrom, setDateFrom]     = useState('')
  const [filterDateTo, setDateTo]         = useState('')
  const [projectOptions, setProjectOptions] = useState([])

  const [pauseTarget, setPauseTarget]   = useState(null)
  const [reworkTarget, setReworkTarget] = useState(null)
  const [busy, setBusy] = useState(null)
  const debounceRef   = useRef(null)
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination

  useEffect(() => { getProjects().then(setProjectOptions).catch(() => {}) }, [])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 10_000); return () => clearInterval(id) }, [])
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchSamples = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, assembly_view: 'true' }
      if (debouncedSearch)   params.search        = debouncedSearch
      if (filterProject)     params.project       = filterProject
      if (filterDone !== '') params.assembly_done = filterDone
      if (filterDateFrom)    params.date_from     = filterDateFrom
      if (filterDateTo)      params.date_to       = filterDateTo
      const data = await getSamples(params)
      setSamples(data.results)
      setPagination({ count: data.count, next: data.next, previous: data.previous, page })
    } finally { setLoading(false) }
  }, [debouncedSearch, filterProject, filterDone, filterDateFrom, filterDateTo])

  useEffect(() => { fetchSamples(1) }, [fetchSamples])
  useEffect(() => {
    const id = setInterval(() => fetchSamples(paginationRef.current.page), 15_000)
    return () => clearInterval(id)
  }, [fetchSamples])

  async function handleStatusChange(sample, newStatus, pauseReason = null) {
    setBusy(sample.id)
    try {
      const updated = await setAssemblyStatus(sample.id, newStatus, pauseReason)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally { setBusy(null) }
  }

  async function handleReworkConfirm() {
    const sample = reworkTarget; setReworkTarget(null); setBusy(sample.id)
    try {
      const updated = await setAssemblyRework(sample.id, true)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally { setBusy(null) }
  }

  async function handleCancelRework(sample) {
    setBusy(sample.id)
    try {
      const updated = await setAssemblyRework(sample.id, false)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally { setBusy(null) }
  }

  async function handleResetDone(sample) {
    setBusy(sample.id)
    try {
      const updated = await resetAssembly(sample.id)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally { setBusy(null) }
  }

  async function handleCancelQualityRework(sample) {
    setBusy(sample.id)
    try {
      const updated = await setQualityRework(sample.id, false)
      setSamples((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } finally { setBusy(null) }
  }

  const hasFilters = search || filterProject || filterDone !== '' || filterDateFrom || filterDateTo
  const totalPages = Math.ceil(pagination.count / 20)

  const reworkCount     = samples.filter((s) => s.is_assembly_rework).length
  const notStartedCount = samples.filter((s) => !s.is_assembly_rework && !s.assembly_done && !s.assembly_status).length
  const ongoingCount    = samples.filter((s) => !s.assembly_done && s.assembly_status === 'ongoing').length
  const standbyCount    = samples.filter((s) => !s.assembly_done && s.assembly_status === 'standby').length
  const doneCount       = samples.filter((s) => s.assembly_done).length

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher APN, projet, placement…" className="input" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
              {[{ value: '', label: 'Tous' }, { value: 'false', label: 'À faire' }, { value: 'true', label: 'Terminés' }].map((opt) => (
                <button key={opt.value} onClick={() => setFilterDone(opt.value)}
                  className={`px-3 py-2 transition-colors ${filterDone === opt.value ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >{opt.label}</button>
              ))}
            </div>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="input w-auto max-w-xs">
              <option value="">Tous les projets</option>
              {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={filterDateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-auto" />
            <input type="date" value={filterDateTo}   onChange={(e) => setDateTo(e.target.value)}   className="input w-auto" />
            {hasFilters && (
              <button onClick={() => { setSearch(''); setFilterProject(''); setFilterDone(''); setDateFrom(''); setDateTo('') }} className="btn-secondary text-xs">Réinitialiser</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        <StatCard label="Rework CNC"    value={reworkCount}     color="purple" note="en attente"     pulse={reworkCount > 0} />
        <StatCard label="Non commencé"  value={notStartedCount} color="slate"  note="sur cette page" />
        <StatCard label="En cours"      value={ongoingCount}    color="indigo" note="sur cette page" pulse={ongoingCount > 0} />
        <StatCard label="En pause"      value={standbyCount}    color="orange" note="sur cette page" />
        <StatCard label="Terminés"      value={doneCount}       color="green"  note="sur cette page" />
      </div>

      {/* ── Content ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">{pagination.count} échantillon{pagination.count !== 1 ? 's' : ''}</p>
          {reworkCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{reworkCount} rework CNC ↑</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : samples.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">Aucun échantillon</p>
            <p className="text-sm">Les échantillons en cours ou terminés par le CNC apparaîtront ici.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {samples.map((s) => (
                <AssemblyCard key={s.id} sample={s} now={now} busy={busy === s.id}
                  currentUserId={currentUser?.id}
                  onStatusChange={(st) => handleStatusChange(s, st)}
                  onPause={() => setPauseTarget(s)}
                  onRework={() => setReworkTarget(s)}
                  onCancelRework={() => handleCancelRework(s)}
                  onResetDone={() => handleResetDone(s)}
                  onCancelQualityRework={() => handleCancelQualityRework(s)} />
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-14">Photo</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">APN</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Projet</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Placement</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-16">Qté</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Statut asm.</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">Travailleurs</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Pause raison</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Temps</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">Date fin</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-20">BOM</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-64">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {samples.map((s) => (
                    <AssemblyRow key={s.id} sample={s} now={now} busy={busy === s.id}
                      currentUserId={currentUser?.id}
                      onStatusChange={(st) => handleStatusChange(s, st)}
                      onPause={() => setPauseTarget(s)}
                      onRework={() => setReworkTarget(s)}
                      onCancelRework={() => handleCancelRework(s)}
                      onResetDone={() => handleResetDone(s)}
                      onCancelQualityRework={() => handleCancelQualityRework(s)} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {pagination.page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => fetchSamples(pagination.page - 1)} disabled={!pagination.previous} className="btn-secondary disabled:opacity-40">â† Préc.</button>
              <button onClick={() => fetchSamples(pagination.page + 1)} disabled={!pagination.next}     className="btn-secondary disabled:opacity-40">Suiv. →</button>
            </div>
          </div>
        )}
      </div>

      {pauseTarget && (
        <PauseModal sample={pauseTarget}
          onConfirm={(reason) => { const s = pauseTarget; setPauseTarget(null); handleStatusChange(s, 'standby', reason) }}
          onCancel={() => setPauseTarget(null)} />
      )}
      {reworkTarget && (
        <ReworkModal sample={reworkTarget} onConfirm={handleReworkConfirm} onCancel={() => setReworkTarget(null)} />
      )}
    </main>
  )
}

// ─── Mobile card ──────────────────────────────────────────────────────────────
function AssemblyCard({ sample: s, now, busy, currentUserId, onStatusChange, onPause, onRework, onCancelRework, onResetDone, onCancelQualityRework }) {
  const liveMinutes = getLiveMinutes(s, now)
  const timeLabel   = formatTime(liveMinutes)
  const as_ = s.assembly_status
  const activeWorkers = s.assembly_active_workers || []
  const isActiveUser  = activeWorkers.some((w) => w.id === currentUserId)
  const activeNames   = activeWorkers.map((w) => w.name).join(', ')
  const workerDisplay = s.assembly_done ? s.assemblyDoneBy : activeNames || null

  return (
    <div className={`p-4 ${
      s.is_assembly_rework ? 'bg-purple-50/60 border-l-4 border-purple-400' :
      s.is_quality_rework  ? 'bg-teal-50/40 border-l-4 border-teal-400'    :
      s.assembly_done      ? 'bg-green-50/40'   :
      as_ === 'ongoing'    ? 'bg-indigo-50/40'  :
      as_ === 'standby'    ? 'bg-orange-50/30'  :
      'bg-white'
    }`}>
      <div className="flex gap-3">
        <img src={s.thumbnailUrl || PLACEHOLDER} alt={s.apn}
          className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
          onError={(e) => { e.target.src = PLACEHOLDER }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{s.apn}</p>
              {s.serial_number != null && <span className="text-xs text-slate-400 font-mono">#{s.serial_number}</span>}
            </div>
            <AssemblyStatusBadge status={as_} isDone={s.assembly_done} isRework={s.is_assembly_rework} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.project}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span>
            <span className="text-xs text-slate-500">×{s.quantity}</span>
            {s.is_assembly_rework && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-bold">↺ REWORK CNC</span>}
            {s.is_quality_rework && !s.is_assembly_rework && <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-xs font-bold">ðŸ” REWORK QUAL.</span>}
          </div>
        </div>
      </div>

      {(timeLabel || workerDisplay || (as_ === 'standby' && s.assemblyPauseReasonDisplay)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
          {timeLabel && <span className={`font-mono ${as_ === 'ongoing' && !s.assembly_done ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>⏱ {timeLabel}</span>}
          {workerDisplay && <span className={`font-medium ${s.assembly_done ? 'text-green-700' : as_ === 'ongoing' ? 'text-indigo-700' : 'text-orange-700'}`}>👤 {workerDisplay}</span>}
          {as_ === 'standby' && s.assemblyPauseReasonDisplay && (
            <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">⏸ {s.assemblyPauseReasonDisplay}</span>
          )}
          {s.assembly_done_date && <span className="text-slate-400">{new Date(s.assembly_done_date + 'T00:00:00').toLocaleDateString('fr-FR')}</span>}
        </div>
      )}

      <div className="mt-3">
        {busy ? (
          <div className="flex justify-center py-2"><div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : s.is_assembly_rework ? (
          <div className="space-y-2">
            <p className="text-xs text-purple-600 font-medium text-center bg-purple-50 rounded-lg py-2">En attente CNC…</p>
            <button onClick={onCancelRework} className="w-full py-2.5 text-sm border border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600 rounded-lg font-medium">✕ Annuler rework</button>
          </div>
        ) : s.assembly_done && !s.is_quality_rework ? (
          <div className="flex gap-2">
            <div className="flex-1 bg-green-50 text-green-700 text-sm font-medium text-center py-2.5 rounded-lg">✓ Assemblé</div>
            <button onClick={onResetDone} className="px-4 py-2.5 text-sm border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 rounded-lg font-medium">✕</button>
          </div>
        ) : (
          <div className="space-y-2">
            {s.is_quality_rework && (
              <div className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-2">
                <span className="text-xs text-teal-600 font-medium">ðŸ” Rework demandé par qualité</span>
                <button onClick={onCancelQualityRework} className="text-xs text-slate-400 hover:text-teal-600 ml-2 font-medium">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => onStatusChange('ongoing')} disabled={isActiveUser && as_ === 'ongoing'}
                className={`flex-1 py-2.5 text-sm rounded-lg border font-medium transition-colors ${isActiveUser && as_ === 'ongoing' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 cursor-default' : 'bg-white text-indigo-600 border-indigo-300 active:bg-indigo-50'}`}
              >{isActiveUser && as_ === 'ongoing' ? '▶ En cours' : as_ === 'ongoing' ? '+ Rejoindre' : '▶ Démarrer'}</button>
              <button onClick={onPause} disabled={as_ !== 'ongoing'}
                className={`px-4 py-2.5 text-sm rounded-lg border font-medium transition-colors ${as_ === 'ongoing' ? 'bg-white text-orange-600 border-orange-300 active:bg-orange-50' : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'}`}
              >⏸</button>
              <button onClick={() => onStatusChange('done')} className="flex-1 py-2.5 text-sm rounded-lg border bg-white text-green-600 border-green-300 active:bg-green-50 font-medium">✓ Terminé</button>
            </div>
            <button onClick={onRework} className="w-full py-2.5 text-sm border border-purple-300 text-purple-600 bg-white active:bg-purple-50 rounded-lg font-medium">↺ Rework CNC</button>
          </div>
        )}
      </div>
      {s.bomFileUrl && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <a href={s.bomFileUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 bg-green-50 font-medium">
            📊 Voir BOM Excel
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Desktop table row ────────────────────────────────────────────────────────
function AssemblyRow({ sample: s, now, busy, currentUserId, onStatusChange, onPause, onRework, onCancelRework, onResetDone, onCancelQualityRework }) {
  const liveMinutes = getLiveMinutes(s, now)
  const timeLabel   = formatTime(liveMinutes)
  const as_ = s.assembly_status
  const activeWorkers = s.assembly_active_workers || []
  const isActiveUser  = activeWorkers.some((w) => w.id === currentUserId)
  const activeNames   = activeWorkers.map((w) => w.name).join(', ')
  const workerDisplay = s.assembly_done ? s.assemblyDoneBy : activeNames || null

  return (
    <tr className={`transition-colors ${
      s.is_assembly_rework ? 'bg-purple-50/60 border-l-4 border-purple-400' :
      s.is_quality_rework  ? 'bg-teal-50/40 border-l-4 border-teal-400'    :
      s.assembly_done      ? 'bg-green-50/40'   :
      as_ === 'ongoing'    ? 'bg-indigo-50/40'  :
      as_ === 'standby'    ? 'bg-orange-50/30'  :
      'hover:bg-slate-50'
    }`}>
      <td className="px-4 py-3">
        <img src={s.thumbnailUrl || PLACEHOLDER} alt={s.apn}
          className="w-10 h-10 rounded object-cover bg-slate-100"
          onError={(e) => { e.target.src = PLACEHOLDER }} />
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{s.apn}</div>
        {s.serial_number != null && <div className="text-xs text-slate-400 font-mono">#{s.serial_number}</div>}
        {s.is_assembly_rework && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-bold">↺ REWORK CNC</span>}
        {s.is_quality_rework && !s.is_assembly_rework && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-xs font-bold">ðŸ” REWORK QUALITÉ</span>}
      </td>
      <td className="px-4 py-3 text-slate-600 max-w-xs"><span className="line-clamp-2 leading-snug">{s.project}</span></td>
      <td className="px-4 py-3"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{s.placement}</span></td>
      <td className="px-4 py-3 text-xs font-medium text-slate-700">{s.quantity}</td>
      <td className="px-4 py-3"><AssemblyStatusBadge status={as_} isDone={s.assembly_done} isRework={s.is_assembly_rework} /></td>
      <td className="px-4 py-3 text-xs">
        {workerDisplay ? <span className={`font-medium ${s.assembly_done ? 'text-green-700' : as_ === 'ongoing' ? 'text-indigo-700' : 'text-orange-700'}`}>{workerDisplay}</span> : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {as_ === 'standby' && s.assemblyPauseReasonDisplay
          ? <span className="inline-block px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">{s.assemblyPauseReasonDisplay}</span>
          : '—'}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">
        {timeLabel ? <span className={as_ === 'ongoing' && !s.assembly_done ? 'text-indigo-600 font-semibold' : ''}>{timeLabel}</span> : '—'}
      </td>
      <td className="px-4 py-3 text-slate-500 text-sm">
        {s.assembly_done_date ? new Date(s.assembly_done_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
      </td>
      <td className="px-4 py-3">
        {s.bomFileUrl
          ? <a href={s.bomFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 font-medium">📊 BOM</a>
          : <span className="text-xs text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3">
        {busy ? (
          <div className="inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        ) : s.is_assembly_rework ? (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-purple-600 font-medium">En attente CNC…</span>
            <button onClick={onCancelRework} className="text-xs rounded px-2 py-1 border bg-white text-slate-500 border-slate-300 hover:text-purple-600 hover:border-purple-300">✕ Annuler</button>
          </div>
        ) : s.assembly_done && !s.is_quality_rework ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-green-600 font-medium">✓ Assemblé</span>
            <button onClick={onResetDone} className="text-xs rounded px-2 py-1 border bg-white text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-300">✕ Annuler</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {s.is_quality_rework && (
              <div className="w-full flex items-center gap-1 mb-1">
                <span className="text-xs text-teal-600 font-medium">ðŸ” Rework demandé par qualité</span>
                <button onClick={onCancelQualityRework} className="text-xs rounded px-2 py-1 border bg-white text-slate-400 border-slate-200 hover:text-teal-600 hover:border-teal-300">✕ Annuler</button>
              </div>
            )}
            <button onClick={() => onStatusChange('ongoing')} disabled={isActiveUser && as_ === 'ongoing'}
              className={`text-xs rounded px-2 py-1 border transition-colors ${isActiveUser && as_ === 'ongoing' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 cursor-default' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
            >{isActiveUser && as_ === 'ongoing' ? '▶ En cours' : as_ === 'ongoing' ? '+ Rejoindre' : '▶ Démarrer'}</button>
            <button onClick={onPause} disabled={as_ !== 'ongoing'}
              className={`text-xs rounded px-2 py-1 border transition-colors ${as_ === 'ongoing' ? 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50' : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'}`}
            >⏸ Pause</button>
            <button onClick={() => onStatusChange('done')} className="text-xs rounded px-2 py-1 border bg-white text-green-600 border-green-300 hover:bg-green-50">✓ Terminé</button>
            <button onClick={onRework} className="text-xs rounded px-2 py-1 border bg-white text-purple-600 border-purple-300 hover:bg-purple-50">↺ Rework CNC</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function AssemblyStatusBadge({ status, isDone, isRework }) {
  if (isRework) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">↺ Rework CNC</span>
  if (isDone)   return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">✓ Assemblé</span>
  if (status === 'ongoing') return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
      </span>En cours
    </span>
  )
  if (status === 'standby') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">⏸ En pause</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">À faire</span>
}

const CARD_COLORS = {
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
  slate:  'border-slate-200 bg-slate-50 text-slate-600',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  green:  'border-green-200 bg-green-50 text-green-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
}
function StatCard({ label, value, color, note, pulse }) {
  const dotColor = color === 'purple' ? 'bg-purple-400' : 'bg-indigo-400'
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${CARD_COLORS[color]}`}>
      <div className="flex items-center gap-2">
        <p className="text-xs sm:text-sm font-medium opacity-80 leading-tight">{label}</p>
        {pulse && value > 0 && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
      {note && <p className="text-xs opacity-60 mt-0.5">{note}</p>}
    </div>
  )
}
