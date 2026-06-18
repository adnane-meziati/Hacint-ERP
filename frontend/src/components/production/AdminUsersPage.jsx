import { useEffect, useState } from 'react'
import { createUser, deleteUser, getAssets, getUsers, updateUser } from '../../api/client'
import { Badge, Button, Dialog, Flex, Input, Spinner, Text } from '@chakra-ui/react'

const ROLES = [
  { value: 'admin',           label: 'Administrateur',  colorPalette: 'purple' },
  { value: 'designer',        label: 'Designer',         colorPalette: 'blue'   },
  { value: 'programmer',      label: 'Programmateur',    colorPalette: 'green'  },
  { value: 'cnc',             label: 'Technicien CNC',   colorPalette: 'yellow' },
  { value: 'assembly',        label: 'Assembly',         colorPalette: 'purple' },
  { value: 'quality',         label: 'Qualité',          colorPalette: 'teal'   },
  { value: 'storage',         label: 'Stockage',         colorPalette: 'orange' },
  { value: 'accounting',      label: 'Comptabilité',     colorPalette: 'green'  },
  { value: 'etude_technique', label: 'Étude Technique',  colorPalette: 'cyan'   },
]

const ROLE_ACTIVE_COLORS = {
  admin:           'bg-purple-600 text-white border-purple-600',
  designer:        'bg-blue-600 text-white border-blue-600',
  programmer:      'bg-green-600 text-white border-green-600',
  cnc:             'bg-yellow-500 text-white border-yellow-500',
  assembly:        'bg-purple-600 text-white border-purple-600',
  quality:         'bg-teal-600 text-white border-teal-600',
  storage:         'bg-orange-500 text-white border-orange-500',
  accounting:      'bg-green-600 text-white border-green-600',
  etude_technique: 'bg-cyan-600 text-white border-cyan-600',
}

function roleMeta(value) {
  return ROLES.find((r) => r.value === value) ?? ROLES[0]
}

