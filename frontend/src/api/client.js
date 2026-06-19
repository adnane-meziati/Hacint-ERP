import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Attach CSRF token to every mutating request
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    // Read from cookie (Django sets csrftoken cookie)
    const token = getCookie('csrftoken')
    if (token) {
      config.headers['X-CSRFToken'] = token
    }
  }
  return config
})

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function queryUrl(path, params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })

  const value = query.toString()
  return `${path}${value ? `?${value}` : ''}`
}

export async function fetchCsrf() {
  await api.get('/auth/csrf/')
}

export async function login(username, password) {
  const { data } = await api.post('/auth/login/', { username, password })
  return data
}

export async function verifyOtp(userId, code) {
  const { data } = await api.post('/auth/verify-otp/', { user_id: userId, code })
  return data
}

export async function resendOtp(userId, purpose = 'login') {
  const { data } = await api.post('/auth/resend-otp/', { user_id: userId, purpose })
  return data
}

export async function changePassword(newPassword) {
  const { data } = await api.post('/auth/change-password/', { new_password: newPassword })
  return data
}

export async function forgotPassword(username) {
  const { data } = await api.post('/auth/forgot-password/', { username })
  return data
}

export async function resetPassword(userId, code, newPassword) {
  const { data } = await api.post('/auth/reset-password/', {
    user_id: userId,
    code,
    new_password: newPassword,
  })
  return data
}

export async function logout() {
  await api.post('/auth/logout/')
}

export async function getMe() {
  const { data } = await api.get('/auth/me/')
  return data
}

// Samples
export async function getProjects() {
  const { data } = await api.get('/samples/projects/')
  return data  // string[]
}

export async function getSamples(params = {}) {
  const { data } = await api.get('/samples/', { params })
  return data
}

export async function getSample(id) {
  const { data } = await api.get(`/samples/${id}/`)
  return data
}

