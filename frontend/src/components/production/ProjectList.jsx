import { useEffect, useState } from 'react'
import { useProject } from './hooks/useProject'
import TechStudyImportModal from './TechStudyImportModal'

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function validationBadge(status, approvedAt) {
  if (approvedAt) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">Approuvé ✓</span>
  if (status === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Vérifié ✓</span>
  if (status === 'rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Rejeté ✗</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">En attente</span>
}

// Sort: rejected first (needs attention), then pending, then verified, then approved
function attentionSort(projects) {
  return [...projects].sort((a, b) => {
    const rank = p => p.validation_status === 'rejected' ? 0 : !p.approved_at && p.validation_status === 'pending' ? 1 : !p.approved_at && p.validation_status === 'approved' ? 2 : 3
    return rank(a) - rank(b)
  })
}

const STAT_FILTERS = [
  { key: 'all',      label: 'Tous',       cls: 'text-slate-700',   activeCls: 'ring-2 ring-blue-400'     },
  { key: 'pending',  label: 'En attente', cls: 'text-slate-500',   activeCls: 'ring-2 ring-slate-400'   },
  { key: 'verified', label: 'Vérifiés',   cls: 'text-emerald-600', activeCls: 'ring-2 ring-emerald-400' },
  { key: 'approved', label: 'Approuvés',  cls: 'text-emerald-700', activeCls: 'ring-2 ring-emerald-600' },
]

export default function ProjectList({ currentUser, onSelectProject, onOpenMatrix }) {
  const { projects, loading, load, create } = useProject()
  const [search, setSearch]       = useState('')
  const [filterKey, setFilterKey] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [newName, setNewName]     = useState('')
  const [createError, setCreateError] = useState(null)
  const [creating, setCreating]   = useState(false)

  const isAdmin = ['admin', 'etude_technique'].includes(currentUser?.role)

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) { setCreateError('Le nom est obligatoire.'); return }
    setCreating(true); setCreateError(null)
    try {
      await create(newName.trim())
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

  const statCounts = { all: total, pending, verified, approved }

  const filtered = attentionSort(
    projects
      .filter(p => {
        if (filterKey === 'pending')  return p.validation_status === 'pending'
        if (filterKey === 'verified') return p.validation_status === 'approved' && !p.approved_at
        if (filterKey === 'approved') return !!p.approved_at
        return true
      })
      .filter(p => !search || p.project_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un projet…" className="input flex-1" />
          <div className="flex flex-wrap gap-2 shrink-0">
            {isAdmin && (
              <button className="btn-secondary flex items-center gap-2" onClick={onOpenMatrix}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Gérer la matrice
              </button>
            )}
            {isAdmin && (
              <button className="btn-success flex items-center gap-2" onClick={() => setShowImport(true)}>
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
      </div>

      {/* Clickable stat cards (act as filters) */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_FILTERS.map(s => (
            <button key={s.key} onClick={() => setFilterKey(s.key)}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 p-3 text-center transition-all hover:shadow-md ${filterKey === s.key ? s.activeCls : ''}`}>
              <div className={`text-2xl font-bold ${s.cls}`}>{statCounts[s.key]}</div>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Create project inline panel */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-3 sm:p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Nouveau projet</p>
          <div className="flex gap-2 items-start flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom du projet (ex: PRJ-2024-01)" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              {createError && <p className="text-xs text-red-600 mt-1">{createError}</p>}
            </div>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Création…' : 'Créer'}</button>
            <button className="btn-secondary" onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null) }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Projects table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm text-slate-500">
            {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
            {filterKey !== 'all' && <span className="ml-1 text-slate-400">· filtrés</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <p className="text-3xl">📋</p>
            <p className="text-sm">{projects.length === 0 ? 'Aucun projet. Cliquez sur "Nouveau projet" pour commencer.' : 'Aucun projet ne correspond aux filtres.'}</p>
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
                  <tr key={p.project_name} onClick={() => onSelectProject(p)}
                    className="border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.sample_count}</td>
                    <td className="px-3 py-3 text-center">{validationBadge(p.validation_status, p.approved_at)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs hidden md:table-cell">
                      {p.validated_at ? <span>{fmt(p.validated_at)}{p.validated_by && <span className="ml-1 text-slate-300">· {p.validated_by}</span>}</span> : '—'}
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

      {showImport && (
        <TechStudyImportModal
          onClose={() => setShowImport(false)}
          onImported={src => {
            if (src === 'excel') load()
          }}
        />
      )}
    </main>
  )
}
