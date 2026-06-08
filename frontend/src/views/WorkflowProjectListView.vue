<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('workflow.projects') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ projects.length }} projet(s)</p>
      </div>
      <button
        v-if="canCreate"
        class="btn-primary flex items-center gap-2"
        @click="showForm = !showForm"
      >
        <span class="text-lg leading-none">+</span>
        {{ t('workflow.newProject') }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showForm" class="card mb-6 border border-blue-200 dark:border-blue-700">
      <h2 class="font-semibold text-gray-800 dark:text-gray-100 mb-4">{{ t('workflow.newProject') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">Code *</label>
          <input v-model="form.code" class="input" placeholder="PROJ-2026-001" />
        </div>
        <div>
          <label class="label">{{ t('common.name') }}</label>
          <input v-model="form.name" class="input" placeholder="Nom du projet" />
        </div>
        <div class="md:col-span-2">
          <label class="label">{{ t('common.description') }}</label>
          <textarea v-model="form.description" class="input" rows="2" placeholder="Description optionnelle" />
        </div>
      </div>
      <div class="flex gap-3 mt-4">
        <button class="btn-primary" :disabled="!form.code || !form.name || store.loading" @click="submit">
          {{ store.loading ? '...' : 'Créer' }}
        </button>
        <button class="btn-secondary" @click="showForm = false; resetForm()">Annuler</button>
      </div>
      <p v-if="store.error" class="text-red-500 text-sm mt-2">{{ store.error }}</p>
    </div>

    <!-- Status filter -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button
        v-for="s in statuses"
        :key="s.value"
        class="px-3 py-1 rounded-full text-sm font-medium border transition-colors"
        :class="filterStatus === s.value
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:border-blue-400'"
        @click="filterStatus = filterStatus === s.value ? '' : s.value"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && !projects.length" class="text-center py-12 text-gray-400">
      Chargement…
    </div>

    <!-- Project cards -->
    <div v-else-if="filtered.length" class="space-y-3">
      <div
        v-for="project in filtered"
        :key="project.id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
        @click="router.push(`/workflow/${project.id}`)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{{ project.code }}</span>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="statusClass(project.status)"
              >{{ statusLabel(project.status) }}</span>
            </div>
            <p class="font-medium text-gray-800 dark:text-gray-100 truncate">{{ project.name }}</p>
            <p v-if="project.description" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ project.description }}</p>
          </div>
          <div class="ml-4 text-right shrink-0">
            <span class="text-2xl font-bold text-gray-700 dark:text-gray-200">{{ project.order_count }}</span>
            <p class="text-xs text-gray-400">ordres</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-16 text-gray-400">
      <p class="text-5xl mb-3">📁</p>
      <p>Aucun projet{{ filterStatus ? ' pour ce statut' : '' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWorkflowStore } from '@/stores/workflow'
import { useAuthStore } from '@/stores/auth'
import type { ProjectStatus } from '@/api/workflow'

const { t } = useI18n()
const router = useRouter()
const store = useWorkflowStore()
const auth = useAuthStore()

const showForm = ref(false)
const filterStatus = ref('')

const form = ref({ code: '', name: '', description: '' })

const canCreate = computed(() => ['admin', 'planner'].includes(auth.user?.role ?? ''))
const projects = computed(() => store.projects)

const statuses = [
  { value: 'active',    label: 'Actif' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

const filtered = computed(() =>
  filterStatus.value
    ? projects.value.filter(p => p.status === filterStatus.value)
    : projects.value
)

function statusClass(s: ProjectStatus) {
  return {
    active:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[s] ?? ''
}

function statusLabel(s: ProjectStatus) {
  return { active: 'Actif', completed: 'Terminé', cancelled: 'Annulé' }[s] ?? s
}

function resetForm() {
  form.value = { code: '', name: '', description: '' }
}

async function submit() {
  if (!form.value.code || !form.value.name) return
  const project = await store.createProject({
    code: form.value.code,
    name: form.value.name,
    description: form.value.description,
  })
  if (project) {
    showForm.value = false
    resetForm()
    router.push(`/workflow/${project.id}`)
  }
}

onMounted(() => store.fetchProjects())
</script>