export async function createSample(formData) {
  const { data } = await api.post('/samples/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateSample(id, formData) {
  const { data } = await api.put(`/samples/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteSample(id) {
  await api.delete(`/samples/${id}/`)
}

export function exportCsvUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/samples/export/${qs ? '?' + qs : ''}`
}

export async function importCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/samples/import/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getAuditLog(id) {
  const { data } = await api.get(`/samples/${id}/audit/`)
  return data
}

export async function markDone(id, isDone, doneDate) {
  const { data } = await api.patch(`/samples/${id}/mark_done/`, {
    is_done: isDone,
    done_date: doneDate || null,
  })
  return data
}

export async function setDesignerStatus(id, designerStatus, pauseReason = null) {
  const body = { designer_status: designerStatus }
  if (pauseReason) body.pause_reason = pauseReason
  const { data } = await api.patch(`/samples/${id}/set_designer_status/`, body)
  return data
}

export async function setProgrammerStatus(id, programmerStatus, pauseReason = null) {
  const body = { programmer_status: programmerStatus }
  if (pauseReason) body.pause_reason = pauseReason
  const { data } = await api.patch(`/samples/${id}/set_programmer_status/`, body)
  return data
}

export async function setRework(id, isRework = true) {
  const { data } = await api.patch(`/samples/${id}/set_rework/`, { is_rework: isRework })
  return data
}

export async function setCncStatus(id, cncStatus, pauseReason = null) {
  const body = { cnc_status: cncStatus }
  if (pauseReason) body.pause_reason = pauseReason
  const { data } = await api.patch(`/samples/${id}/set_cnc_status/`, body)
  return data
}

export async function setCncRework(id, isCncRework = true) {
  const { data } = await api.patch(`/samples/${id}/set_cnc_rework/`, { is_cnc_rework: isCncRework })
  return data
}

export async function setCncCount(id, count) {
  const { data } = await api.patch(`/samples/${id}/set_cnc_count/`, { cnc_produced_count: count })
  return data
}

export async function setAssemblyStatus(id, assemblyStatus, pauseReason = null) {
  const body = { assembly_status: assemblyStatus }
  if (pauseReason) body.pause_reason = pauseReason
  const { data } = await api.patch(`/samples/${id}/set_assembly_status/`, body)
  return data
}

export async function setAssemblyRework(id, isAssemblyRework = true) {
  const { data } = await api.patch(`/samples/${id}/set_assembly_rework/`, { is_assembly_rework: isAssemblyRework })
  return data
}

export async function setAssemblyCount(id, count) {
  const { data } = await api.patch(`/samples/${id}/set_assembly_count/`, { assembly_produced_count: count })
  return data
}

export async function resetProgrammer(id) {
  const { data } = await api.patch(`/samples/${id}/reset_programmer/`)
  return data
}

export async function resetCnc(id) {
  const { data } = await api.patch(`/samples/${id}/reset_cnc/`)
  return data
}

export async function resetAssembly(id) {
  const { data } = await api.patch(`/samples/${id}/reset_assembly/`)
  return data
}

export async function setQualityStatus(id, qualityStatus, pauseReason = null) {
  const body = { quality_status: qualityStatus }
  if (pauseReason) body.pause_reason = pauseReason
  const { data } = await api.patch(`/samples/${id}/set_quality_status/`, body)
  return data
}

export async function setQualityRework(id, isQualityRework = true) {
  const { data } = await api.patch(`/samples/${id}/set_quality_rework/`, { is_quality_rework: isQualityRework })
  return data
}

export async function resetQuality(id) {
  const { data } = await api.patch(`/samples/${id}/reset_quality/`)
  return data
}

export async function uploadDesign(id, formData) {
  const { data } = await api.post(`/samples/${id}/upload_design/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function uploadGcode(id, formData) {
  const { data } = await api.post(`/samples/${id}/upload_gcode/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteProgrammerFile(sampleId, fileId) {
  const { data } = await api.delete(`/samples/${sampleId}/delete_programmer_file/${fileId}/`)
  return data
}

export async function deleteDesignFile(sampleId) {
  const { data } = await api.delete(`/samples/${sampleId}/delete_design_file/`)
  return data
}

export async function deleteDesignPdf(sampleId) {
  const { data } = await api.delete(`/samples/${sampleId}/delete_design_pdf/`)
  return data
}

export async function uploadBomFile(sampleId, formData, onProgress) {
  const { data } = await api.post(`/samples/${sampleId}/upload_bom/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded / e.total) * 100)) : undefined,
  })
  return data
}

export async function deleteBomPdf(sampleId) {
  const { data } = await api.delete(`/samples/${sampleId}/delete_bom/`)
  return data
}

export async function getBomItems(sampleId) {
  const { data } = await api.get('/bom-items/', { params: { sample: sampleId } })
  return data
}

export async function createBomItem(payload) {
  const { data } = await api.post('/bom-items/', payload)
  return data
}

export async function updateBomItem(id, payload) {
  const { data } = await api.patch(`/bom-items/${id}/`, payload)
  return data
}

export async function deleteBomItem(id) {
  await api.delete(`/bom-items/${id}/`)
}

export async function getBomAggregate(project = '') {
  const { data } = await api.get('/samples/bom_aggregate/', { params: project ? { project } : {} })
  return data
}

export async function getMachines() {
  const { data } = await api.get('/samples/machines/')
  return data
}

export async function sendToMachine(id, machineId) {
  const { data } = await api.post(`/samples/${id}/send_to_machine/`, { machine_id: machineId })
  return data
}

// ── JIMIDE-4030 DXF files ─────────────────────────────────────────────────────

export async function getJimideDxfFiles() {
  const { data } = await api.get('/jimide/')
  return data
}

export async function uploadJimideDxf(formData) {
  const { data } = await api.post('/jimide/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteJimideDxf(id) {
  await api.delete(`/jimide/${id}/`)
}

// ── User management (admin only) ──────────────────────────────────────────────
export async function getUsers() {
  const { data } = await api.get('/auth/users/')
  return data
}

export async function createUser(payload) {
  const { data } = await api.post('/auth/users/', payload)
  return data
}

export async function updateUser(id, payload) {
  const { data } = await api.patch(`/auth/users/${id}/`, payload)
  return data
}

export async function deleteUser(id) {
  await api.delete(`/auth/users/${id}/`)
}

// ── Storage — Catégories ──────────────────────────────────────────────────────
export async function getCategories(params = {}) {
  const { data } = await api.get('/storage/categories/', { params })
  return data
}
export async function createCategorie(payload) {
  const { data } = await api.post('/storage/categories/', payload)
  return data
}
export async function updateCategorie(id, payload) {
  const { data } = await api.patch(`/storage/categories/${id}/`, payload)
  return data
}
export async function deleteCategorie(id) {
  await api.delete(`/storage/categories/${id}/`)
}

// ── Storage — Articles ────────────────────────────────────────────────────────
export async function getArticles(params = {}) {
  const { data } = await api.get('/storage/articles/', { params })
  return data
}
export async function searchArticles(q) {
  const { data } = await api.get('/storage/articles/search/', { params: { q } })
  return data
}
export async function getArticle(id) {
  const { data } = await api.get(`/storage/articles/${id}/`)
  return data
}
export async function createArticle(payload) {
  const { data } = await api.post('/storage/articles/', payload)
  return data
}
export async function updateArticle(id, payload) {
  const { data } = await api.patch(`/storage/articles/${id}/`, payload)
  return data
}
export async function deleteArticle(id) {
  await api.delete(`/storage/articles/${id}/`)
}
export function exportArticlesCsvUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/storage/articles/export/${qs ? '?' + qs : ''}`
}
export async function importArticlesCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/storage/articles/import/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── Storage — Entrepôts ───────────────────────────────────────────────────────
export async function getEntrepots(params = {}) {
  const { data } = await api.get('/storage/entrepots/', { params })
  return data
}
export async function createEntrepot(payload) {
  const { data } = await api.post('/storage/entrepots/', payload)
  return data
}
export async function updateEntrepot(id, payload) {
  const { data } = await api.patch(`/storage/entrepots/${id}/`, payload)
  return data
}
export async function deleteEntrepot(id) {
  await api.delete(`/storage/entrepots/${id}/`)
}
export function exportEntrepotsCsvUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/storage/entrepots/export/${qs ? '?' + qs : ''}`
}
export async function importEntrepotsCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/storage/entrepots/import/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── Storage — Placements ──────────────────────────────────────────────────────
export async function getPlacements(params = {}) {
  const { data } = await api.get('/storage/placements/', { params })
  return data
}
export async function searchPlacements(q, entrepot) {
  const { data } = await api.get('/storage/placements/search/', { params: { q, entrepot } })
  return data
}
export async function createPlacement(payload) {
  const { data } = await api.post('/storage/placements/', payload)
  return data
}
export async function updatePlacement(id, payload) {
  const { data } = await api.patch(`/storage/placements/${id}/`, payload)
  return data
}
export async function deletePlacement(id) {
  await api.delete(`/storage/placements/${id}/`)
}
export function exportPlacementsCsvUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/storage/placements/export/${qs ? '?' + qs : ''}`
}
export async function importPlacementsCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/storage/placements/import/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── Storage — Lots ────────────────────────────────────────────────────────────
export async function getLots(params = {}) {
  const { data } = await api.get('/storage/lots/', { params })
  return data
}
export async function searchLots(q, article) {
  const { data } = await api.get('/storage/lots/search/', { params: { q, article } })
  return data
}
export async function createLot(payload) {
  const { data } = await api.post('/storage/lots/', payload)
  return data
}
export async function updateLot(id, payload) {
  const { data } = await api.patch(`/storage/lots/${id}/`, payload)
  return data
}
export async function deleteLot(id) {
  await api.delete(`/storage/lots/${id}/`)
}
export function exportLotsCsvUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/storage/lots/export/${qs ? '?' + qs : ''}`
}
export async function importLotsCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/storage/lots/import/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── Storage — Mouvements (POST+GET only, immutable) ───────────────────────────
export async function getMouvements(params = {}) {
  const { data } = await api.get('/storage/mouvements/', { params })
  return data
}
export async function createMouvement(payload) {
  const { data } = await api.post('/storage/mouvements/', payload)
  return data
}
export async function reverseMouvement(id) {
  const { data } = await api.post(`/storage/mouvements/${id}/reverse/`)
  return data
}

// ── Storage — Stocks (read-only) ──────────────────────────────────────────────
export async function getStocks(params = {}) {
  const { data } = await api.get('/storage/stocks/', { params })
  return data
}
export async function getStockResume() {
  const { data } = await api.get('/storage/stocks/resume/')
  return data
}
export async function reserveStock(id, quantite) {
  const { data } = await api.post(`/storage/stocks/${id}/reserve/`, { quantite })
  return data
}
export async function releaseStock(id, quantite) {
  const { data } = await api.post(`/storage/stocks/${id}/release/`, { quantite })
  return data
}

// ── Storage — Tickets ─────────────────────────────────────────────────────────
export async function getTickets(params = {}) {
  const { data } = await api.get('/storage/tickets/', { params })
  return data
}
export async function createTicket(payload) {
  const { data } = await api.post('/storage/tickets/', payload)
  return data
}
export async function updateTicket(id, payload) {
  const { data } = await api.patch(`/storage/tickets/${id}/`, payload)
  return data
}

// ── Comptabilité — Profil société ─────────────────────────────────────────────
export async function getSociete() {
  const { data } = await api.get('/accounting/societe/')
  return data
}
export async function updateSociete(payload) {
  const { data } = await api.patch('/accounting/societe/', payload)
  return data
}

// ── Comptabilité — Tiers (clients & fournisseurs) ─────────────────────────────
export async function getTiers(params = {}) {
  const { data } = await api.get('/accounting/tiers/', { params })
  return data
}
export async function searchTiers(q, type = '') {
  const { data } = await api.get('/accounting/tiers/search/', { params: { q, type } })
  return data
}
export async function createTiers(payload) {
  const { data } = await api.post('/accounting/tiers/', payload)
  return data
}
export async function updateTiers(id, payload) {
  const { data } = await api.patch(`/accounting/tiers/${id}/`, payload)
  return data
}
export async function deleteTiers(id) {
  await api.delete(`/accounting/tiers/${id}/`)
}

// ── Comptabilité — Codes TVA ──────────────────────────────────────────────────
export async function getTaxCodes(params = {}) {
  const { data } = await api.get('/accounting/taxcodes/', { params })
  return data
}
export async function createTaxCode(payload) {
  const { data } = await api.post('/accounting/taxcodes/', payload)
  return data
}
export async function updateTaxCode(id, payload) {
  const { data } = await api.patch(`/accounting/taxcodes/${id}/`, payload)
  return data
}

// ── Comptabilité — Documents (devis / factures / avoirs / achats) ─────────────
export async function getDocuments(params = {}) {
  const { data } = await api.get('/accounting/documents/', { params })
  return data
}
export async function getDocument(id) {
  const { data } = await api.get(`/accounting/documents/${id}/`)
  return data
}
export async function createDocument(payload) {
  const { data } = await api.post('/accounting/documents/', payload)
  return data
}
export async function updateDocument(id, payload) {
  const { data } = await api.put(`/accounting/documents/${id}/`, payload)
  return data
}
export async function deleteDocument(id) {
  await api.delete(`/accounting/documents/${id}/`)
}
export async function validerDocument(id) {
  const { data } = await api.post(`/accounting/documents/${id}/valider/`)
  return data
}
export async function setDocumentStatut(id, statut) {
  const { data } = await api.post(`/accounting/documents/${id}/set-statut/`, { statut })
  return data
}
export async function convertirEnFacture(id) {
  const { data } = await api.post(`/accounting/documents/${id}/convertir-en-facture/`)
  return data
}
export async function creerAvoir(id) {
  const { data } = await api.post(`/accounting/documents/${id}/creer-avoir/`)
  return data
}
export function documentPdfUrl(id) {
  return `/api/accounting/documents/${id}/pdf/`
}
export function paiementPdfUrl(id) {
  return `/api/accounting/paiements/${id}/pdf/`
}
// Ouvre un PDF dans un nouvel onglet et déclenche le dialogue d'impression
export function printPdf(url) {
  const w = window.open(url, '_blank')
  if (!w) return
  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    try { w.focus(); w.print() } catch { /* visionneuse PDF sans support print() */ }
  }
  w.addEventListener('load', doPrint)
  setTimeout(doPrint, 1200) // secours : l'événement load ne se déclenche pas toujours pour un PDF
}
export async function getAccountingStats(annee) {
  const { data } = await api.get('/accounting/documents/stats/', { params: { annee } })
  return data
}

// ── Comptabilité — Paiements ──────────────────────────────────────────────────
export async function getPaiements(params = {}) {
  const { data } = await api.get('/accounting/paiements/', { params })
  return data
}
export async function createPaiement(payload) {
  const { data } = await api.post('/accounting/paiements/', payload)
  return data
}
export async function deletePaiement(id) {
  await api.delete(`/accounting/paiements/${id}/`)
}

// ── Comptabilité générale — Plan comptable (PCGE) ─────────────────────────────
export async function getComptes(params = {}) {
  const { data } = await api.get('/accounting/comptes/', { params })
  return data
}
export async function searchComptes(q, classe = '') {
  const { data } = await api.get('/accounting/comptes/search/', { params: { q, classe } })
  return data
}
export async function createCompte(payload) {
  const { data } = await api.post('/accounting/comptes/', payload)
  return data
}
export async function updateCompte(id, payload) {
  const { data } = await api.patch(`/accounting/comptes/${id}/`, payload)
  return data
}
export async function deleteCompte(id) {
  await api.delete(`/accounting/comptes/${id}/`)
}

// ── Comptabilité générale — Journaux & écritures ──────────────────────────────
export async function getJournaux() {
  const { data } = await api.get('/accounting/journaux/')
  return data
}
export async function getEcritures(params = {}) {
  const { data } = await api.get('/accounting/ecritures/', { params })
  return data
}
export async function getEcriture(id) {
  const { data } = await api.get(`/accounting/ecritures/${id}/`)
  return data
}
export async function createEcriture(payload) {
  const { data } = await api.post('/accounting/ecritures/', payload)
  return data
}
export async function deleteEcriture(id) {
  await api.delete(`/accounting/ecritures/${id}/`)
}
export async function comptabiliserTout() {
  const { data } = await api.post('/accounting/comptabiliser-tout/')
  return data
}
export function journalExportUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/accounting/journal-export/${qs ? '?' + qs : ''}`
}

// ── Comptabilité générale — Exercices ─────────────────────────────────────────
export async function getExercices() {
  const { data } = await api.get('/accounting/exercices/')
  return data
}
export async function cloturerExercice(annee) {
  const { data } = await api.post('/accounting/exercices/cloturer/', { annee })
  return data
}
export async function rouvrirExercice(annee) {
  const { data } = await api.post('/accounting/exercices/rouvrir/', { annee })
  return data
}

// ── Comptabilité générale — Rapports ──────────────────────────────────────────
export async function getGrandLivre(params = {}) {
  const { data } = await api.get('/accounting/grand-livre/', { params })
  return data
}
export function grandLivreXlsxUrl(params = {}) {
  const qs = new URLSearchParams({ ...params, format: 'xlsx' }).toString()
  return `/api/accounting/grand-livre/?${qs}`
}
export async function getBalance(params = {}) {
  const { data } = await api.get('/accounting/balance/', { params })
  return data
}
export function balanceXlsxUrl(params = {}) {
  const qs = new URLSearchParams({ ...params, format: 'xlsx' }).toString()
  return `/api/accounting/balance/?${qs}`
}
export async function getBilan(dateTo) {
  const { data } = await api.get('/accounting/bilan/', { params: { date_to: dateTo } })
  return data
}
export async function getCpc(annee) {
  const { data } = await api.get('/accounting/cpc/', { params: { annee } })
  return data
}

// ── Comptabilité — TVA ────────────────────────────────────────────────────────
export async function getTvaRapport(params = {}) {
  const { data } = await api.get('/accounting/tva/rapport/', { params })
  return data
}
export function tvaReleveDeductionsUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/accounting/tva/releve-deductions/${qs ? '?' + qs : ''}`
}
export function tvaExportXlsxUrl(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/accounting/tva/export/${qs ? '?' + qs : ''}`
}

// ── Comptabilité — Durée de vie des actifs ────────────────────────────────────
export async function getAssets(params = {}) {
  const { data } = await api.get('/accounting/assets/', { params })
  return data
}
export async function createAsset(payload) {
  const { data } = await api.post('/accounting/assets/', payload)
  return data
}
export async function updateAsset(id, payload) {
  const { data } = await api.patch(`/accounting/assets/${id}/`, payload)
  return data
}
export async function deleteAsset(id) {
  await api.delete(`/accounting/assets/${id}/`)
}
export async function getAssetLifespan() {
  const { data } = await api.get('/accounting/assets/lifespan/')
  return data
}
export async function getAccountingDepartments() {
  const { data } = await api.get('/accounting/departments/')
  return data
}

// ── Technical Study Validation — Reference Matrix ─────────────────────────────

export async function getMatrix() {
  const { data } = await api.get('/matrix/')
  return data
}

export async function createMatrixEntry(payload) {
  const { data } = await api.post('/matrix/', payload)
  return data
}

export async function updateMatrixEntry(id, payload) {
  const { data } = await api.patch(`/matrix/${id}/`, payload)
  return data
}

export async function deleteMatrixEntry(id) {
  await api.delete(`/matrix/${id}/`)
}

export async function importMatrix(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/matrix/import/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── Technical Study Validation — Projects ────────────────────────────────────

export async function getValidationList() {
  const { data } = await api.get('/validation/')
  return data
}

export async function runValidation(projectName) {
  const { data } = await api.post('/validation/run/', { project_name: projectName })
  return data
}

export async function approveValidation(projectName) {
  const { data } = await api.post('/validation/approve/', { project_name: projectName })
  return data
}

export async function createProject(projectName) {
  const { data } = await api.post('/validation/projects/', { project_name: projectName })
  return data
}

export async function importProjectExcel({ file, projectName, client, mode, comment = '' }) {
  const form = new FormData()
  form.append('file', file)
  form.append('project_name', projectName)
  form.append('client', client)
  form.append('mode', mode)
  form.append('comment', comment)
  const { data } = await api.post('/projects/import-excel/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getProjectSamples(projectName) {
  const { data } = await api.get(`/validation/projects/${encodeURIComponent(projectName)}/samples/`)
  return data
}

export async function createProjectSample(projectName, payload) {
  const { data } = await api.post(`/validation/projects/${encodeURIComponent(projectName)}/samples/`, payload)
  return data
}

export async function deleteProjectSample(projectName, sampleId) {
  await api.delete(`/validation/projects/${encodeURIComponent(projectName)}/samples/${sampleId}/`)
}

export async function updateProjectStatus(projectName, payload) {
  const { data } = await api.patch(`/validation/projects/${encodeURIComponent(projectName)}/status/`, payload)
  return data
}

export async function approveProjectApn(projectName, apn, approved = true) {
  const { data } = await api.patch(
    `/validation/projects/${encodeURIComponent(projectName)}/approve-apn/`,
    { apn, approved },
  )
  return data
}

// HR - Employees
export async function getEmployees(params = {}) {
  const { data } = await api.get('/hr/employees/', { params })
  return data
}

export async function createEmployee(payload) {
  const { data } = await api.post('/hr/employees/', payload)
  return data
}

export async function updateEmployee(id, payload) {
  const { data } = await api.patch(`/hr/employees/${id}/`, payload)
  return data
}

export async function deleteEmployee(id) {
  await api.delete(`/hr/employees/${id}/`)
}

// HR - Departments
export async function getDepartments(params = {}) {
  const { data } = await api.get('/hr/departments/', { params })
  return data
}

export async function createDepartment(payload) {
  const { data } = await api.post('/hr/departments/', payload)
  return data
}

export async function updateDepartment(id, payload) {
  const { data } = await api.patch(
    `/hr/departments/${id}/`,
    payload,
  )
  return data
}

export async function deleteDepartment(id) {
  await api.delete(`/hr/departments/${id}/`)
}

// HR - Contracts
export async function getContracts(params = {}) {
  const { data } = await api.get('/hr/contracts/', { params })
  return data
}

export async function createContract(payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.post('/hr/contracts/', payload, config)
  return data
}

export async function updateContract(id, payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.patch(
    `/hr/contracts/${id}/`,
    payload,
    config,
  )
  return data
}

export async function deleteContract(id) {
  await api.delete(`/hr/contracts/${id}/`)
}

// HR - Resignations
export async function getResignations(params = {}) {
  const { data } = await api.get('/hr/resignations/', { params })
  return data
}

export async function createResignation(payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.post(
    '/hr/resignations/',
    payload,
    config,
  )
  return data
}

export async function updateResignation(id, payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.patch(
    `/hr/resignations/${id}/`,
    payload,
    config,
  )
  return data
}

export async function deleteResignation(id) {
  await api.delete(`/hr/resignations/${id}/`)
}

// HR - Leave requests
export async function getLeaveRequests(params = {}) {
  const { data } = await api.get('/hr/leave-requests/', { params })
  return data
}

export async function createLeaveRequest(payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.post(
    '/hr/leave-requests/',
    payload,
    config,
  )
  return data
}

export async function approveLeaveRequest(id, payload = {}) {
  const { data } = await api.post(
    `/hr/leave-requests/${id}/approve/`,
    payload,
  )
  return data
}

export async function rejectLeaveRequest(id, payload = {}) {
  const { data } = await api.post(
    `/hr/leave-requests/${id}/reject/`,
    payload,
  )
  return data
}

export async function cancelLeaveRequest(id) {
  const { data } = await api.post(
    `/hr/leave-requests/${id}/cancel/`,
  )
  return data
}

// HR - Attendance
export async function createAttendance(payload) {
  const { data } = await api.post('/hr/attendance/', payload)
  return data
}

export async function getAttendance(params = {}) {
  const { data } = await api.get('/hr/attendance/', { params })
  return data
}

export async function updateAttendance(id, payload) {
  const { data } = await api.put(
    `/hr/attendance/${id}/`,
    payload,
  )
  return data
}

export async function getAttendanceSummary(params = {}) {
  const { data } = await api.get('/hr/attendance/summary/', {
    params,
  })
  return data
}

// HR - Payroll
export async function getPayroll(params = {}) {
  const { data } = await api.get('/hr/payroll/', { params })
  return data
}

export async function createPayroll(payload) {
  const { data } = await api.post('/hr/payroll/', payload)
  return data
}

export async function updatePayroll(id, payload) {
  const { data } = await api.patch(`/hr/payroll/${id}/`, payload)
  return data
}

export async function deletePayroll(id) {
  await api.delete(`/hr/payroll/${id}/`)
}
// HR - Job positions
export async function getJobPositions(params = {}) {
  const { data } = await api.get('/hr/job-positions/', { params })
  return data
}

export async function createJobPosition(payload) {
  const { data } = await api.post('/hr/job-positions/', payload)
  return data
}

export async function updateJobPosition(id, payload) {
  const { data } = await api.patch(
    `/hr/job-positions/${id}/`,
    payload,
  )
  return data
}

export async function deleteJobPosition(id) {
  await api.delete(`/hr/job-positions/${id}/`)
}

// HR - Candidates
export async function getCandidates(params = {}) {
  const { data } = await api.get('/hr/candidates/', { params })
  return data
}

export async function createCandidate(payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.post('/hr/candidates/', payload, config)
  return data
}

export async function updateCandidate(id, payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined

  const { data } = await api.patch(
    `/hr/candidates/${id}/`,
    payload,
    config,
  )
  return data
}

export async function deleteCandidate(id) {
  await api.delete(`/hr/candidates/${id}/`)
}

// HR - Applications
export async function getApplications(params = {}) {
  const { data } = await api.get('/hr/applications/', { params })
  return data
}

export async function createApplication(payload) {
  const { data } = await api.post('/hr/applications/', payload)
  return data
}

export async function updateApplication(id, payload) {
  const { data } = await api.patch(
    `/hr/applications/${id}/`,
    payload,
  )
  return data
}

export async function updateApplicationStage(id, payload) {
  const { data } = await api.post(
    `/hr/applications/${id}/update-stage/`,
    payload,
  )
  return data
}

export async function deleteApplication(id) {
  await api.delete(`/hr/applications/${id}/`)
}

// HR - Interviews
export async function getInterviews(params = {}) {
  const { data } = await api.get('/hr/interviews/', { params })
  return data
}

export async function createInterview(payload) {
  const { data } = await api.post('/hr/interviews/', payload)
  return data
}

export async function updateInterview(id, payload) {
  const { data } = await api.patch(
    `/hr/interviews/${id}/`,
    payload,
  )
  return data
}

export async function deleteInterview(id) {
  await api.delete(`/hr/interviews/${id}/`)
}

export async function getHRDashboard() {
  const { data } = await api.get('/hr/dashboard/')
  return data
}

// Logistics - Dashboard
export async function getLogisticsDashboard() {
  const { data } = await api.get('/logistics/dashboard/')
  return data
}

// Logistics - Vehicles
export async function getLogisticsVehicles(params = {}) {
  const { data } = await api.get('/logistics/vehicles/', { params })
  return data
}

export async function createLogisticsVehicle(payload) {
  const { data } = await api.post('/logistics/vehicles/', payload)
  return data
}

export async function updateLogisticsVehicle(id, payload) {
  const { data } = await api.patch(
    `/logistics/vehicles/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsVehicle(id) {
  await api.delete(`/logistics/vehicles/${id}/`)
}

export function exportLogisticsVehiclesExcelUrl(params = {}) {
  return queryUrl('/api/logistics/vehicles/export-excel/', params)
}

// Logistics - Drivers
export async function getLogisticsDrivers(params = {}) {
  const { data } = await api.get('/logistics/drivers/', { params })
  return data
}

export async function createLogisticsDriver(payload) {
  const { data } = await api.post('/logistics/drivers/', payload)
  return data
}

export async function updateLogisticsDriver(id, payload) {
  const { data } = await api.patch(
    `/logistics/drivers/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsDriver(id) {
  await api.delete(`/logistics/drivers/${id}/`)
}

export function exportLogisticsDriversExcelUrl(params = {}) {
  return queryUrl('/api/logistics/drivers/export-excel/', params)
}

// Logistics - Delivery orders
export async function getLogisticsDeliveryOrders(params = {}) {
  const { data } = await api.get('/logistics/delivery-orders/', {
    params,
  })
  return data
}

export async function createLogisticsDeliveryOrder(payload) {
  const { data } = await api.post(
    '/logistics/delivery-orders/',
    payload,
  )
  return data
}

export async function updateLogisticsDeliveryOrder(id, payload) {
  const { data } = await api.patch(
    `/logistics/delivery-orders/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsDeliveryOrder(id) {
  await api.delete(`/logistics/delivery-orders/${id}/`)
}

export function exportLogisticsDeliveryOrdersExcelUrl(params = {}) {
  return queryUrl('/api/logistics/delivery-orders/export-excel/', params)
}

// Logistics - Shipments
export async function getLogisticsShipments(params = {}) {
  const { data } = await api.get('/logistics/shipments/', { params })
  return data
}

export async function createLogisticsShipment(payload) {
  const { data } = await api.post('/logistics/shipments/', payload)
  return data
}

export async function updateLogisticsShipment(id, payload) {
  const { data } = await api.patch(
    `/logistics/shipments/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsShipment(id) {
  await api.delete(`/logistics/shipments/${id}/`)
}

export function exportLogisticsShipmentsExcelUrl(params = {}) {
  return queryUrl('/api/logistics/shipments/export-excel/', params)
}

// Logistics - Warehouse transfers
export async function getLogisticsWarehouseTransfers(params = {}) {
  const { data } = await api.get(
    '/logistics/warehouse-transfers/',
    { params },
  )
  return data
}

export async function createLogisticsWarehouseTransfer(payload) {
  const { data } = await api.post(
    '/logistics/warehouse-transfers/',
    payload,
  )
  return data
}

export async function updateLogisticsWarehouseTransfer(id, payload) {
  const { data } = await api.patch(
    `/logistics/warehouse-transfers/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsWarehouseTransfer(id) {
  await api.delete(`/logistics/warehouse-transfers/${id}/`)
}

export function exportLogisticsTransfersExcelUrl(params = {}) {
  return queryUrl('/api/logistics/warehouse-transfers/export-excel/', params)
}

export async function approveLogisticsWarehouseTransfer(id) {
  const { data } = await api.post(
    `/logistics/warehouse-transfers/${id}/approve/`,
  )
  return data
}

export async function rejectLogisticsWarehouseTransfer(id) {
  const { data } = await api.post(
    `/logistics/warehouse-transfers/${id}/reject/`,
  )
  return data
}

// Logistics - Tasks
export async function getLogisticsTasks(params = {}) {
  const { data } = await api.get('/logistics/tasks/', { params })
  return data
}

export async function getLogisticsTask(id) {
  const { data } = await api.get(`/logistics/tasks/${id}/`)
  return data
}

export async function createLogisticsTask(payload) {
  const { data } = await api.post('/logistics/tasks/', payload)
  return data
}

export async function updateLogisticsTask(id, payload) {
  const { data } = await api.patch(
    `/logistics/tasks/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsTask(id) {
  await api.delete(`/logistics/tasks/${id}/`)
}

export function exportLogisticsTasksCsvUrl(params = {}) {
  return queryUrl('/api/logistics/tasks/export-csv/', params)
}

export function exportLogisticsTasksPdfUrl(params = {}) {
  return queryUrl('/api/logistics/tasks/export-pdf/', params)
}

export function exportLogisticsTasksExcelUrl(params = {}) {
  return queryUrl('/api/logistics/tasks/export-excel/', params)
}

export async function importLogisticsTasksCsv(file) {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post(
    '/logistics/tasks/import-csv/',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  return data
}

// Logistics - Task comments
export async function getLogisticsTaskComments(params = {}) {
  const { data } = await api.get('/logistics/task-comments/', {
    params,
  })
  return data
}

export async function createLogisticsTaskComment(payload) {
  const { data } = await api.post(
    '/logistics/task-comments/',
    payload,
  )
  return data
}

export async function updateLogisticsTaskComment(id, payload) {
  const { data } = await api.patch(
    `/logistics/task-comments/${id}/`,
    payload,
  )
  return data
}

export async function deleteLogisticsTaskComment(id) {
  await api.delete(`/logistics/task-comments/${id}/`)
}

// Logistics - Task attachments
export async function getLogisticsTaskAttachments(params = {}) {
  const { data } = await api.get('/logistics/task-attachments/', {
    params,
  })
  return data
}

export async function createLogisticsTaskAttachment(payload) {
  const form = payload instanceof FormData
    ? payload
    : (() => {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
        return formData
      })()

  const { data } = await api.post(
    '/logistics/task-attachments/',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  return data
}

export async function deleteLogisticsTaskAttachment(id) {
  await api.delete(`/logistics/task-attachments/${id}/`)
}

// Logistics - Task history
export async function getLogisticsTaskHistory(params = {}) {
  const { data } = await api.get('/logistics/task-history/', {
    params,
  })
  return data
}
// Logistics - Notifications
export async function getLogisticsNotifications(params = {}) {
  const { data } = await api.get('/logistics/notifications/', {
    params,
  })
  return data
}

export async function markLogisticsNotificationRead(id) {
  const { data } = await api.post(
    `/logistics/notifications/${id}/mark-read/`,
  )
  return data
}

export async function markAllLogisticsNotificationsRead() {
  const { data } = await api.post(
    '/logistics/notifications/mark-all-read/',
  )
  return data
}

// Logistics - Reports
export async function getLogisticsEmployeePerformance(
  params = {},
) {
  const { data } = await api.get(
    '/logistics/reports/employee-performance/',
    { params },
  )
  return data
}

export function exportLogisticsEmployeePerformanceCsvUrl(
  params = {},
) {
  return queryUrl(
    '/api/logistics/reports/employee-performance/',
    { ...params, format: 'csv' },
  )
}

export function exportLogisticsEmployeePerformancePdfUrl(
  params = {},
) {
  return queryUrl(
    '/api/logistics/reports/employee-performance/',
    { ...params, format: 'pdf' },
  )
}

export function exportLogisticsEmployeePerformanceExcelUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/employee-performance/',
    { ...params, format: 'xlsx' },
  )
}

export async function getLogisticsLateTasks(params = {}) {
  const { data } = await api.get(
    '/logistics/reports/late-tasks/',
    { params },
  )
  return data
}

export function exportLogisticsLateTasksCsvUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/late-tasks/',
    { ...params, format: 'csv' },
  )
}

export function exportLogisticsLateTasksPdfUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/late-tasks/',
    { ...params, format: 'pdf' },
  )
}

export function exportLogisticsLateTasksExcelUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/late-tasks/',
    { ...params, format: 'xlsx' },
  )
}

export async function getLogisticsWorkload(params = {}) {
  const { data } = await api.get(
    '/logistics/reports/workload/',
    { params },
  )
  return data
}

export function exportLogisticsWorkloadCsvUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/workload/',
    { ...params, format: 'csv' },
  )
}

export function exportLogisticsWorkloadPdfUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/workload/',
    { ...params, format: 'pdf' },
  )
}

