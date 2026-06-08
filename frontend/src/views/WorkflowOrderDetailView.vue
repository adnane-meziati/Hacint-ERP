<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Back -->
    <RouterLink
      v-if="order?.project"
      :to="`/workflow/${order.project}`"
      class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4"
    >
      ← Projet
    </RouterLink>

    <div v-if="store.loading && !order" class="text-center py-16 text-gray-400">Chargement…</div>

    <template v-else-if="order">
      <!-- Order header -->
      <div class="card mb-6">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200">{{ order.order_number }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="orderStatusClass(order.status)">
                {{ orderStatusLabel(order.status) }}
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Date : {{ order.order_date }}</p>
            <p v-if="order.description" class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ order.description }}</p>
          </div>
        </div>
      </div>

      <!-- APNs section -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
          APNs <span class="text-gray-400 font-normal text-sm">({{ order.apns?.length ?? 0 }})</span>
        </h2>
        <button v-if="canCreate" class="btn-primary text-sm flex items-center gap-1" @click="showApnForm = !showApnForm">
          <span>+</span> {{ t('workflow.addApn') }}
        </button>
      </div>

      <!-- New APN form -->
      <div v-if="showApnForm" class="card mb-4 border border-blue-200 dark:border-blue-700">
        <h3 class="font-medium mb-3 text-gray-800 dark:text-gray-100">Ajouter un APN</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Code APN *</label>
            <input v-model="apnForm.apn_code" class="input" placeholder="1234567890" />
          </div>
          <div>
            <label class="label">Priorité</label>
            <select v-model="apnForm.priority" class="input">
              <option value="low">Faible</option>
              <option value="normal">Normal</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="label">Spécification</label>
            <textarea v-model="apnForm.specification" class="input" rows="2" />
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="apnForm.has_sample" type="checkbox" class="rounded" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Échantillon disponible</span>
            </label>
          </div>
        </div>
        <div class="flex gap-3 mt-4">
          <button class="btn-primary" :disabled="!apnForm.apn_code || store.loading" @click="submitApn">Créer</button>
          <button class="btn-secondary" @click="showApnForm = false">Annuler</button>
        </div>
        <p v-if="store.error" class="text-red-500 text-sm mt-2">{{ store.error }}</p>
      </div>

      <!-- APN table -->
      <div v-if="order.apns?.length" class="card overflow-hidden p-0">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Code APN</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Priorité</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Étape actuelle</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Assigné à</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Éch.</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
            <tr
              v-for="apn in order.apns"
              :key="apn.id"
              class="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              @click="router.push(`/workflow/apns/${apn.id}`)"
            >
              <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{{ apn.apn_code }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="priorityClass(apn.priority)">
                  {{ priorityLabel(apn.priority) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="stageClass(apn.current_stage)">
                  {{ stageLabel(apn.current_stage) }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ apn.assigned_user_username ?? '—' }}</td>
              <td class="px-4 py-3">{{ apn.has_sample ? '✅' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center py-10 text-gray-400">Aucun APN pour cet ordre.</div>
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
import type { ApnPriority, WorkflowOrderStatus, WorkflowStage } from '@/api/workflow'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useWorkflowStore()
const auth = useAuthStore()

const showApnForm = ref(false)
const apnForm = ref({
  apn_code: '',
  specification: '',
  priority: 'normal' as ApnPriority,
  has_sample: false,
})

const order = computed(() => store.currentOrder)
const canCreate = computed(() => ['admin', 'planner'].includes(auth.user?.role ?? ''))

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

const STAGE_LABELS: Record<WorkflowStage, string> = {
  technical_study: 'Étude Tech.',
  designer: 'Dessin',
  programmer: 'Programmation',
  cnc: 'CNC',
  qc: 'Contrôle Qualité',
  production: 'Production',
  done: 'Terminé',
}
function stageLabel(s: WorkflowStage) { return STAGE_LABELS[s] ?? s }
function stageClass(s: WorkflowStage) {
  if (s === 'done') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

const PRIORITY_LABELS: Record<ApnPriority, string> = {
  low: 'Faible', normal: 'Normal', high: 'Haute', urgent: 'Urgent',
}
function priorityLabel(p: ApnPriority) { return PRIORITY_LABELS[p] ?? p }
function priorityClass(p: ApnPriority) {
  return {
    low:    'bg-gray-100 text-gray-600 dark:bg-slate-600 dark:text-gray-300',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[p] ?? ''
}

async function submitApn() {
  if (!order.value || !apnForm.value.apn_code) return
  const apn = await store.createApn(order.value.id, apnForm.value)
  if (apn) {
    showApnForm.value = false
    apnForm.value = { apn_code: '', specification: '', priority: 'normal', has_sample: false }
    router.push(`/workflow/apns/${apn.id}`)
  }
}

onMounted(() => {
  store.fetchOrder(route.params.id as string)
})
</script>
