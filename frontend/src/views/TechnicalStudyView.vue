<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-hi)">Étude Technique — Validation</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-lo)">Créez un projet, déclarez ses échantillons et validez-les contre la matrice de référence.</p>
      </div>
      <button v-if="canEdit" class="btn-primary flex items-center gap-2" @click="showCreateForm = !showCreateForm">
        <span class="text-lg leading-none">+</span> Nouveau projet
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" class="card mb-6 border border-blue-300 dark:border-blue-700">
      <h2 class="font-semibold mb-4" style="color: var(--text-hi)">Nouveau projet</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">Code *</label>
          <input v-model="form.code" class="input" placeholder="PROJ-2026-001" />
        </div>
        <div>
          <label class="label">Nom *</label>
          <input v-model="form.name" class="input" placeholder="Nom du projet" />
        </div>
        <div class="md:col-span-2">
          <label class="label">Description</label>
          <textarea v-model="form.description" class="input" rows="2" />
        </div>
      </div>
      <div class="flex gap-3 mt-4">
        <button
          class="btn-primary"
          :disabled="!form.code || !form.name || store.loading"
          @click="submitCreate"
        >
          Créer
        </button>
        <button class="btn-secondary" @click="cancelCreate">Annuler</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && !store.projects.length" class="text-center py-16" style="color: var(--text-lo)">
      Chargement…
    </div>

    <!-- Projects grid -->
    <div v-else-if="store.projects.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="project in store.projects"
        :key="project.id"
        class="card hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3"
        @click="router.push(`/technical-study/${project.id}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-xs font-bold" style="color: var(--accent)">{{ project.code }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(project.status)">
                {{ statusLabel(project.status) }}
              </span>
            </div>
            <p class="font-semibold mt-1 truncate" style="color: var(--text-hi)">{{ project.name }}</p>
            <p v-if="project.description" class="text-xs mt-0.5 line-clamp-2" style="color: var(--text-lo)">{{ project.description }}</p>
          </div>
          <span
            class="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
            :class="validationBadgeClass(project.validation_status)"
          >
            {{ validationLabel(project.validation_status) }}
          </span>
        </div>

        <div class="flex gap-4 text-xs" style="color: var(--text-lo)">
          <span>{{ project.sample_count }} échantillon{{ project.sample_count !== 1 ? 's' : '' }}</span>
          <span>{{ project.order_count }} ordre{{ project.order_count !== 1 ? 's' : '' }}</span>
        </div>

        <div class="text-xs" style="color: var(--text-lo)">
          Créé {{ formatDate(project.created_at) }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16" style="color: var(--text-lo)">
      <p class="mb-2 text-4xl">📋</p>
      <p>Aucun projet. Créez-en un pour commencer.</p>
    </div>

    <div v-if="store.error" class="mt-4 text-sm text-red-500">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { useAuthStore } from '@/stores/auth'
import type { ProjectStatus, ValidationStatus } from '@/api/workflow'

const router = useRouter()
const store = useWorkflowStore()
const auth = useAuthStore()

const showCreateForm = ref(false)
const form = ref({ code: '', name: '', description: '' })

const canEdit = computed(() => ['admin', 'planner'].includes(auth.user?.role ?? ''))

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

function validationBadgeClass(s: ValidationStatus) {
  return {
    pending:  'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[s] ?? ''
}
function validationLabel(s: ValidationStatus) {
  return { pending: 'En attente', approved: 'Validé ✓', rejected: 'Rejeté ✗' }[s] ?? s
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function cancelCreate() {
  showCreateForm.value = false
  form.value = { code: '', name: '', description: '' }
}

async function submitCreate() {
  const project = await store.createProject(form.value)
  if (project) {
    cancelCreate()
    router.push(`/technical-study/${project.id}`)
  }
}

onMounted(() => store.fetchProjects())
</script>
