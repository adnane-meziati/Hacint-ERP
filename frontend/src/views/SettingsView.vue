<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.settings') }}</h1>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab.key
          ? 'border-primary text-primary'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- STAGES -->
    <div v-if="activeTab === 'stages'" class="space-y-4">
      <div class="flex justify-between items-center">
        <p class="text-sm text-slate-500">{{ t('settings.stagesDesc') }}</p>
        <button class="btn-primary" @click="openStageModal()">+ {{ t('settings.addStage') }}</button>
      </div>
      <div class="card overflow-x-auto p-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th class="text-left py-2 px-4">{{ t('settings.code') }}</th>
              <th class="text-left py-2 px-4">{{ t('settings.name') }}</th>
              <th class="text-right py-2 px-4">{{ t('settings.sequence') }}</th>
              <th class="text-center py-2 px-4">{{ t('settings.active') }}</th>
              <th class="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in stages"
              :key="s.id"
              class="border-b border-slate-100 dark:border-slate-800"
            >
              <td class="py-2 px-4 font-mono font-semibold text-primary">{{ s.code }}</td>
              <td class="py-2 px-4">{{ s.name }}</td>
              <td class="py-2 px-4 text-right">{{ s.sequence }}</td>
              <td class="py-2 px-4 text-center">
                <span class="inline-block w-2 h-2 rounded-full" :class="s.is_active ? 'bg-green-500' : 'bg-slate-300'" />
              </td>
              <td class="py-2 px-4 text-right">
                <button class="text-xs text-primary hover:underline" @click="openStageModal(s)">{{ t('common.edit') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- FAMILIES -->
    <div v-if="activeTab === 'families'" class="space-y-4">
      <div class="flex justify-between items-center">
        <p class="text-sm text-slate-500">{{ t('settings.familiesDesc') }}</p>
        <button class="btn-primary" @click="openFamilyModal()">+ {{ t('settings.addFamily') }}</button>
      </div>
      <div class="card overflow-x-auto p-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th class="text-left py-2 px-4">{{ t('settings.code') }}</th>
              <th class="text-left py-2 px-4">{{ t('settings.name') }}</th>
              <th class="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in families"
              :key="f.id"
              class="border-b border-slate-100 dark:border-slate-800"
            >
              <td class="py-2 px-4 font-mono font-semibold text-primary">{{ f.code }}</td>
              <td class="py-2 px-4">{{ f.name }}</td>
              <td class="py-2 px-4 text-right">
                <button class="text-xs text-primary hover:underline" @click="openFamilyModal(f)">{{ t('common.edit') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CLIENTS -->
    <div v-if="activeTab === 'clients'" class="space-y-4">
      <p class="text-sm text-slate-500">{{ t('settings.clientsDesc') }}</p>
      <div class="card overflow-x-auto p-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th class="text-left py-2 px-4">{{ t('settings.code') }}</th>
              <th class="text-left py-2 px-4">{{ t('settings.name') }}</th>
              <th class="text-left py-2 px-4">{{ t('settings.country') }}</th>
              <th class="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in clients"
              :key="c.id"
              class="border-b border-slate-100 dark:border-slate-800"
            >
              <td class="py-2 px-4 font-mono font-semibold text-primary">{{ c.code }}</td>
              <td class="py-2 px-4">{{ c.name }}</td>
              <td class="py-2 px-4 text-slate-500">{{ c.country }}</td>
              <td class="py-2 px-4 text-right">
                <button class="text-xs text-primary hover:underline" @click="openClientModal(c)">{{ t('common.edit') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generic modal -->
    <Teleport to="body">
      <div
        v-if="modal.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="modal.open = false"
      >
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ modal.title }}</h3>

          <div class="space-y-3">
            <div v-for="field in modal.fields" :key="field.key">
              <label class="form-label">{{ field.label }}</label>
              <input
                v-if="field.type !== 'checkbox'"
                v-model="modal.data[field.key]"
                class="form-input"
                :type="field.type ?? 'text'"
                :disabled="field.disabled"
              />
              <label v-else class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="modal.data[field.key]" class="w-4 h-4 rounded" />
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ field.label }}</span>
              </label>
            </div>
          </div>

          <p v-if="modal.error" class="text-sm text-red-500">{{ modal.error }}</p>

          <div class="flex justify-end gap-2 pt-2">
            <button class="btn-secondary" @click="modal.open = false">{{ t('common.cancel') }}</button>
            <button class="btn-primary" :disabled="modal.saving" @click="modal.onSave()">
              {{ modal.saving ? t('common.saving') : t('common.save') }}
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
import { useUiStore } from '@/stores/ui'
import apiClient from '@/api/client'

const { t } = useI18n()
const ui = useUiStore()

type TabKey = 'stages' | 'families' | 'clients'

const tabs = computed(() => [
  { key: 'stages' as TabKey, label: t('settings.stages') },
  { key: 'families' as TabKey, label: t('settings.families') },
  { key: 'clients' as TabKey, label: t('settings.clients') },
])
const activeTab = ref<TabKey>('stages')

// ── Data ──────────────────────────────────────────────────────────────────────
interface Stage { id: string; code: string; name: string; sequence: number; is_active: boolean }
interface Family { id: string; code: string; name: string }
interface Client { id: string; code: string; name: string; country: string; contact_email: string }

const stages = ref<Stage[]>([])
const families = ref<Family[]>([])
const clients = ref<Client[]>([])

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalField { key: string; label: string; type?: string; disabled?: boolean }

const modal = reactive({
  open: false,
  title: '',
  fields: [] as ModalField[],
  data: {} as Record<string, any>,
  saving: false,
  error: '',
  onSave: async () => {},
})

// ── Stages ────────────────────────────────────────────────────────────────────
function openStageModal(s?: Stage): void {
  modal.title = s ? t('settings.editStage') : t('settings.addStage')
  modal.fields = [
    { key: 'code', label: t('settings.code'), disabled: !!s },
    { key: 'name', label: t('settings.name') },
    { key: 'sequence', label: t('settings.sequence'), type: 'number' },
    { key: 'is_active', label: t('settings.active'), type: 'checkbox' },
  ]
  modal.data = s ? { ...s } : { code: '', name: '', sequence: stages.value.length + 1, is_active: true }
  modal.error = ''
  modal.open = true
  modal.onSave = async () => {
    modal.saving = true
    modal.error = ''
    try {
      if (s) {
        const { data } = await apiClient.patch(`/production/stages/${s.id}/`, modal.data)
        const idx = stages.value.findIndex(x => x.id === s.id)
        if (idx !== -1) stages.value[idx] = data
      } else {
        const { data } = await apiClient.post('/production/stages/create/', modal.data)
        stages.value.push(data)
        stages.value.sort((a, b) => a.sequence - b.sequence)
      }
      ui.addToast('success', t('common.saved'))
      modal.open = false
    } catch (e: any) {
      modal.error = JSON.stringify(e?.response?.data ?? t('common.error'))
    } finally {
      modal.saving = false
    }
  }
}

// ── Families ──────────────────────────────────────────────────────────────────
function openFamilyModal(f?: Family): void {
  modal.title = f ? t('settings.editFamily') : t('settings.addFamily')
  modal.fields = [
    { key: 'code', label: t('settings.code'), disabled: !!f },
    { key: 'name', label: t('settings.name') },
  ]
  modal.data = f ? { ...f } : { code: '', name: '' }
  modal.error = ''
  modal.open = true
  modal.onSave = async () => {
    modal.saving = true
    modal.error = ''
    try {
      if (f) {
        const { data } = await apiClient.patch(`/catalog/families/${f.id}/`, modal.data)
        const idx = families.value.findIndex(x => x.id === f.id)
        if (idx !== -1) families.value[idx] = data
      } else {
        const { data } = await apiClient.post('/catalog/families/create/', modal.data)
        families.value.push(data)
      }
      ui.addToast('success', t('common.saved'))
      modal.open = false
    } catch (e: any) {
      modal.error = JSON.stringify(e?.response?.data ?? t('common.error'))
    } finally {
      modal.saving = false
    }
  }
}

// ── Clients ───────────────────────────────────────────────────────────────────
function openClientModal(c?: Client): void {
  modal.title = t('settings.editClient')
  modal.fields = [
    { key: 'code', label: t('settings.code'), disabled: true },
    { key: 'name', label: t('settings.name') },
    { key: 'country', label: t('settings.country') },
    { key: 'contact_email', label: 'Email', type: 'email' },
  ]
  modal.data = c ? { ...c } : { code: '', name: '', country: '', contact_email: '' }
  modal.error = ''
  modal.open = true
  modal.onSave = async () => {
    if (!c) return
    modal.saving = true
    modal.error = ''
    try {
      const { data } = await apiClient.patch(`/catalog/clients/${c.id}/`, modal.data)
      const idx = clients.value.findIndex(x => x.id === c.id)
      if (idx !== -1) clients.value[idx] = data
      ui.addToast('success', t('common.saved'))
      modal.open = false
    } catch (e: any) {
      modal.error = JSON.stringify(e?.response?.data ?? t('common.error'))
    } finally {
      modal.saving = false
    }
  }
}

onMounted(async () => {
  const [s, f, c] = await Promise.all([
    apiClient.get('/production/stages/'),
    apiClient.get('/catalog/families/'),
    apiClient.get('/catalog/clients/'),
  ])
  stages.value = s.data.results ?? s.data
  families.value = f.data.results ?? f.data
  clients.value = c.data.results ?? c.data
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
