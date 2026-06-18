import { useCallback, useEffect, useState } from 'react'
import { deleteJimideDxf, getJimideDxfFiles, uploadJimideDxf } from '../../api/client'

const MAX_DXF_MB = 100
const MB = 1_048_576

// ─── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ onSuccess, onClose }) {
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function pickFile(f) {
    if (!f) { setFile(null); return }
    const ext = f.name.split('.').pop().toLowerCase()
    if (ext !== 'dxf') {
      setError('Seuls les fichiers .dxf sont acceptés.')
      setFile(null)
      return
    }
    if (f.size > MAX_DXF_MB * MB) {
      setError(`Fichier trop volumineux (${(f.size / MB).toFixed(0)} MB). Maximum : ${MAX_DXF_MB} MB.`)
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('dxf_file', file)
      if (description.trim()) form.append('description', description.trim())
      const created = await uploadJimideDxf(form)
      onSuccess(created)
    } catch (err) {
      setError(err?.response?.data?.error ?? "Erreur lors de l'upload.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-md p-6">
        <h3 className="font-semibold text-slate-800 text-lg mb-4">Importer un fichier DXF — JIMIDE-4030</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Fichier DXF</label>
            <input
              type="file"
              accept=".dxf"
              onChange={(e) => pickFile(e.target.files[0] || null)}
              className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-slate-400 mt-1">Format accepté : .dxf — Maximum {MAX_DXF_MB} MB</p>
          </div>

          <div>
            <label className="label">Description <span className="text-slate-400 font-normal">(optionnel)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Plan de la pièce X, révision 2…"
              className="input"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={uploading || !file}>
              {uploading ? 'Envoi…' : '⬆ Importer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ fileName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg w-full sm:max-w-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-2">Supprimer le fichier ?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <span className="font-medium text-slate-700">{fileName}</span> sera définitivement supprimé de la base de données.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} className="btn-danger">Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ─── JIMIDE-4030 Page ──────────────────────────────────────────────────────────
export default function Jimide4030Page() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getJimideDxfFiles()
      setFiles(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  function handleUploadSuccess(created) {
    setFiles((prev) => [created, ...prev])
    setShowUpload(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteJimideDxf(deleteTarget.id)
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id))
    } finally {
      setDeleteTarget(null)
    }
  }

  const filtered = search.trim()
    ? files.filter((f) =>
        f.file_name.toLowerCase().includes(search.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.uploaded_by || '').toLowerCase().includes(search.toLowerCase())
      )
    : files

  return (
    <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">JIMIDE-4030</h2>
            <p className="text-sm text-slate-500 mt-0.5">Fichiers DXF importés pour cette machine</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary whitespace-nowrap justify-center sm:justify-start">
            + Importer un DXF
          </button>
        </div>
      </div>

      {/* ── Stat card ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-medium opacity-80">Fichiers DXF</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{files.length}</p>
          <p className="text-xs opacity-60 mt-0.5">total importés</p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom de fichier, description, auteur…"
          className="input"
        />
      </div>

      {/* ── File list ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm text-slate-500">
            {filtered.length} fichier{filtered.length !== 1 ? 's' : ''}
            {search && ` trouvé${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">{search ? 'Aucun résultat' : 'Aucun fichier DXF'}</p>
            <p className="text-sm">{search ? 'Modifiez votre recherche.' : 'Cliquez sur "+ Importer un DXF" pour commencer.'}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filtered.map((f) => (
                <div key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500 text-lg shrink-0"></span>
                        <p className="font-medium text-slate-800 text-sm truncate">{f.file_name}</p>
                      </div>
                      {f.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{f.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                        {f.uploaded_by && <span>👤 {f.uploaded_by}</span>}
                        <span>{new Date(f.uploaded_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {f.file_url && (
                        <a
                          href={f.file_url}
                          download
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 active:bg-blue-100 font-medium text-center"
                        >
                          ⬇ DXF
                        </a>
                      )}
                      <button
                        onClick={() => setDeleteTarget(f)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 bg-red-50 active:bg-red-100 font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600"></th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Importé par</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Télécharger</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-500"></span>
                          <span className="font-medium text-slate-800">{f.file_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs">
                        <span className="line-clamp-2 text-xs">{f.description || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{f.uploaded_by || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(f.uploaded_at).toLocaleDateString('fr-FR')}
                        <div className="text-slate-400">
                          {new Date(f.uploaded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {f.file_url ? (
                          <a
                            href={f.file_url}
                            download
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                          >
                            ⬇ DXF
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => setDeleteTarget(f)}
                          className="text-xs px-2.5 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onSuccess={handleUploadSuccess}
          onClose={() => setShowUpload(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          fileName={deleteTarget.file_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  )
}
