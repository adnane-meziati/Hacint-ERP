import { useEffect, useRef, useState } from 'react'
import { createUser, deleteUser, getAssets, getUsers, updateUser } from '../../api/client'
import { Badge, Button, Dialog, Flex, Input, Spinner, Text } from '@chakra-ui/react'

const ROLES = [
  { value: 'admin',           label: 'Administrateur',         colorPalette: 'purple', group: 'Système'     },
  { value: 'designer',        label: 'Designer',               colorPalette: 'blue',   group: 'Production'  },
  { value: 'programmer',      label: 'Programmateur',          colorPalette: 'green',  group: 'Production'  },
  { value: 'cnc',             label: 'Technicien CNC',         colorPalette: 'yellow', group: 'Production'  },
  { value: 'assembly',        label: 'Assembly',               colorPalette: 'purple', group: 'Production'  },
  { value: 'quality',         label: 'Qualité',                colorPalette: 'teal',   group: 'Production'  },
  { value: 'etude_technique', label: 'Étude Technique',        colorPalette: 'cyan',   group: 'Production'  },
  { value: 'storage',         label: 'Stockage',               colorPalette: 'orange', group: 'Opérations'  },
  { value: 'accounting',      label: 'Comptabilité',           colorPalette: 'green',  group: 'Opérations'  },
  { value: 'hr',              label: 'Ressources Humaines',    colorPalette: 'purple', group: 'Opérations'  },
  { value: 'logistics',       label: 'Logistique',             colorPalette: 'teal',   group: 'Opérations'  },
  { value: 'installation',    label: 'Installation',           colorPalette: 'indigo', group: 'Opérations'  },
  { value: 'sales_manager',   label: 'Responsable Commercial', colorPalette: 'rose',   group: 'Commercial'  },
  { value: 'sales_employee',  label: 'Commercial',             colorPalette: 'rose',   group: 'Commercial'  },
]

const PRODUCTION_ROLES = new Set([
  'designer', 'programmer', 'cnc', 'assembly', 'quality', 'etude_technique',
])

const AVATAR_COLORS = {
  purple: 'bg-purple-100 text-purple-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  teal:   'bg-teal-100 text-teal-700',
  cyan:   'bg-cyan-100 text-cyan-700',
  orange: 'bg-orange-100 text-orange-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  rose:   'bg-rose-100 text-rose-700',
  gray:   'bg-slate-100 text-slate-600',
}

function roleMeta(value) {
  return ROLES.find((r) => r.value === value) ?? { label: value, colorPalette: 'gray', group: '—' }
}

function avatarCls(rm) {
  return AVATAR_COLORS[rm.colorPalette] ?? AVATAR_COLORS.gray
}

