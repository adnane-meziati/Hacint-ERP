<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Back -->
    <RouterLink to="/workflow" class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
      ← Projets
    </RouterLink>

    <!-- Loading -->
    <div v-if="store.loading && !project" class="text-center py-16 text-gray-400">Chargement…</div>

    <template v-else-if="project">
      <!-- Project header -->
      <div class="card mb-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{{ project.code }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(project.status)">
                {{ statusLabel(project.status) }}
              </span>
            </div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ project.name }}</h1>
            <p v-if="project.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ project.description }}</p>
          </div>
          <button v-if="canEdit" class="btn-secondary text-sm shrink-0" @click="toggleEdit">
            {{ editing ? 'Annuler' : '✏️ Modifier' }}
          </button>
        </div>

        <!-- Inline edit form -->
        <div v-if="editing" class="mt-4 border-t border-gray-200 dark:border-slate-600 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Nom</label>
            <input v-model="editForm.name" class="input" />
          </div>
          <div>
            <label class="label">Statut</label>
            <select v-model="editForm.status" class="input">
              <option value="active">Actif</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="label">Description</label>
            <textarea v-model="editForm.description" class="input" rows="2" />
          </div>
          <div class="md:col-span-2 flex gap-3">
            <button class="btn-primary" @click="saveEdit">Enregistrer</button>
            <button class="btn-secondary" @click="editing = false">Annuler</button>
          </div>
        </div>
      </div>

      <!-- Orders section -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Ordres de travail <span class="text-gray-400 font-normal text-sm">({{ project.orders?.length ?? 0 }})</span>
        </h2>
        <button v-if="canEdit" class="btn-primary text-sm flex items-center gap-1" @click="showOrderForm = !showOrderForm">
          <span>+</span> {{ t('workflow.newOrder') }}
        </button>
      </div>

      <!-- New order form -->
      <div v-if="showOrderForm" class="card mb-4 border border-blue-200 dark:border-blue-700">
        <h3 class="font-medium mb-3 text-gray-800 dark:text-gray-100">Nouvel ordre de travail</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Numéro d'ordre *</label>
            <input v-model="orderForm.order_number" class="input" placeholder="WO-2026-042" />
          </div>
          <div>
            <label class="label">Date *</label>
            <input v-model="orderForm.order_date" type="date" class="input" />
          </div>
          <div class="md:col-span-2">
            <label class="label">Description</label>
            <textarea v-model="orderForm.description" class="input" rows="2" />
          </div>
        </div>
        <div class="flex gap-3 mt-4">
          <button class="btn-primary" :disabled="!orderForm.order_number || !orderForm.order_date" @click="submitOrder">
            Créer
          </button>
          <button class="btn-secondary" @click="showOrderForm = false">Annuler</button>
        </div>
      </div>

      <!-- Orders list -->
      <div v-if="project.orders?.length" class="space-y-2">
        <div
          v-for="order in project.orders"
          :key="order.id"
          class="card hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
          @click="router.push(`/workflow/orders/${order.id}`)"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200">{{ order.order_number }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="orderStatusClass(order.status)">
                {{ orderStatusLabel(order.status) }}
              </span>
            </div>
            <p v-if="order.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ order.description }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ order.order_date }}</p>
          </div>
          <div class="text-right">
            <span class="text-xl font-bold text-gray-700 dark:text-gray-200">{{ order.apn_count }}</span>
            <p class="text-xs text-gray-400">APNs</p>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-10 text-gray-400">
        <p>Aucun ordre de travail pour ce projet.</p>
      </div>
    </template>

    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWorkflowStore } from '@/stores/workflow'
import { useAuthStore } from '@/stores/auth'
import type { ProjectStatus, WorkflowOrderStatus } from '@/api/workflow'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useWorkflowStore()
const auth = useAuthStore()

const editing = ref(false)
const showOrderForm = ref(false)
const editForm = ref({ name: '', description: '', status: 'active' as ProjectStatus })
const orderForm = ref({ order_number: '', order_date: '', description: '' })

const project = computed(() => store.currentProject)
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
function orderStatusClass(s: WorkflowOrderStatus) {
  return {
    pending:     'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[s] ?? ''
}
function orderStatusLabel(s: WorkflowOrderStatus) {
  return { pending: 'En attente', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé' }[s] ?? s
}

function toggleEdit() {
  if (!project.value) return
  editing.value = !editing.value
  if (editing.value) {
    editForm.value = {
      name: project.value.name,
      description: project.value.description,
      status: project.value.status,
    }
  }
}

async function saveEdit() {
  if (!project.value) return
  await store.patchProject(project.value.id, editForm.value)
  editing.value = false
}

async function submitOrder() {
  if (!project.value || !orderForm.value.order_number || !orderForm.value.order_date) return
  const order = await store.createOrder(project.value.id, orderForm.value)
  if (order) {
    showOrderForm.value = false
    orderForm.value = { order_number: '', order_date: '', description: '' }
    router.push(`/workflow/orders/${order.id}`)
  }
}

onMounted(() => {
  store.fetchProject(route.params.id as string)
})
</script>
