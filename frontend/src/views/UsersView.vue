<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.users') }}</h1>
      <button class="btn-primary" @click="openCreate">+ {{ t('users.new') }}</button>
    </div>

    <!-- Search -->
    <div class="flex gap-2">
      <input
        v-model="search"
        class="form-input max-w-xs"
        :placeholder="t('common.search') + '...'"
      />
    </div>

    <!-- Table -->
    <div class="card overflow-x-auto p-0">
      <div v-if="loading" class="p-8 text-center text-slate-400">{{ t('common.loading') }}</div>
      <table v-else class="min-w-full text-sm">
        <thead>
          <tr class="text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th class="text-left py-2 px-4">{{ t('users.username') }}</th>
            <th class="text-left py-2 px-4">{{ t('users.fullName') }}</th>
            <th class="text-left py-2 px-4">{{ t('users.role') }}</th>
            <th class="text-left py-2 px-4">Email</th>
            <th class="text-left py-2 px-4">{{ t('users.status') }}</th>
            <th class="py-2 px-4" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in filtered"
            :key="u.id"
            class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <td class="py-2 px-4 font-mono font-semibold text-primary">{{ u.username }}</td>
            <td class="py-2 px-4">{{ u.first_name }} {{ u.last_name }}</td>
            <td class="py-2 px-4 capitalize">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="roleClass(u.role)">
                {{ u.role }}
              </span>
            </td>
            <td class="py-2 px-4 text-slate-500">{{ u.email }}</td>
            <td class="py-2 px-4">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="u.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'"
              >
                {{ u.is_active ? t('users.active') : t('users.inactive') }}
              </span>
            </td>
            <td class="py-2 px-4">
              <div class="flex gap-2 justify-end">
                <button class="text-xs text-primary hover:underline" @click="openEdit(u)">
                  {{ t('common.edit') }}
                </button>
                <button
                  v-if="u.id !== auth.user?.id"
                  class="text-xs"
                  :class="u.is_active ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'"
                  @click="toggleActive(u)"
                >
                  {{ u.is_active ? t('users.deactivate') : t('users.activate') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="py-8 text-center text-slate-400">{{ t('common.noData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="modal = false"
      >
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {{ editing ? t('users.editUser') : t('users.newUser') }}
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">{{ t('users.firstName') }}</label>
              <input v-model="formData.first_name" class="form-input" type="text" />
            </div>
            <div>
              <label class="form-label">{{ t('users.lastName') }}</label>
              <input v-model="formData.last_name" class="form-input" type="text" />
            </div>
            <div>
              <label class="form-label">{{ t('users.username') }}</label>
              <input v-model="formData.username" class="form-input" type="text" :disabled="!!editing" />
            </div>
            <div>
              <label class="form-label">{{ t('users.role') }}</label>
              <select v-model="formData.role" class="form-input">
                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="form-label">Email</label>
              <input v-model="formData.email" class="form-input" type="email" />
            </div>
            <div v-if="!editing" class="col-span-2">
              <label class="form-label">{{ t('users.password') }}</label>
              <input v-model="formData.password" class="form-input" type="password" autocomplete="new-password" />
            </div>
          </div>

          <p v-if="modalError" class="text-sm text-red-500">{{ modalError }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button class="btn-secondary" @click="modal = false">{{ t('common.cancel') }}</button>
            <button class="btn-primary" :disabled="saving" @click="saveUser">
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()

const ROLES = ['admin', 'planner', 'designer', 'programmer', 'operator', 'assembly', 'qc', 'client']

interface UserRow {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  phone: string
  avatar: string | null
  is_active: boolean
}

const users = ref<UserRow[]>([])
const loading = ref(true)
const search = ref('')
const modal = ref(false)
const editing = ref<UserRow | null>(null)
const saving = ref(false)
const modalError = ref('')

const formData = reactive({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'operator',
  password: '',
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.first_name.toLowerCase().includes(q) ||
    u.last_name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  )
})

function roleClass(role: string): string {
  const map: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    planner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    designer: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    programmer: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    operator: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    assembly: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    qc: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    client: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  }
  return map[role] ?? 'bg-slate-100 text-slate-600'
}

function openCreate(): void {
  editing.value = null
  formData.username = ''
  formData.first_name = ''
  formData.last_name = ''
  formData.email = ''
  formData.role = 'operator'
  formData.password = ''
  modalError.value = ''
  modal.value = true
}

function openEdit(u: UserRow): void {
  editing.value = u
  formData.username = u.username
  formData.first_name = u.first_name
  formData.last_name = u.last_name
  formData.email = u.email
  formData.role = u.role
  formData.password = ''
  modalError.value = ''
  modal.value = true
}

async function saveUser(): Promise<void> {
  saving.value = true
  modalError.value = ''
  try {
    if (editing.value) {
      const payload: Record<string, string> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
      }
      const { data } = await apiClient.patch(`/users/${editing.value.id}/`, payload)
      const idx = users.value.findIndex(u => u.id === editing.value!.id)
      if (idx !== -1) users.value[idx] = data
    } else {
      const { data } = await apiClient.post('/users/', formData)
      users.value.unshift(data)
    }
    ui.addToast('success', t('common.saved'))
    modal.value = false
  } catch (e: any) {
    const detail = e?.response?.data
    modalError.value = typeof detail === 'string' ? detail : JSON.stringify(detail)
  } finally {
    saving.value = false
  }
}

async function toggleActive(u: UserRow): Promise<void> {
  try {
    const { data } = await apiClient.patch(`/users/${u.id}/`, { is_active: !u.is_active })
    const idx = users.value.findIndex(x => x.id === u.id)
    if (idx !== -1) users.value[idx] = data
    ui.addToast('success', t('common.saved'))
  } catch {
    ui.addToast('error', t('common.error'))
  }
}

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/users/')
    users.value = data.results ?? data
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700; }
.form-label { @apply block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1; }
.form-input {
  @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
         text-sm text-slate-800 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50;
}
.btn-primary {
  @apply px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium
         hover:bg-primary/90 disabled:opacity-50 transition-colors;
}
.btn-secondary {
  @apply px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300
         hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors;
}
</style>