// ─── Searchable role dropdown ─────────────────────────────────────────────────
function RoleSelect({ value, onChange }) {
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const containerRef          = useRef(null)
  const selected              = roleMeta(value)

  const groups = {}
  ROLES.forEach(r => {
    if (search && !r.label.toLowerCase().includes(search.toLowerCase())) return
    if (!groups[r.group]) groups[r.group] = []
    groups[r.group].push(r)
  })

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <span className={`inline-flex h-5 w-5 rounded-full text-xs font-bold items-center justify-center ${avatarCls(selected)}`}>
                {selected.label[0]}
              </span>
              <span className="text-slate-800">{selected.label}</span>
            </>
          ) : (
            <span className="text-slate-400">Choisir un rôle…</span>
          )}
        </div>
        <span className="text-slate-400 ml-2 shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              className="input text-sm py-1.5"
              placeholder="Rechercher un rôle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {Object.keys(groups).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">Aucun rôle trouvé</p>
            )}
            {Object.entries(groups).map(([group, roles]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">{group}</p>
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      value === r.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => { onChange(r.value); setOpen(false); setSearch('') }}
                  >
                    <span className={`inline-flex h-5 w-5 rounded-full text-xs font-bold items-center justify-center shrink-0 ${avatarCls(r)}`}>
                      {r.label[0]}
                    </span>
                    {r.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── User modal (create / edit) ───────────────────────────────────────────────
function UserModal({ user, onSave, onClose }) {
  const isEdit = Boolean(user)
  const [form, setForm] = useState({
    username:  user?.username  ?? '',
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? (user?.username ?? ''),
    role:      user?.role      ?? '',
    password:  '',
    assetIds:  user?.assetIds  ?? [],
  })
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [assets, setAssets]   = useState([])
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => { getAssets().then(setAssets).catch(() => {}) }, [])

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function toggleAsset(id) {
    setForm((f) => ({
      ...f,
      assetIds: f.assetIds.includes(id)
        ? f.assetIds.filter((x) => x !== id)
        : [...f.assetIds, id],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = { firstName: form.firstName, lastName: form.lastName, role: form.role, assetIds: form.assetIds, email: form.email }
      if (!isEdit) { payload.username = form.username; payload.password = form.password }
      if (form.password) payload.password = form.password
      const saved = isEdit ? await updateUser(user.id, payload) : await createUser(payload)
      onSave(saved)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  const rm = roleMeta(form.role)
  const showAssets = PRODUCTION_ROLES.has(form.role)
  const assetGroups = []
  const assetGroupIndex = new Map()
  for (const asset of assets) {
    const key = asset.departmentName ?? 'Sans département'
    if (!assetGroupIndex.has(key)) { assetGroupIndex.set(key, assetGroups.length); assetGroups.push({ name: key, assets: [] }) }
    assetGroups[assetGroupIndex.get(key)].assets.push(asset)
  }

  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="lg">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" pb={4}>
            <Flex align="center" gap={3}>
              {form.role ? (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${avatarCls(rm)}`}>
                  {(form.firstName || form.username || '?')[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <Dialog.Title fontWeight="semibold" color="gray.800" fontSize="lg">
                  {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
                </Dialog.Title>
                {form.role && (
                  <Badge colorPalette={rm.colorPalette} variant="subtle" borderRadius="full" fontSize="xs" mt={0.5}>
                    {rm.label}
                  </Badge>
                )}
              </div>
              <Dialog.CloseTrigger ml="auto" />
            </Flex>
          </Dialog.Header>

          <Dialog.Body overflowY="auto" maxH="70vh">
            <form id="user-form" onSubmit={handleSubmit} className="space-y-4 py-2">

              {!isEdit && (
                <div>
                  <label className="label">Email *</label>
                  <Input
                    type="text"
                    value={form.username}
                    onChange={(e) => set('username', e.target.value)}
                    placeholder="utilisateur@entreprise.com"
                    required
                    autoFocus
                  />
                </div>
              )}
              {isEdit && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Identifiant : </span>{user.username}
                  </div>
                </div>
              )}

              {isEdit && (
                <div>
                  <label className="label">
                    Email (pour la vérification 2FA)
                    <span className="text-slate-400 font-normal ml-1">— laisser vide pour désactiver le code OTP</span>
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="utilisateur@exemple.com"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom</label>
                  <Input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Prénom" />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <Input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Nom de famille" />
                </div>
              </div>

              <div>
                <label className="label">Rôle *</label>
                <RoleSelect value={form.role} onChange={(v) => set('role', v)} />
              </div>

              {showAssets && (
                <div>
                  <label className="label">Machines / PC assignés</label>
                  {assetGroups.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-1">Aucun actif enregistré.</p>
                  ) : (
                    <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {assetGroups.map((group) => (
                        <div key={group.name} className="p-2">
                          <p className="text-xs font-semibold text-slate-500 mb-1.5">{group.name}</p>
                          <div className="space-y-1.5">
                            {group.assets.map((a) => (
                              <label key={a.id} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
                                <input type="checkbox" className="rounded" checked={form.assetIds.includes(a.id)} onChange={() => toggleAsset(a.id)} />
                                <span>{a.name}</span>
                                <span className="text-xs text-slate-400">({a.assetTypeDisplay})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="label">
                  {isEdit ? 'Nouveau mot de passe' : 'Mot de passe *'}
                  {isEdit && <span className="text-slate-400 font-normal ml-1">(laisser vide pour ne pas changer)</span>}
                </label>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    required={!isEdit}
                    placeholder={isEdit ? '••••••••' : 'Mot de passe sécurisé'}
                    pr="10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    {showPwd ? 'Masquer' : 'Voir'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>
              )}
            </form>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" gap={3}>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button colorPalette="blue" form="user-form" type="submit" disabled={saving} loading={saving} loadingText="Enregistrement…">
              {isEdit ? 'Enregistrer les modifications' : "Créer l'utilisateur"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────
function ConfirmDelete({ user, onConfirm, onCancel }) {
  const rm = roleMeta(user.role)
  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onCancel()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="sm">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Dialog.Title fontWeight="semibold" color="gray.800">Supprimer l'utilisateur</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body py={4}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarCls(rm)}`}>
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-800 text-sm">{user.username}</p>
                <p className="text-xs text-slate-400">{rm.label}</p>
              </div>
            </div>
            <Text fontSize="sm" color="gray.600">
              Ce compte sera désactivé et l'utilisateur ne pourra plus se connecter.
            </Text>
          </Dialog.Body>
          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" gap={3}>
            <Button variant="outline" onClick={onCancel}>Annuler</Button>
            <Button colorPalette="red" onClick={onConfirm}>Supprimer</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// ─── Mobile user card ─────────────────────────────────────────────────────────
function UserCard({ u, isSelf, onEdit, onDelete }) {
  const rm = roleMeta(u.role)
  return (
    <div className="p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarCls(rm)}`}>
        {u.username[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 text-sm truncate">{u.username}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {[u.firstName, u.lastName].filter(Boolean).join(' ') || <span className="text-slate-400">—</span>}
        </p>
        <div className="mt-1.5">
          <Badge colorPalette={rm.colorPalette} variant="subtle" borderRadius="full" fontSize="xs">
            {rm.label}
          </Badge>
          {isSelf && <span className="ml-2 text-xs text-slate-400">vous</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button onClick={onEdit}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 active:bg-blue-100 font-medium">
          ✎ Modifier
        </button>
        {!isSelf && (
          <button onClick={onDelete}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 bg-red-50 active:bg-red-100 font-medium">
            ✕ Suppr.
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Admin Users Page ─────────────────────────────────────────────────────────
export default function AdminUsersPage({ currentUser }) {
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [search, setSearch]       = useState('')
  const [filterGroup, setFilter]  = useState('')

  useEffect(() => {
    getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleSaved(saved) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id)
      return idx >= 0 ? prev.map((u) => (u.id === saved.id ? saved : u)) : [...prev, saved]
    })
    setModal(null)
  }

  async function handleDelete(user) {
    await deleteUser(user.id)
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
    setModal(null)
  }

  const q = search.trim().toLowerCase()
  const filtered = users.filter((u) => {
    if (filterGroup) {
      const rm = roleMeta(u.role)
      if (rm.group !== filterGroup) return false
    }
    if (q) {
      const full = [u.username, u.firstName, u.lastName, roleMeta(u.role).label].join(' ').toLowerCase()
      if (!full.includes(q)) return false
    }
    return true
  })

  const totalByGroup = {}
  users.forEach(u => {
    const g = roleMeta(u.role).group
    totalByGroup[g] = (totalByGroup[g] || 0) + 1
  })

  const groups = ['Production', 'Opérations', 'Commercial', 'Système']
  const hasFilters = search || filterGroup

  return (
    <main className="max-w-screen-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email, nom, rôle…"
            className="input flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
              {[{ value: '', label: 'Tous' }, ...groups.map(g => ({ value: g, label: g }))].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-2 transition-colors whitespace-nowrap ${
                    filterGroup === opt.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
            <Button colorPalette="blue" onClick={() => setModal('create')}>
              + Nouvel utilisateur
            </Button>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={() => { setSearch(''); setFilter('') }} className="text-xs text-blue-600 hover:underline">
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total',       value: users.length,                        color: 'blue'   },
            { label: 'Production',  value: totalByGroup['Production']  ?? 0,    color: 'green'  },
            { label: 'Opérations',  value: totalByGroup['Opérations']  ?? 0,    color: 'orange' },
            { label: 'Commercial',  value: totalByGroup['Commercial']  ?? 0,    color: 'rose'   },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border border-${color}-200 bg-${color}-50 text-${color}-700 p-3 sm:p-4`}>
              <p className="text-xs sm:text-sm font-medium opacity-80">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
              <p className="text-xs opacity-60 mt-0.5">utilisateur{value !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table / Cards ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? 'Chargement…' : `${filtered.length} utilisateur${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <Flex direction="column" align="center" justify="center" py={16} gap={3} color="gray.400">
            <Spinner color="blue.600" size="md" />
            <p className="text-sm">Chargement…</p>
          </Flex>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">{hasFilters ? 'Aucun résultat' : 'Aucun utilisateur'}</p>
            <p className="text-sm">
              {hasFilters ? 'Modifiez votre recherche ou filtre.' : 'Cliquez sur "+ Nouvel utilisateur" pour commencer.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filtered.map((u) => (
                <UserCard
                  key={u.id}
                  u={u}
                  isSelf={u.id === currentUser?.id}
                  onEdit={() => setModal({ edit: u })}
                  onDelete={() => setModal({ delete: u })}
                />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Nom complet</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-48">Rôle</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Groupe</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => {
                    const rm = roleMeta(u.role)
                    const isSelf = u.id === currentUser?.id
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls(rm)}`}>
                              {u.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{u.username}</p>
                              {isSelf && <p className="text-xs text-slate-400">vous</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {[u.firstName, u.lastName].filter(Boolean).join(' ') || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge colorPalette={rm.colorPalette} variant="subtle" borderRadius="full">
                            {rm.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{rm.group}</td>
                        <td className="px-4 py-3">
                          <Flex gap={2}>
                            <Button size="xs" variant="outline" colorPalette="blue" onClick={() => setModal({ edit: u })}>
                              ✎ Modifier
                            </Button>
                            {!isSelf && (
                              <Button size="xs" variant="outline" colorPalette="red" onClick={() => setModal({ delete: u })}>
                                ✕
                              </Button>
                            )}
                          </Flex>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modal === 'create' && <UserModal onSave={handleSaved} onClose={() => setModal(null)} />}
      {modal?.edit   && <UserModal user={modal.edit} onSave={handleSaved} onClose={() => setModal(null)} />}
      {modal?.delete && (
        <ConfirmDelete user={modal.delete} onConfirm={() => handleDelete(modal.delete)} onCancel={() => setModal(null)} />
      )}
    </main>
  )
}
