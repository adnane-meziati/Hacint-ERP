import { useState } from 'react'
import { approveValidation, updateProjectStatus } from '../../../api/client'

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function validationBadge(status, approvedAt) {
  if (approvedAt)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">Approuvé ✓</span>
  if (status === 'approved')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Vérifié ✓</span>
  if (status === 'rejected')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Rejeté ✗</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">En attente</span>
}

export default function ApprovalStep({ project, isAdmin, onProjectUpdated }) {
  const projectName  = project.project_name
  const finallyApproved = !!project.approved_at
  const valStatus    = project.validation_status

  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [approving, setApproving]         = useState(false)
  const [approveError, setApproveError]   = useState(null)

  const [showReset, setShowReset]         = useState(false)
  const [resetStatus, setResetStatus]     = useState('pending')
  const [resetting, setResetting]         = useState(false)
  const [resetError, setResetError]       = useState(null)

  async function handleApprove() {
    setApproving(true); setApproveError(null)
    try {
      const v = await approveValidation(projectName)
      onProjectUpdated?.({ ...project, ...v })
      setConfirmOpen(false)
    } catch (err) {
      setApproveError(err?.response?.data?.error || "Erreur lors de l'approbation.")
    } finally { setApproving(false) }
  }

  async function handleReset() {
    setResetting(true); setResetError(null)
    try {
      const updated = await updateProjectStatus(projectName, { validation_status: resetStatus })
      onProjectUpdated?.({ ...project, ...updated, approved_at: null, approved_by: null })
      setShowReset(false)
    } catch (err) {
      setResetError(err?.response?.data?.error || 'Erreur lors de la mise à jour.')
    } finally { setResetting(false) }
  }

  return (
    <div className="space-y-3">

      {/* Status card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <p className="text-sm font-semibold text-slate-700">Statut du projet</p>
          {validationBadge(valStatus, project.approved_at)}
        </div>

        {finallyApproved ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800">
            <p className="font-semibold">✓ Projet approuvé</p>
            <p className="text-xs mt-1 text-emerald-700">
              Les échantillons de ce projet sont maintenant visibles dans l'onglet Échantillons.
              {project.approved_at && <> · Approuvé le {fmt(project.approved_at)}{project.approved_by ? ` par ${project.approved_by}` : ''}.</>}
            </p>
          </div>
        ) : valStatus === 'approved' ? (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            <p>La vérification est réussie. Approuvez le projet pour le rendre visible dans l'onglet Échantillons.</p>
          </div>
        ) : valStatus === 'rejected' ? (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
            <p>Ce projet a des écarts avec la matrice.
              {isAdmin ? ' En tant qu\'administrateur, vous pouvez l\'approuver malgré tout.' : ' Lancez la vérification pour voir les détails.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-600">
            <p>Ajoutez des échantillons et lancez la vérification avant d'approuver.</p>
          </div>
        )}
      </div>

      {/* Approve action (admin only, project not yet approved) */}
      {isAdmin && !finallyApproved && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          {!confirmOpen ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => setConfirmOpen(true)}
                disabled={valStatus === 'pending'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approuver le projet
              </button>
              {valStatus === 'pending' && (
                <p className="text-xs text-slate-400">Lancez d'abord la vérification.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠ Confirmer l'approbation</p>
                <p className="text-xs">Cette action rend les échantillons du projet visibles pour les opérateurs de production. Elle ne peut pas être annulée directement (seul un reset du statut est possible).</p>
              </div>
              {approveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{approveError}</p>}
              <div className="flex gap-2">
                <button className="btn-primary" onClick={handleApprove} disabled={approving}>
                  {approving ? 'Approbation…' : 'Confirmer l\'approbation'}
                </button>
                <button className="btn-secondary" onClick={() => { setConfirmOpen(false); setApproveError(null) }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin: reset status */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <button
            className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium"
            onClick={() => { setShowReset(v => !v); setResetError(null) }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier le statut manuellement
          </button>

          {showReset && (
            <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700">Réinitialiser le statut</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select className="input text-sm" value={resetStatus} onChange={e => setResetStatus(e.target.value)}>
                  <option value="pending">Réinitialiser → En attente (supprime validation et approbation)</option>
                  <option value="rejected">Marquer comme Rejeté (supprime l'approbation)</option>
                </select>
                <button className="btn-danger text-sm" onClick={handleReset} disabled={resetting}>
                  {resetting ? 'Enregistrement…' : 'Appliquer'}
                </button>
                <button className="btn-secondary text-sm" onClick={() => { setShowReset(false); setResetError(null) }}>Annuler</button>
              </div>
              {resetError && <p className="text-xs text-red-600">{resetError}</p>}
              <p className="text-xs text-amber-600">⚠ Cette action est irréversible. Le projet devra être re-vérifié.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