// ─── User modal (create / edit) ───────────────────────────────────────────────
function UserModal({ user, onSave, onClose }) {
  const isEdit = Boolean(user)
  const [form, setForm] = useState({
    username:  user?.username  ?? '',
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    role:      user?.role      ?? 'designer',
    password:  '',
    assetIds:  user?.assetIds  ?? [],
  })
  const [error, setError]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [assets, setAssets] = useState([])

  useEffect(() => {
    getAssets().then(setAssets).catch(() => {})
  }, [])

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
      const payload = {
        firstName: form.firstName,
        lastName:  form.lastName,
        role:      form.role,
        assetIds:  form.assetIds,
      }
      if (!isEdit) {
        payload.username = form.username
        payload.password = form.password
      }
      if (form.password) payload.password = form.password

      const saved = isEdit
        ? await updateUser(user.id, payload)
        : await createUser(payload)
      onSave(saved)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  const assetGroups = []
  const assetGroupIndex = new Map()
  for (const asset of assets) {
    const key = asset.departmentName ?? 'Sans département'
    if (!assetGroupIndex.has(key)) {
      assetGroupIndex.set(key, assetGroups.length)
      assetGroups.push({ name: key, assets: [] })
    }
    assetGroups[assetGroupIndex.get(key)].assets.push(asset)
  }

  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="md">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Flex align="center" justify="space-between">
              <Dialog.Title fontWeight="semibold" color="gray.800" fontSize="lg">
                {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Flex>
          </Dialog.Header>

          <Dialog.Body>
            <form id="user-form" onSubmit={handleSubmit} className="space-y-4 py-2">
              {!isEdit && (
                <div>
                  <label className="label">Nom d'utilisateur *</label>
                  <Input
                    type="text"
                    value={form.username}
                    onChange={(e) => set('username', e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom</label>
                  <Input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <Input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Rôle *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => set('role', r.value)}
                      className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors text-center ${
                        form.role === r.value
                          ? ROLE_ACTIVE_COLORS[r.value]
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Machines / PC assignés</label>
                {assetGroups.length === 0 ? (
                  <p className="text-xs text-slate-400 mt-1">Aucun actif enregistré.</p>
                ) : (
                  <div className="mt-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {assetGroups.map((group) => (
                      <div key={group.name} className="p-2">
                        <p className="text-xs font-semibold text-slate-500 mb-1">{group.name}</p>
                        <div className="space-y-1">
                          {group.assets.map((a) => (
                            <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.assetIds.includes(a.id)}
                                onChange={() => toggleAsset(a.id)}
                              />
                              {a.name}
                              <span className="text-xs text-slate-400">({a.assetTypeDisplay})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">
                  {isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required={!isEdit}
                  placeholder={isEdit ? '••••••••' : ''}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>
              )}
            </form>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" gap={3}>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              colorPalette="blue"
              form="user-form"
              type="submit"
              disabled={saving}
              loading={saving}
              loadingText="Enregistrement…"
            >
              {isEdit ? 'Enregistrer' : "Créer l'utilisateur"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────
function ConfirmDelete({ user, onConfirm, onCancel }) {
  return (
    <Dialog.Root open={true} onOpenChange={({ open }) => !open && onCancel()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="sm">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100">
            <Dialog.Title fontWeight="semibold" color="gray.800">Supprimer l'utilisateur</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body py={4}>
            <Text fontSize="sm" color="gray.600">
              Désactiver le compte de{' '}
              <Text as="span" fontWeight="medium" color="gray.700">{user.username}</Text> ?
              {' '}Il ne pourra plus se connecter.
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

// ─── Admin Users Page ─────────────────────────────────────────────────────────
export default function AdminUsersPage({ currentUser }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(saved) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id)
      return idx >= 0
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [...prev, saved]
    })
    setModal(null)
  }

  async function handleDelete(user) {
    await deleteUser(user.id)
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
    setModal(null)
  }

  return (
    <main className="max-w-screen-lg mx-auto px-4 py-6 space-y-4">

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Gestion des utilisateurs</h2>
          <p className="text-sm text-slate-500 mt-0.5">Créer des comptes et attribuer les rôles</p>
        </div>
        <Button colorPalette="blue" onClick={() => setModal('create')}>
          + Nouvel utilisateur
        </Button>
      </div>

      {/* Role legend */}
      <div className="flex gap-3 flex-wrap">
        {ROLES.map((r) => (
          <Badge key={r.value} colorPalette={r.colorPalette} variant="subtle" px={3} py={1} borderRadius="full" fontSize="xs">
            {r.value === 'admin'      && '🔑 '}
            {r.value === 'designer'   && '✏️ '}
            {r.value === 'programmer' && '💻 '}
            {r.value === 'cnc'        && '🔧 '}
            {r.value === 'assembly'   && '🔩 '}
            {r.value === 'quality'    && '🔍 '}
            {r.label}
            {r.value === 'admin'      && ' — accès complet'}
            {r.value === 'designer'   && ' — Vue Designer uniquement'}
            {r.value === 'programmer' && ' — Vue Programmateur uniquement'}
            {r.value === 'cnc'        && ' — Vue CNC uniquement'}
            {r.value === 'assembly'   && ' — Vue Assembly uniquement'}
            {r.value === 'quality'    && ' — Vue Qualité uniquement'}
            {r.value === 'storage'    && ' — Vue Stockage uniquement'}
          </Badge>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <Flex direction="column" align="center" justify="center" py={16} gap={3} color="gray.400">
            <Spinner color="blue.600" size="md" />
            <Text fontSize="sm">Chargement…</Text>
          </Flex>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nom complet</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-44">Rôle</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const rm = roleMeta(u.role)
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                          {u.username[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.username}</p>
                          {isSelf && <p className="text-xs text-slate-400">vous</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge colorPalette={rm.colorPalette} variant="subtle" borderRadius="full">
                        {rm.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Flex gap={2}>
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="blue"
                          onClick={() => setModal({ edit: u })}
                        >
                          ✎ Modifier
                        </Button>
                        {!isSelf && (
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="red"
                            onClick={() => setModal({ delete: u })}
                          >
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
        )}
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <UserModal onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.edit && (
        <UserModal user={modal.edit} onSave={handleSaved} onClose={() => setModal(null)} />
      )}
      {modal?.delete && (
        <ConfirmDelete
          user={modal.delete}
          onConfirm={() => handleDelete(modal.delete)}
          onCancel={() => setModal(null)}
        />
      )}
    </main>
  )
}
