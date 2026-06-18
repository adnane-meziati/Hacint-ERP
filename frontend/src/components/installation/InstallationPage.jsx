import { useEffect, useMemo, useState } from 'react'
import { getInstallationDashboard, installationApi, installationExportUrl } from '../../api/client'

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'projects', label: 'Projets' },
  { id: 'products', label: 'Produits' },
]


const PROJECT_STATUS = ['En attente', 'En cours', 'Suspendu', 'Terminé', 'Annulé']
const TASK_STATUS = ['À faire', 'En cours', 'Bloquée', 'Terminée']
const PRIORITIES = ['Critique', 'Haute', 'Moyenne', 'Basse']

function safeList(data) {
  return data?.results || data || []
}

function StatCard({ title, value, tone = 'blue' }) {
  const tones = { blue: 'text-blue-600', green: 'text-emerald-600', orange: 'text-orange-600', red: 'text-red-600', purple: 'text-purple-600' }
  return <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><p className="text-sm text-slate-500">{title}</p><p className={`text-2xl font-bold mt-1 ${tones[tone] || 'text-slate-900'}`}>{value ?? 0}</p></div>
}

function Badge({ value }) {
  const v = String(value ?? '—')
  const low = v.toLowerCase()
  const cls = low.includes('termin') || low.includes('valide') || low.includes('actif') ? 'bg-emerald-50 text-emerald-700' : low.includes('bloqu') || low.includes('critique') || low.includes('retard') || low.includes('annul') ? 'bg-red-50 text-red-700' : low.includes('cours') || low.includes('haute') ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
  return <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${cls}`}>{v}</span>
}

function ExportButtons({ resource, project }) {
  const params = project ? { project } : {}
  const open = (fmt) => window.open(installationExportUrl(resource, fmt, params), '_blank')
  return <div className="flex flex-wrap gap-2">
    <button type="button" onClick={() => open('pdf')} className="btn-secondary">Export PDF</button>
    <button type="button" onClick={() => open('xlsx')} className="btn-secondary">Export Excel</button>
    <button type="button" onClick={() => open('csv')} className="btn-secondary">Export CSV</button>
  </div>
}

function Select({ value, onChange, options, placeholder = 'Sélectionner...' }) {
  return <select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  useEffect(() => { getInstallationDashboard().then(setStats).catch(() => setStats({})) }, [])
  return <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-900">Installation</h2><p className="text-sm text-slate-500">Gestion des projets d'installation, produits et tasks.</p></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <StatCard title="Projets" value={stats?.projects} tone="blue" />
      <StatCard title="Projets actifs" value={stats?.activeProjects} tone="purple" />
      <StatCard title="Projets terminés" value={stats?.finishedProjects} tone="green" />
      <StatCard title="Projets en retard" value={stats?.lateProjects} tone="red" />
      <StatCard title="Produits" value={stats?.products} tone="blue" />
      <StatCard title="Tâches ouvertes" value={stats?.openTasks} tone="orange" />
      <StatCard title="Tâches terminées" value={stats?.finishedTasks} tone="green" />
          </div>
  </div>
}

function ProjectsTab() {
  const empty = { name: '', client: '', address: '', startDate: '', plannedEndDate: '', supervisor: '', status: 'En attente', description: '', progress: 0 }
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      const data = await installationApi.list('projects', params)
      let list = safeList(data)
      if (status) list = list.filter(p => p.status === status)
      setRows(list)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  function fillDemo() { setSelected(null); setForm({ ...empty, name: 'Projet Installation Tanger', client: 'Renault', address: 'Zone Industrielle Tanger', startDate: '2026-06-15', plannedEndDate: '2026-07-15', supervisor: 'Responsable client', status: 'En cours', description: 'Projet installation produits HACINT', progress: 25 }) }
  async function save(e) { e.preventDefault(); const payload = { ...form }; Object.keys(payload).forEach(k => payload[k] === '' && delete payload[k]); selected ? await installationApi.update('projects', selected.id, payload) : await installationApi.create('projects', payload); setForm(empty); setSelected(null); await load() }
  function edit(row) { setSelected(row); setForm({ ...empty, ...row }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function remove(row) { if (!confirm('Supprimer ce projet ?')) return; await installationApi.delete('projects', row.id); if (detail?.id === row.id) setDetail(null); await load() }

  if (detail) return <ProjectDetail project={detail} onBack={() => { setDetail(null); load() }} />

  return <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"><div><h2 className="text-xl font-bold text-slate-900">Projets installation</h2><p className="text-sm text-slate-500">Clique sur un projet pour afficher uniquement ses Tasks.</p></div><button onClick={fillDemo} className="btn-primary">+ Nouveau projet</button></div>
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div><label className="label">Nom projet *</label><input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Client *</label><input className="input" required value={form.client || ''} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
        <div><label className="label">Adresse</label><input className="input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
        <div><label className="label">Superviseur client</label><input className="input" value={form.supervisor || ''} onChange={e => setForm({ ...form, supervisor: e.target.value })} /></div>
        <div><label className="label">Date début</label><input type="date" className="input" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
        <div><label className="label">Date fin prévue</label><input type="date" className="input" value={form.plannedEndDate || ''} onChange={e => setForm({ ...form, plannedEndDate: e.target.value })} /></div>
        <div><label className="label">Statut</label><Select value={form.status} onChange={v => setForm({ ...form, status: v })} options={PROJECT_STATUS} /></div>
        <div><label className="label">Avancement %</label><input type="number" min="0" max="100" className="input" value={form.progress ?? 0} onChange={e => setForm({ ...form, progress: e.target.value })} /></div>
        <div className="sm:col-span-2 lg:col-span-4"><label className="label">Description</label><input className="input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">{selected && <button type="button" className="btn-secondary" onClick={() => { setSelected(null); setForm(empty) }}>Annuler</button>}<button className="btn-primary">{selected ? 'Modifier' : 'Enregistrer'}</button></div>
      </form>
    </div>
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-3 border-b border-slate-100 flex flex-col md:flex-row gap-2 md:items-center md:justify-between"><div className="flex flex-1 gap-2"><input className="input" placeholder="Rechercher projet, client..." value={search} onChange={e => setSearch(e.target.value)} /><Select value={status} onChange={setStatus} options={PROJECT_STATUS} placeholder="Tous statuts" /><button className="btn-secondary" onClick={load}>Actualiser</button></div></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr><th className="p-3 text-left">Projet</th><th className="p-3 text-left">Client</th><th className="p-3">Produits</th><th className="p-3">Tasks</th><th className="p-3">Avancement</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{loading && <tr><td colSpan="7" className="p-8 text-center text-slate-400">Chargement...</td></tr>}{!loading && rows.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-slate-400">Aucun projet trouvé</td></tr>}{rows.map(row => <tr key={row.id} className="hover:bg-slate-50"><td className="p-3 font-semibold text-blue-700 cursor-pointer" onClick={() => setDetail(row)}>{row.name}</td><td className="p-3">{row.client}</td><td className="p-3 text-center">{row.productsCount}</td><td className="p-3 text-center">{row.tasksCount}</td><td className="p-3 text-center">{row.progress}%</td><td className="p-3"><Badge value={row.status} /></td><td className="p-3 text-right"><button className="text-blue-600 font-medium mr-3" onClick={() => edit(row)}>Modifier</button><button className="text-red-600 font-medium" onClick={() => remove(row)}>Supprimer</button></td></tr>)}</tbody></table></div></div>
  </div>
}

function ProjectDetail({ project, onBack }) {
  return <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><button className="text-blue-600 text-sm font-semibold mb-2" onClick={onBack}>← Retour aux projets</button><h2 className="text-2xl font-bold text-slate-900">{project.name}</h2><p className="text-sm text-slate-500">Client: {project.client} · Statut: {project.status} · Avancement: {project.progress}%</p></div></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><StatCard title="Produits liés" value={project.productsCount} /><StatCard title="Tasks" value={project.tasksCount} tone="purple" /><StatCard title="Tasks terminées" value={project.finishedTasksCount} tone="green" /><StatCard title="Avancement" value={`${project.progress}%`} tone="orange" /></div>
    <TasksTab project={project.id} embedded />
  </div>
}

function TasksTab({ project, embedded = false }) {
  const empty = { project: project || '', name: '', description: '', status: 'À faire', startDate: '', dueDate: '', priority: 'Moyenne', assignedTo: '', scheduledAt: '', comment: '', attachment: null }
  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  async function loadProjects() { const data = await installationApi.list('projects', { page_size: 200 }); setProjects(safeList(data)) }
  async function load() { const params = {}; if (search) params.search = search; if (project) params.project = project; const data = await installationApi.list('tasks', params); setRows(safeList(data)) }
  useEffect(() => { loadProjects(); load() }, [project])
  function fd() {
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (['assignedTo', 'scheduledAt'].includes(k)) return
      if (v !== '' && v !== null && v !== undefined) data.append(k, v)
    })
    const affectation = [
      form.assignedTo ? `Affecté à: ${form.assignedTo}` : '',
      form.scheduledAt ? `Planning: ${String(form.scheduledAt).replace('T', ' ')}` : ''
    ].filter(Boolean).join(' | ')
    if (affectation) data.set('comment', `${affectation}${form.comment ? `\n${form.comment}` : ''}`)
    return data
  }
  async function save(e) { e.preventDefault(); selected ? await installationApi.update('tasks', selected.id, fd()) : await installationApi.create('tasks', fd()); setForm(empty); setSelected(null); await load() }
  function edit(row) { setSelected(row); setForm({ ...empty, ...row, attachment: null }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function remove(row) { if (!confirm('Supprimer cette task ?')) return; await installationApi.delete('tasks', row.id); await load() }
  return <div className="space-y-4"><div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><div className="flex justify-between gap-3 mb-4"><div><h2 className="text-xl font-bold text-slate-900">Tasks {embedded ? 'du projet' : 'installation'}</h2><p className="text-sm text-slate-500">Les tâches sont créées et suivies dans le projet.</p></div></div><form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{!project && <div><label className="label">Projet *</label><Select value={form.project} onChange={v => setForm({ ...form, project: v })} options={projects.map(p => ({ value: p.id, label: p.name }))} /></div>}<div><label className="label">Nom tâche *</label><input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Statut</label><Select value={form.status} onChange={v => setForm({ ...form, status: v })} options={TASK_STATUS} /></div><div><label className="label">Priorité</label><Select value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={PRIORITIES} /></div><div><label className="label">Affecté à</label><input className="input" placeholder="Ex: Ahmed, Youssef, équipe installation" value={form.assignedTo || ''} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></div><div><label className="label">Heure / planning</label><input type="datetime-local" className="input" value={form.scheduledAt || ''} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></div><div><label className="label">Date début</label><input type="date" className="input" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div><div><label className="label">Échéance</label><input type="date" className="input" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div><div className="sm:col-span-2"><label className="label">Description</label><input className="input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div><label className="label">Pièce jointe</label><input type="file" className="input" onChange={e => setForm({ ...form, attachment: e.target.files[0] })} /></div><div className="sm:col-span-2 lg:col-span-4"><label className="label">Commentaire</label><input className="input" value={form.comment || ''} onChange={e => setForm({ ...form, comment: e.target.value })} /></div><div className="sm:col-span-2 lg:col-span-4 flex justify-between gap-2"><span /><div>{selected && <button type="button" className="btn-secondary mr-2" onClick={() => { setSelected(null); setForm(empty) }}>Annuler</button>}<button className="btn-primary">{selected ? 'Modifier' : '+ Nouvelle tâche'}</button></div></div></form></div><SimpleTable rows={rows} columns={[['name','Tâche'],['projectLabel','Projet'],['status','Statut'],['priority','Priorité'],['dueDate','Échéance'],['comment','Commentaire']]} onEdit={edit} onRemove={remove} search={search} setSearch={setSearch} load={load} /></div>
}

function ProductsTab() {
  const empty = { project: '', reference: '', name: '', description: '', date: '', status: 'Actif', image: null, file: null }
  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [taskProject, setTaskProject] = useState(null)
  async function loadProjects() { const data = await installationApi.list('projects', { page_size: 200 }); setProjects(safeList(data)) }
  async function load() { const data = await installationApi.list('products', search ? { search } : {}); setRows(safeList(data)) }
  useEffect(() => { loadProjects(); load() }, [])
  function toFormData() { const data = new FormData(); Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) data.append(k, v) }); return data }
  async function save(e) {
    e.preventDefault()
    const projectId = form.project || selected?.project || selected?.projectId
    selected ? await installationApi.update('products', selected.id, toFormData()) : await installationApi.create('products', toFormData())
    setForm(empty); setSelected(null); await load(); await loadProjects()
    if (projectId) setTaskProject(projectId)
  }
  function edit(row) { setSelected(row); setForm({ ...empty, ...row, image: null, file: null }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function remove(row) { if (!confirm('Supprimer ce produit ?')) return; await installationApi.delete('products', row.id); await load() }
  const selectedProject = projects.find(p => String(p.id) === String(taskProject))
  if (taskProject) return <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div>
        <button className="text-blue-600 text-sm font-semibold mb-2" onClick={() => setTaskProject(null)}>← Retour aux produits</button>
        <h2 className="text-2xl font-bold text-slate-900">Tasks du projet</h2>
        <p className="text-sm text-slate-500">Produit enregistré. Continue directement avec les tasks du projet {selectedProject?.name ? `: ${selectedProject.name}` : ''}.</p>
      </div>
    </div>
    <TasksTab project={taskProject} embedded />
  </div>
  return <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <h2 className="text-xl font-bold text-slate-900">Produits installation</h2>
      <p className="text-sm text-slate-500 mb-4">Ajoute le produit avec image/PDF/fichier. Après l'enregistrement, HACINT ouvre directement les tasks du projet choisi.</p>
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div><label className="label">Projet *</label><Select value={form.project} onChange={v => setForm({ ...form, project: v })} options={projects.map(p => ({ value: p.id, label: p.name }))} /></div>
        <div><label className="label">Référence *</label><input className="input" required value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })}/></div>
        <div><label className="label">Nom produit *</label><input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
        <div><label className="label">Statut</label><input className="input" value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}/></div>
        <div><label className="label">Date</label><input type="date" className="input" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })}/></div>
        <div className="sm:col-span-2"><label className="label">Description *</label><input className="input" required value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}/></div>
        <div><label className="label">Image produit</label><input type="file" accept="image/*" className="input" onChange={e => setForm({ ...form, image: e.target.files[0] })}/></div>
        <div><label className="label">Fichier produit</label><input type="file" className="input" onChange={e => setForm({ ...form, file: e.target.files[0] })}/></div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-between gap-2"><span /><div>{selected && <button type="button" className="btn-secondary mr-2" onClick={() => { setSelected(null); setForm(empty) }}>Annuler</button>}<button className="btn-primary">{selected ? 'Modifier' : '+ Nouveau produit'}</button></div></div>
      </form>
    </div>
    <SimpleTable rows={rows} columns={[["reference","Réf"],["name","Produit"],["projectLabel","Projet"],["date","Date"],["status","Statut"],["imageUrl","Image"],["fileUrl","Fichier"]]} onEdit={edit} onRemove={remove} search={search} setSearch={setSearch} load={load} linkColumns={["imageUrl","fileUrl"]} />
  </div>
}


function DocumentsTab() { return <GenericTab resource="documents" title="Documents" subtitle="Documents liés aux projets installation." fields={[['project','Projet','selectProject'],['title','Titre','text',true],['documentType','Type','text'],['file','Fichier','file'],['status','Statut','text']]} columns={[['title','Titre'],['documentType','Type'],['projectLabel','Projet'],['status','Statut'],['fileUrl','Fichier']]} exportResource="documents" /> }
function ReportsTab() { return <GenericTab resource="reports" title="Rapports" subtitle="Rapports projet avec export PDF / Excel / CSV." fields={[['project','Projet','selectProject'],['reference','Référence','text',true],['title','Titre','text',true],['reportType','Type','text'],['summary','Résumé','text'],['status','Statut','text']]} columns={[['reference','Référence'],['title','Titre'],['reportType','Type'],['projectLabel','Projet'],['status','Statut']]} exportResource="reports" /> }
function NotificationsTab() { return <GenericTab resource="notifications" title="Notifications" subtitle="Alertes projet, retard task, document ajouté." fields={[['project','Projet','selectProject'],['title','Titre','text',true],['message','Message','text'],['level','Niveau','text'],['isRead','Lu','checkbox']]} columns={[['title','Titre'],['projectLabel','Projet'],['level','Niveau'],['message','Message'],['isRead','Lu']]} /> }

function GenericTab({ resource, title, subtitle, fields, columns, exportResource }) {
  const empty = Object.fromEntries(fields.map(([k, , type]) => [k, type === 'checkbox' ? false : '']))
  const [projects, setProjects] = useState([]), [rows, setRows] = useState([]), [form, setForm] = useState(empty), [selected, setSelected] = useState(null), [search, setSearch] = useState('')
  async function loadProjects() { const data = await installationApi.list('projects', { page_size: 200 }); setProjects(safeList(data)) }
  async function load() { const data = await installationApi.list(resource, search ? { search } : {}); setRows(safeList(data)) }
  useEffect(() => { loadProjects(); load() }, [resource])
  function payload() { if (fields.some(f => f[2] === 'file')) { const fd = new FormData(); Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v) }); return fd } return form }
  async function save(e) { e.preventDefault(); selected ? await installationApi.update(resource, selected.id, payload()) : await installationApi.create(resource, payload()); setForm(empty); setSelected(null); await load() }
  function edit(row) { setSelected(row); setForm({ ...empty, ...row, file: null }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function remove(row) { if (!confirm('Supprimer cet élément ?')) return; await installationApi.delete(resource, row.id); await load() }
  return <div className="space-y-4"><div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"><h2 className="text-xl font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-500 mb-4">{subtitle}</p><form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{fields.map(([key, label, type, required]) => <div key={key} className={type === 'text' && key === 'message' ? 'sm:col-span-2' : ''}><label className="label">{label}{required ? ' *' : ''}</label>{type === 'selectProject' ? <Select value={form[key]} onChange={v => setForm({ ...form, [key]: v })} options={projects.map(p => ({ value: p.id, label: p.name }))} /> : type === 'file' ? <input type="file" className="input" onChange={e => setForm({ ...form, [key]: e.target.files[0] })} /> : type === 'checkbox' ? <input type="checkbox" checked={!!form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} /> : <input className="input" required={!!required} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />}</div>)}<div className="sm:col-span-2 lg:col-span-4 flex justify-between gap-2">{exportResource ? <ExportButtons resource={exportResource} /> : <span /> }<div>{selected && <button type="button" className="btn-secondary mr-2" onClick={() => { setSelected(null); setForm(empty) }}>Annuler</button>}<button className="btn-primary">{selected ? 'Modifier' : 'Enregistrer'}</button></div></div></form></div><SimpleTable rows={rows} columns={columns} onEdit={edit} onRemove={remove} search={search} setSearch={setSearch} load={load} linkColumns={['fileUrl']} /></div>
}

function SimpleTable({ rows, columns, onEdit, onRemove, search, setSearch, load, linkColumns = [] }) {
  return <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-3 border-b border-slate-100 flex gap-2"><input className="input" placeholder="Rechercher..." value={search || ''} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load() }} /><button className="btn-secondary" onClick={load}>Actualiser</button></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-slate-500 uppercase text-xs"><tr>{columns.map(([, label]) => <th key={label} className="text-left p-3 font-semibold">{label}</th>)}<th className="text-right p-3 font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length === 0 && <tr><td colSpan={columns.length + 1} className="p-10 text-center text-slate-400">Aucun résultat</td></tr>}{rows.map(row => <tr key={row.id} className="hover:bg-slate-50">{columns.map(([key]) => <td key={key} className="p-3 text-slate-700 whitespace-nowrap">{key.toLowerCase().includes('status') || key.toLowerCase().includes('priority') || key === 'level' ? <Badge value={row[key]} /> : linkColumns.includes(key) && row[key] ? <a className="text-blue-600 font-medium" href={row[key]} target="_blank" rel="noreferrer">Voir</a> : String(row[key] ?? '—')}</td>)}<td className="p-3 text-right whitespace-nowrap"><button onClick={() => onEdit(row)} className="text-blue-600 font-medium mr-3">Modifier</button><button onClick={() => onRemove(row)} className="text-red-600 font-medium">Supprimer</button></td></tr>)}</tbody></table></div></div>
}

function PlanningTab() { return <TasksTab /> }
function KpiTab() { const [stats, setStats] = useState(null); useEffect(() => { getInstallationDashboard().then(setStats).catch(() => setStats({})) }, []); return <div className="space-y-4"><div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h2 className="text-xl font-bold text-slate-900">KPI Installation</h2><p className="text-sm text-slate-500">Indicateurs de pilotage du module installation.</p></div><div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3"><StatCard title="Projets" value={stats?.projects}/><StatCard title="Actifs" value={stats?.activeProjects} tone="purple"/><StatCard title="Terminés" value={stats?.finishedProjects} tone="green"/><StatCard title="Retards projets" value={stats?.lateProjects} tone="red"/><StatCard title="Tasks" value={stats?.tasks}/><StatCard title="Tasks ouvertes" value={stats?.openTasks} tone="orange"/><StatCard title="Tasks terminées" value={stats?.finishedTasks} tone="green"/><StatCard title="Tasks en retard" value={stats?.lateTasks} tone="red"/></div></div> }

export default function InstallationPage({ installationTab, onTabChange }) {
  const active = TABS.find(t => t.id === installationTab) ? installationTab : 'dashboard'
  return <main className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100"><h1 className="text-xl font-bold text-slate-900">Installation</h1><p className="text-sm text-slate-500">Projets, produits et tasks.</p></div>
      <nav className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>{TABS.map(t => <button key={t.id} onClick={() => onTabChange(t.id)} className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active === t.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>{t.label}</button>)}</nav>
    </div>
    {active === 'dashboard' && <Dashboard/>} {active === 'projects' && <ProjectsTab/>} {active === 'products' && <ProductsTab/>}
  </main>
}
