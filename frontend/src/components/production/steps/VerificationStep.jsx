import { useState } from 'react'
import { useVerification } from '../hooks/useVerification'
import TechStudyImportModal from '../TechStudyImportModal'

const FILL_LABELS = { full: 'Complet', empty: 'Vide', partial: 'Partiel', mixed: 'Mixte', '': '—' }
const fillLabel = v => FILL_LABELS[v] ?? v ?? '—'

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusCell(s) {
  if (s === 'matched')    return <span className="font-bold text-emerald-600" title="Conforme">✓</span>
  if (s === 'missing')    return <span className="font-bold text-red-600"     title="Manquant">✗</span>
  if (s === 'mismatched') return <span className="font-bold text-amber-500"   title="Écart">⚠</span>
  if (s === 'extra')      return <span className="font-bold text-purple-600"  title="Hors-matrice">+</span>
  return null
}

function rowBg(s) {
  if (s === 'missing')    return 'bg-red-50'
  if (s === 'mismatched') return 'bg-amber-50'
  if (s === 'extra')      return 'bg-purple-50'
  return ''
}

const RESULT_TABS = [
  { key: 'issues',    label: 'Problèmes' },
  { key: 'all',       label: 'Tout' },
  { key: 'matched',   label: 'Conformes' },
]

export default function VerificationStep({ projectName, isAdmin, validatedAt }) {
  const { result, running, error, approvedApns, approvingApn, run, toggleApn, allRows, summary } = useVerification(projectName)
  const [resultTab, setResultTab]   = useState('issues')
  const [showImport, setShowImport] = useState(false)

  const issueRows  = allRows.filter(r => r.status !== 'matched')
  const matchedRows = allRows.filter(r => r.status === 'matched')
  const visibleRows = resultTab === 'issues' ? issueRows : resultTab === 'matched' ? matchedRows : allRows

  const hasIssues = summary && (summary.missing + summary.mismatched + summary.extra) > 0
  const issueCount = summary ? summary.missing + summary.mismatched + summary.extra : 0

  return (
    <div className="space-y-3">
      {/* Run button + metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-secondary flex items-center gap-2" onClick={run} disabled={running}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {running ? 'Vérification…' : 'Lancer la vérification'}
          </button>

          {isAdmin && (
            <button
              className="btn-success flex items-center gap-2 text-sm"
              onClick={() => setShowImport(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
              </svg>
              Importer matrice CSV
            </button>
          )}

          {validatedAt && !result && (
            <p className="text-xs text-slate-400">Dernière vérification : {fmt(validatedAt)}</p>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
      </div>

      {showImport && (
        <TechStudyImportModal
          onClose={() => setShowImport(false)}
          onImported={src => { if (src === 'matrix') setShowImport(false) }}
        />
      )}

      {/* Verdict banner */}
      {result && summary && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
          hasIssues
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span className="text-xl">{hasIssues ? '⚠' : '✓'}</span>
          <div>
            <p className="font-semibold text-sm">
              {hasIssues ? `${issueCount} écart${issueCount > 1 ? 's' : ''} détecté${issueCount > 1 ? 's' : ''}` : 'Conforme — prêt à approuver'}
            </p>
            <p className="text-xs opacity-75">
              {summary.matched} conforme{summary.matched !== 1 ? 's' : ''} · {summary.missing} manquant{summary.missing !== 1 ? 's' : ''} · {summary.mismatched} écart{summary.mismatched !== 1 ? 's' : ''} · {summary.extra} hors-matrice
            </p>
          </div>
        </div>
      )}

      {/* Results table */}
      {allRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <p className="text-sm font-semibold text-slate-700">Tableau comparatif</p>
            <div className="flex gap-1">
              {RESULT_TABS.map(t => (
                <button key={t.key} onClick={() => setResultTab(t.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    resultTab === t.key ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {t.label}
                  {t.key === 'issues' && issueCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">{issueCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3 text-xs text-slate-400 ml-auto">
              <span><span className="font-bold text-emerald-600">✓</span> Conforme</span>
              <span><span className="font-bold text-red-600">✗</span> Manquant</span>
              <span><span className="font-bold text-amber-500">⚠</span> Écart</span>
              <span><span className="font-bold text-purple-600">+</span> Hors-matrice</span>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">
              {resultTab === 'issues' ? 'Aucun problème détecté.' : 'Aucun résultat.'}
            </p>
          ) : (
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
                  {visibleRows.map((row, i) => {
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
                              <button disabled={isBusy} onClick={() => toggleApn(row.reference)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  isApproved ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}>
                                {isBusy ? '…' : isApproved ? '✓ Approuvé' : 'Approuver'}
                              </button>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {isAdmin && approvedApns.size > 0 && (
            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700">
              ✓ {approvedApns.size} APN approuvé{approvedApns.size > 1 ? 's' : ''} — visibles dans Échantillons une fois le projet approuvé.
            </div>
          )}
        </div>
      )}

      {!result && !running && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 text-center py-10 text-slate-400">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm">Cliquez sur "Lancer la vérification" pour comparer le projet à la matrice.</p>
        </div>
      )}
    </div>
  )
}
