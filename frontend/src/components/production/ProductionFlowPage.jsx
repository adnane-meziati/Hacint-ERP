import { useEffect, useMemo, useState } from 'react'
import { getProjectFlow } from '../../api/client'
import { StatCard } from './_shared'

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_LABEL = {
  designer:   'Designer',
  programmer: 'Programmateur',
  cnc:        'CNC',
  assembly:   'Assemblage',
  quality:    'Qualité',
}

const STAGE_DOT = {
  designer:   'bg-blue-500',
  programmer: 'bg-violet-500',
  cnc:        'bg-orange-500',
  assembly:   'bg-teal-500',
  quality:    'bg-emerald-500',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function pctBar(pct) {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-blue-500'
}

function pctText(pct) {
  if (pct >= 80) return 'text-emerald-700'
  if (pct >= 50) return 'text-amber-600'
  return 'text-blue-700'
}

// ── Stage mini-cell (used in table rows) ──────────────────────────────────────

function MiniStage({ done, total, timeMinutes, isActive, isComplete }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = done === total
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-semibold leading-none ${
        allDone ? 'text-emerald-600' : isActive && !isComplete ? 'text-blue-700' : 'text-slate-600'
      }`}>
        {done}<span className="text-slate-400 font-normal text-xs">/{total}</span>
      </span>
      <div className="w-14 bg-slate-100 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all ${
            allDone ? 'bg-emerald-500' : isActive && !isComplete ? 'bg-blue-500' : 'bg-slate-300'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 leading-none">{fmtTime(timeMinutes)}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProductionFlowPage() {
  const [data, setData]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterStage, setFilterStage]   = useState('')
  const [sortBy, setSortBy]             = useState('pct_asc')

  useEffect(() => {
    setLoading(true)
    getProjectFlow()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const clients = useMemo(
    () => [...new Set(data.map(d => d.client).filter(Boolean))].sort(),
    [data]
  )

  const filtered = useMemo(() => {
    let list = data
    if (search)       list = list.filter(p => p.project.toLowerCase().includes(search.toLowerCase()))
    if (filterClient) list = list.filter(p => p.client === filterClient)
    if (filterStage)  list = list.filter(p => p.current_stage === filterStage)
    list = [...list]
    if (sortBy === 'pct_asc')  list.sort((a, b) => a.completion_pct - b.completion_pct)
    if (sortBy === 'pct_desc') list.sort((a, b) => b.completion_pct - a.completion_pct)
    if (sortBy === 'name')     list.sort((a, b) => a.project.localeCompare(b.project))
    if (sortBy === 'time')     list.sort((a, b) => b.total_time_minutes - a.total_time_minutes)
    return list
  }, [data, search, filterClient, filterStage, sortBy])

  // Summary stats
  const totalSamples = filtered.reduce((n, p) => n + p.total, 0)
  const totalTime    = filtered.reduce((n, p) => n + p.total_time_minutes, 0)
  const avgPct       = filtered.length
    ? Math.round(filtered.reduce((n, p) => n + p.completion_pct, 0) / filtered.length)
    : 0
  const done100      = filtered.filter(p => p.completion_pct === 100).length

  const hasFilter = search || filterClient || filterStage

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un projet…"
            className="input flex-1 min-w-0"
          />
          <div className="flex flex-wrap gap-2 shrink-0">
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input w-auto">
              <option value="">Tous les clients</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="input w-auto">
              <option value="">Toutes les phases</option>
              {Object.entries(STAGE_LABEL).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input w-auto">
              <option value="pct_asc">% croissant</option>
              <option value="pct_desc">% décroissant</option>
              <option value="name">Nom</option>
              <option value="time">Temps</option>
            </select>
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setFilterClient(''); setFilterStage('') }}
                className="btn-secondary text-xs"
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Projets" value={filtered.length} color="text-blue-700" />
          <StatCard label="Échantillons" value={totalSamples} color="text-slate-700" />
          <StatCard label="Complétion moyenne" value={`${avgPct}%`} color={pctText(avgPct)} />
          <StatCard label="Projets terminés" value={done100} color="text-emerald-700" note={`sur ${filtered.length}`} />
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Table header bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-slate-500">
            {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
          </p>
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            Flux de production par étape
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Aucun projet trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Projet</th>
                  <th className="px-3 py-2.5 text-center">Étude</th>
                  <th className="px-3 py-2.5 text-center">Designer</th>
                  <th className="px-3 py-2.5 text-center">Programmateur</th>
                  <th className="px-3 py-2.5 text-center">CNC</th>
                  <th className="px-3 py-2.5 text-center">Assemblage</th>
                  <th className="px-3 py-2.5 text-center">Qualité</th>
                  <th className="px-3 py-2.5 text-center">Temps total</th>
                  <th className="px-4 py-2.5 text-center min-w-[140px]">Complétion</th>
                  <th className="px-4 py-2.5 text-left">Phase active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => {
                  const isComplete = p.completion_pct === 100
                  const studyPct = p.total > 0 ? Math.round(((p.study?.done ?? 0) / p.total) * 100) : 0
                  return (
                    <tr key={p.project} className="hover:bg-slate-50/60 transition-colors">

                      {/* Project + client */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 whitespace-nowrap">{p.project}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {p.client && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{p.client}</span>
                          )}
                          <span className="text-xs text-slate-400">{p.total} éch.</span>
                        </div>
                      </td>

                      {/* Étude */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-sm font-semibold ${studyPct === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {p.study?.done ?? 0}<span className="text-slate-400 font-normal text-xs">/{p.total}</span>
                          </span>
                          <div className="w-14 bg-slate-100 rounded-full h-1">
                            <div className={`h-1 rounded-full ${studyPct === 100 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                              style={{ width: `${studyPct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">—</span>
                        </div>
                      </td>

                      {/* Designer */}
                      <td className="px-3 py-3 text-center">
                        <MiniStage
                          done={p.designer.done} total={p.total}
                          timeMinutes={p.designer.time_minutes}
                          isActive={p.current_stage === 'designer'} isComplete={isComplete}
                        />
                      </td>

                      {/* Programmer */}
                      <td className="px-3 py-3 text-center">
                        <MiniStage
                          done={p.programmer.done} total={p.total}
                          timeMinutes={p.programmer.time_minutes}
                          isActive={p.current_stage === 'programmer'} isComplete={isComplete}
                        />
                      </td>

                      {/* CNC */}
                      <td className="px-3 py-3 text-center">
                        <MiniStage
                          done={p.cnc.done} total={p.total}
                          timeMinutes={p.cnc.time_minutes}
                          isActive={p.current_stage === 'cnc'} isComplete={isComplete}
                        />
                      </td>

                      {/* Assembly */}
                      <td className="px-3 py-3 text-center">
                        <MiniStage
                          done={p.assembly.done} total={p.total}
                          timeMinutes={p.assembly.time_minutes}
                          isActive={p.current_stage === 'assembly'} isComplete={isComplete}
                        />
                      </td>

                      {/* Quality */}
                      <td className="px-3 py-3 text-center">
                        <MiniStage
                          done={p.quality.done} total={p.total}
                          timeMinutes={p.quality.time_minutes}
                          isActive={p.current_stage === 'quality'} isComplete={isComplete}
                        />
                      </td>

                      {/* Total time */}
                      <td className="px-3 py-3 text-center text-sm text-slate-600 font-medium whitespace-nowrap">
                        {fmtTime(p.total_time_minutes)}
                      </td>

                      {/* Completion % */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${pctBar(p.completion_pct)}`}
                              style={{ width: `${p.completion_pct}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${pctText(p.completion_pct)}`}>
                            {p.completion_pct}%
                          </span>
                        </div>
                      </td>

                      {/* Active stage */}
                      <td className="px-4 py-3">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ✓ Terminé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${STAGE_DOT[p.current_stage] ?? 'bg-slate-400'}`} />
                            {STAGE_LABEL[p.current_stage] ?? p.current_stage}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
