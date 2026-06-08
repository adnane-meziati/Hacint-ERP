<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- Back -->
    <RouterLink
      v-if="apn?.work_order"
      :to="`/workflow/orders/${apn.work_order}`"
      class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4"
    >
      ← Ordre de travail
    </RouterLink>

    <div v-if="store.loading && !apn" class="text-center py-16 text-gray-400">Chargement…</div>

    <template v-else-if="apn">
      <!-- APN header card -->
      <div class="card mb-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{{ apn.apn_code }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="priorityClass(apn.priority)">
                {{ priorityLabel(apn.priority) }}
              </span>
              <span v-if="apn.has_sample" class="text-xs text-green-600 dark:text-green-400">✅ Échantillon</span>
            </div>
            <p v-if="apn.specification" class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ apn.specification }}</p>
            <p v-if="apn.assigned_user_username" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              👤 {{ apn.assigned_user_username }}
            </p>
          </div>
        </div>
      </div>

      <!-- Stage pipeline -->
      <div class="card mb-6">
        <h2 class="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Progression</h2>
        <div class="flex items-center overflow-x-auto gap-0">
          <template v-for="(stage, idx) in STAGES" :key="stage.value">
            <div class="flex flex-col items-center min-w-[70px]">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                :class="stageCircleClass(stage.value, apn.current_stage)"
              >
                {{ stageIsDone(stage.value, apn.current_stage) ? '✓' : idx + 1 }}
              </div>
              <span
                class="text-xs mt-1 text-center leading-tight max-w-[64px]"
                :class="stage.value === apn.current_stage ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400'"
              >{{ stage.label }}</span>
            </div>
            <div
              v-if="idx < STAGES.length - 1"
              class="flex-1 h-0.5 min-w-[12px]"
              :class="stageIsDone(STAGES[idx + 1].value, apn.current_stage) || apn.current_stage === STAGES[idx + 1].value
                ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-600'"
            />
          </template>
        </div>
      </div>

      <!-- Advance stage action -->
      <div v-if="apn.current_stage !== 'done'" class="card mb-6">
        <h2 class="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Action</h2>
        <div class="mb-3">
          <label class="label">Commentaire (optionnel)</label>
          <textarea v-model="advanceComment" class="input" rows="2" placeholder="Remarques sur cette étape…" />
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            class="btn-primary flex items-center gap-2 text-base py-3 px-6"
            :disabled="store.loading"
            @click="advance('next')"
          >
            <span>→</span> Étape suivante
            <span class="text-sm opacity-75">({{ nextStageLabel }})</span>
          </button>
        </div>
        <p v-if="store.error" class="text-red-500 text-sm mt-2">{{ store.error }}</p>
      </div>

      <div v-else class="card mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <p class="text-green-700 dark:text-green-400 font-semibold">✅ APN terminé — toutes les étapes sont complètes.</p>
      </div>

      <!-- Stage history -->
      <div class="card mb-6">
        <h2 class="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
          Historique des étapes
        </h2>
        <div v-if="apn.history?.length" class="divide-y divide-gray-100 dark:divide-slate-700">
          <div v-for="h in apn.history" :key="h.id" class="py-2 flex items-center gap-3 text-sm">
            <div class="flex-1">
              <span class="text-gray-500 dark:text-gray-400">
                {{ h.from_stage ? stageLabel(h.from_stage) : 'Début' }}
              </span>
              <span class="mx-2 text-gray-400">→</span>
              <span class="font-medium text-gray-800 dark:text-gray-200">{{ stageLabel(h.to_stage) }}</span>
              <span v-if="h.comment" class="ml-2 text-gray-500 dark:text-gray-400 italic">"{{ h.comment }}"</span>
            </div>
            <div class="text-right text-xs text-gray-400 shrink-0">
              <div>{{ h.transitioned_by_username ?? 'système' }}</div>
              <div>{{ formatDate(h.created_at) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">Aucun historique.</div>
      </div>

      <!-- Attachments -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Pièces jointes
          </h2>
          <button class="btn-secondary text-xs" @click="showAttachForm = !showAttachForm">
            + Ajouter
          </button>
        </div>

        <!-- Upload form -->
        <div v-if="showAttachForm" class="border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="label">Type</label>
              <select v-model="attachForm.type" class="input">
                <option value="pdf">PDF</option>
                <option value="g_code">G-Code</option>
                <option value="excel">Excel</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label class="label">Fichier *</label>
              <input ref="fileInputRef" type="file" class="input py-1.5" @change="onFileChange" />
            </div>
            <div class="md:col-span-2">
              <label class="label">Notes</label>
              <input v-model="attachForm.notes" class="input" placeholder="Optionnel" />
            </div>
          </div>
          <div class="flex gap-3 mt-3">
            <button class="btn-primary text-sm" :disabled="!attachForm.file || store.loading" @click="uploadAttach">
              {{ store.loading ? '…' : 'Téléverser' }}
            </button>
            <button class="btn-secondary text-sm" @click="showAttachForm = false">Annuler</button>
          </div>
        </div>

        <!-- Attachment list -->
        <div v-if="apn.attachments?.length" class="space-y-2">
          <div
            v-for="att in apn.attachments"
            :key="att.id"
            class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-sm"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-lg">{{ attachIcon(att.attachment_type) }}</span>
              <div class="min-w-0">
                <a
                  v-if="att.file_url"
                  :href="att.file_url"
                  target="_blank"
                  class="text-blue-600 hover:underline truncate block"
                >{{ att.original_name }}</a>
                <span v-else class="text-gray-600 dark:text-gray-300 truncate block">{{ att.original_name }}</span>
                <span class="text-xs text-gray-400">{{ formatBytes(att.size_bytes) }} · {{ att.stage_at_upload ? stageLabel(att.stage_at_upload) : '' }}</span>
              </div>
            </div>
            <button
              v-if="canDelete"
              class="ml-2 text-red-500 hover:text-red-700 text-xs shrink-0"
              @click.stop="deleteAttach(att.id)"
            >
              🗑
            </button>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">Aucune pièce jointe.</div>
      </div>
    </template>

    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { useAuthStore } from '@/stores/auth'
import type { ApnPriority, AttachmentType, WorkflowStage } from '@/api/workflow'

const route = useRoute()
const store = useWorkflowStore()
const auth = useAuthStore()

const advanceComment = ref('')
const showAttachForm = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const attachForm = ref({ type: 'pdf' as AttachmentType, file: null as File | null, notes: '' })

const apn = computed(() => store.currentApn)
const canDelete = computed(() => ['admin', 'planner'].includes(auth.user?.role ?? ''))

const STAGES: { value: WorkflowStage; label: string }[] = [
  { value: 'technical_study', label: 'Étude' },
  { value: 'designer',        label: 'Dessin' },
  { value: 'programmer',      label: 'Prog.' },
  { value: 'cnc',             label: 'CNC' },
  { value: 'qc',              label: 'QC' },
  { value: 'production',      label: 'Prod.' },
  { value: 'done',            label: 'Terminé' },
]

const STAGE_ORDER = STAGES.map(s => s.value)

const nextStageLabel = computed(() => {
  if (!apn.value) return ''
  const idx = STAGE_ORDER.indexOf(apn.value.current_stage)
  if (idx === -1 || idx + 1 >= STAGE_ORDER.length) return ''
  return STAGES[idx + 1].label
})

function stageIsDone(stage: WorkflowStage, current: WorkflowStage): boolean {
  const stageIdx = STAGE_ORDER.indexOf(stage)
  const currentIdx = STAGE_ORDER.indexOf(current)
  return stageIdx < currentIdx
}

function stageCircleClass(stage: WorkflowStage, current: WorkflowStage) {
  if (stage === current) return 'bg-blue-600 border-blue-600 text-white'
  if (stageIsDone(stage, current)) return 'bg-green-500 border-green-500 text-white'
  return 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400'
}

const STAGE_LABELS: Record<WorkflowStage, string> = {
  technical_study: 'Étude Technique',
  designer: 'Dessin',
  programmer: 'Programmation',
  cnc: 'CNC',
  qc: 'Contrôle Qualité',
  production: 'Production',
  done: 'Terminé',
}
function stageLabel(s: WorkflowStage | null | undefined) { return s ? (STAGE_LABELS[s] ?? s) : '' }

const PRIORITY_LABELS: Record<ApnPriority, string> = {
  low: 'Faible', normal: 'Normal', high: 'Haute', urgent: 'Urgent',
}
function priorityLabel(p: ApnPriority) { return PRIORITY_LABELS[p] ?? p }
function priorityClass(p: ApnPriority) {
  return {
    low:    'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-700',
    high:   'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }[p] ?? ''
}

function attachIcon(type: AttachmentType) {
  return { pdf: '📄', g_code: '⚙️', excel: '📊', other: '📎' }[type] ?? '📎'
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  attachForm.value.file = input.files?.[0] ?? null
}

async function advance(target: WorkflowStage | 'next') {
  if (!apn.value) return
  await store.advanceStage(apn.value.id, { target_stage: target, comment: advanceComment.value })
  advanceComment.value = ''
}

async function uploadAttach() {
  if (!apn.value || !attachForm.value.file) return
  const ok = await store.uploadAttachment(
    apn.value.id,
    attachForm.value.file,
    attachForm.value.type,
    attachForm.value.notes,
  )
  if (ok) {
    showAttachForm.value = false
    attachForm.value = { type: 'pdf', file: null, notes: '' }
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

async function deleteAttach(id: string) {
  if (!confirm('Supprimer cette pièce jointe ?')) return
  await store.deleteAttachment(id)
}

onMounted(() => {
  store.fetchApn(route.params.id as string)
})
</script>
