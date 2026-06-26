import { useState } from 'react'
import SamplesStep from './steps/SamplesStep'
import VerificationStep from './steps/VerificationStep'
import ApprovalStep from './steps/ApprovalStep'

function validationBadge(status, approvedAt) {
  if (approvedAt) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">Approuvé ✓</span>
  if (status === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Vérifié ✓</span>
  if (status === 'rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Rejeté ✗</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">En attente</span>
}

// Map project state to which step indicator should show as "current"
function derivedStep(project) {
  if (project.approved_at) return 2
  if (project.validation_status === 'approved') return 2
  if (project.validation_status === 'rejected') return 1
  return 0
}

const STEPS = [
  { id: 0, label: '① Échantillons',  short: 'Échantillons'  },
  { id: 1, label: '② Vérification',  short: 'Vérification'  },
  { id: 2, label: '③ Approbation',   short: 'Approbation'   },
]

export default function ProjectDetail({ project: initialProject, currentUser, onBack, onProjectUpdated }) {
  const [project, setProject] = useState(initialProject)
  const [activeStep, setActiveStep] = useState(derivedStep(initialProject))

  const isAdmin      = ['admin', 'etude_technique'].includes(currentUser?.role)
  const finallyApproved = !!project.approved_at
  const statusStep   = derivedStep(project)

  function handleProjectUpdated(updated) {
    setProject(updated)
    onProjectUpdated?.(updated)
    // Advance stepper if status improved
    const newStep = derivedStep(updated)
    if (newStep > activeStep) setActiveStep(newStep)
  }

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <button onClick={onBack} className="btn-secondary text-sm py-1.5 px-3">← Retour</button>
          <h2 className="font-bold text-slate-800 text-lg flex-1 min-w-0 truncate">{project.project_name}</h2>
          {validationBadge(project.validation_status, project.approved_at)}
        </div>

        {/* Non-blocking stepper — all steps always clickable */}
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {STEPS.map(step => {
            const isCurrent  = step.id === statusStep
            const isActive   = step.id === activeStep
            const isPast     = step.id < statusStep
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 min-w-0 justify-center sm:justify-start ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isPast
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : isCurrent
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isPast && !isActive && <span className="text-emerald-500">✓</span>}
                <span className="truncate">{step.short}</span>
              </button>
            )
          })}
        </div>

        {finallyApproved && (
          <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
            ✓ Projet approuvé — ses échantillons apparaissent dans l'onglet Échantillons.
          </p>
        )}
      </div>

      {/* Step content */}
      {activeStep === 0 && (
        <SamplesStep projectName={project.project_name} isApproved={finallyApproved} isAdmin={isAdmin} />
      )}

      {activeStep === 1 && (
        <VerificationStep
          projectName={project.project_name}
          isAdmin={isAdmin}
          validatedAt={project.validated_at}
        />
      )}

      {activeStep === 2 && (
        <ApprovalStep
          project={project}
          isAdmin={isAdmin}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
    </main>
  )
}