export function exportLogisticsWorkloadExcelUrl(params = {}) {
  return queryUrl(
    '/api/logistics/reports/workload/',
    { ...params, format: 'xlsx' },
  )
}

export async function getLogisticsReportJournal(params = {}) {
  const { data } = await api.get('/logistics/report-journal/', { params })
  return data
}

export async function createLogisticsReport(payload) {
  const { data } = await api.post('/logistics/report-journal/', payload)
  return data
}

export async function updateLogisticsReport(id, payload) {
  const { data } = await api.patch(`/logistics/report-journal/${id}/`, payload)
  return data
}

export async function deleteLogisticsReport(id) {
  await api.delete(`/logistics/report-journal/${id}/`)
}

export function exportLogisticsReportJournalExcelUrl(params = {}) {
  return queryUrl('/api/logistics/report-journal/export-excel/', params)
}

// ── Installation ──────────────────────────────────────────────────────────────

export async function getInstallationDashboard() {
  const { data } = await api.get('/installation/dashboard/')
  return data
}

async function listInstallation(resource, params = {}) {
  const { data } = await api.get(`/installation/${resource}/`, { params })
  return data
}

async function createInstallation(resource, payload) {
  const isForm = payload instanceof FormData
  const { data } = await api.post(`/installation/${resource}/`, payload, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
  return data
}

async function updateInstallation(resource, id, payload) {
  const isForm = payload instanceof FormData
  const { data } = await api.patch(`/installation/${resource}/${id}/`, payload, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
  return data
}

async function deleteInstallation(resource, id) {
  await api.delete(`/installation/${resource}/${id}/`)
}

export function installationExportUrl(resource, fmt, params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `/api/installation/export/${resource}/${fmt}/${qs ? '?' + qs : ''}`
}

export const installationApi = { list: listInstallation, create: createInstallation, update: updateInstallation, delete: deleteInstallation }

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function getSalesProjects(params = {}) {
  const { data } = await api.get('/sales/projects/', { params })
  return data
}

export async function createSalesProject(formData) {
  const { data } = await api.post('/sales/projects/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateSalesProject(id, formData) {
  const { data } = await api.patch(`/sales/projects/${id}/`, formData, {
    headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return data
}

export async function deleteSalesProject(id) {
  await api.delete(`/sales/projects/${id}/`)
}

export async function deleteSalesProjectDocument(projectId, documentId) {
  await api.delete(`/sales/projects/${projectId}/documents/${documentId}/`)
}

export async function getSalespeople() {
  const { data } = await api.get('/sales/people/')
  return data
}

export async function getSalesTargets(params = {}) {
  const { data } = await api.get('/sales/targets/', { params })
  return data
}

export async function saveSalesTargets(payload) {
  const { data } = await api.post('/sales/targets/', payload)
  return data
}

export async function getSalesRecords(params = {}) {
  const { data } = await api.get('/sales/records/', { params })
  return data
}

export async function createSalesRecord(payload) {
  const { data } = await api.post('/sales/records/', payload)
  return data
}

export async function updateSalesRecord(id, payload) {
  const { data } = await api.patch(`/sales/records/${id}/`, payload)
  return data
}

export async function deleteSalesRecord(id) {
  await api.delete(`/sales/records/${id}/`)
}

export async function getSalesReports(params = {}) {
  const { data } = await api.get('/sales/records/reports/', { params })
  return data
}

export async function getSalesDashboard(params = {}) {
  const { data } = await api.get('/sales/records/dashboard/', { params })
  return data
}

export function exportSalesProjectsExcelUrl(params = {}) {
  return queryUrl('/api/sales/projects/export/', params)
}

export function exportSalesOpportunitiesExcelUrl(params = {}) {
  return queryUrl('/api/sales/opportunities/export/', params)
}

export function exportSalesTargetsExcelUrl(params = {}) {
  return queryUrl('/api/sales/targets/export/', params)
}

export default api
