import { useState } from 'react'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'
import MatrixManager from './MatrixManager'
import TechStudyImportModal from './TechStudyImportModal'

// View: 'list' | 'project' | 'matrix'
export default function TechnicalStudyPage({ currentUser }) {
  const [view, setView]                       = useState('list')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showImport, setShowImport]           = useState(false)
  const [matrixReload, setMatrixReload]       = useState(0)

  const isAdmin = ['admin', 'etude_technique'].includes(currentUser?.role)

  if (view === 'project' && selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        currentUser={currentUser}
        onBack={() => { setSelectedProject(null); setView('list') }}
        onProjectUpdated={updated => setSelectedProject(prev => ({ ...prev, ...updated }))}
      />
    )
  }

  if (view === 'matrix' && isAdmin) {
    return (
      <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="btn-secondary text-sm py-1.5 px-3">← Retour</button>
            <h2 className="font-bold text-slate-800 text-lg">Matrice de référence</h2>
          </div>
          <button className="btn-success flex items-center gap-2" onClick={() => setShowImport(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
            </svg>
            Importer CSV
          </button>
        </div>

        <MatrixManager
          isAdmin={isAdmin}
          reloadSignal={matrixReload}
          onRequestCsvImport={() => setShowImport(true)}
        />

        {showImport && (
          <TechStudyImportModal
            onClose={() => setShowImport(false)}
            onImported={src => {
              if (src === 'matrix') setMatrixReload(v => v + 1)
            }}
          />
        )}
      </main>
    )
  }

  return (
    <ProjectList
      currentUser={currentUser}
      onSelectProject={p => { setSelectedProject(p); setView('project') }}
      onOpenMatrix={() => setView('matrix')}
    />
  )
}
