<template>
  <div class="p-6 max-w-5xl mx-auto">

    <RouterLink to="/technical-study" class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
      ← Étude Technique
    </RouterLink>

    <div v-if="store.loading && !project" class="text-center py-16" style="color: var(--text-lo)">Chargement…</div>

    <template v-else-if="project">

      <!-- ── Project header ─────────────────────────────────────────────── -->
      <div class="card mb-6">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-mono text-sm font-bold" style="color: var(--accent)">{{ project.code }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(project.status)">
                {{ statusLabel(project.status) }}
              </span>
              <!-- Validation badge -->
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold" :class="validationBadgeClass(project.validation_status)">
                {{ validationLabel(project.validation_status) }}
              </span>
              <!-- Approved badge -->
              <span v-if="project.validation?.approved_at" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                ✓ Approuvé par {{ project.validation.approved_by_username }}
              </span>
            </div>
            <h1 class="text-xl font-bold" style="color: var(--text-hi)">{{ project.name }}</h1>
            <p v-if="project.description" class="text-sm mt-1" style="color: var(--text-lo)">{{ project.description }}</p>
          </div>

          <div class="flex gap-2 shrink-0 flex-wrap">
            <!-- Lancer la vérification -->
            <button
              v-if="canEdit"
              class="btn-secondary flex items-center gap-2"
              :disabled="store.loading"
              @click="runValidation"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Lancer la vérification
            </button>
            <!-- Approuver le projet -->
            <button
              v-if="canEdit && project.validation_status === 'approved' && !project.validation?.approved_at"
              class="btn-primary flex items-center gap-2"
              :disabled="store.loading"
              @click="approve"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Approuver le projet
            </button>
          </div>
        </div>
      </div>

      <!-- ── Two-column layout ──────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- LEFT: Échantillons du projet -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-base" style="color: var(--text-hi)">
              Échantillons du projet
              <span class="font-normal text-sm ml-1" style="color: var(--text-lo)">({{ project.samples?.length ?? 0 }})</span>
            </h2>
            <button v-if="canEdit" class="btn-primary text-xs px-2 py-1" @click="showSampleForm = !showSampleForm">+ Ajouter</button>
          </div>

          <!-- Add sample form -->
          <div v-if="showSampleForm" class="card mb-3 border border-blue-200 dark:border-blue-700">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="col-span-2">
                <label class="label">Référence *</label>
                <input v-model="sampleForm.reference" class="input" placeholder="REF-001" />
              </div>
              <div class="col-span-2">
                <label class="label">Désignation</label>
                <input v-model="sampleForm.designation" class="input" />
              </div>
              <div>
                <label class="label">Quantité</label>
                <input v-model.number="sampleForm.quantity" type="number" min="1" class="input" />
              </div>
              <div>
                <label class="label">Type</label>
                <input v-model="sampleForm.sample_type" class="input" placeholder="ex: connecteur" />
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn-primary text-xs" :disabled="!sampleForm.reference" @click="submitSample">Ajouter</button>
              <button class="btn-secondary text-xs" @click="showSampleForm = false">Annuler</button>
            </div>
          </div>

          <!-- Sample list -->
          <div class="space-y-2">
            <div
              v-for="s in project.samples"
              :key="s.id"
              class="card flex items-center justify-between gap-3 py-2 px-3"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-xs font-semibold" style="color: var(--text-hi)">{{ s.reference }}</span>
                  <span v-if="s.sample_type" class="text-xs px-1.5 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-lo)">{{ s.sample_type }}</span>
                </div>
                <p v-if="s.designation" class="text-xs mt-0.5" style="color: var(--text-lo)">{{ s.designation }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <span class="text-sm font-semibold" style="color: var(--text-hi)">x{{ s.quantity }}</span>
                <button v-if="canEdit" class="text-red-400 hover:text-red-600 text-xs" @click.stop="removeSample(s.id)">✕</button>
              </div>
            </div>
            <p v-if="!project.samples?.length" class="text-sm text-center py-4" style="color: var(--text-lo)">Aucun échantillon ajouté.</p>
          </div>
        </div>

        <!-- RIGHT: Résultats de validation -->
        <div>
          <h2 class="font-semibold text-base mb-3" style="color: var(--text-hi)">
            Résultats de validation
          </h2>

          <!-- No validation yet -->
          <div v-if="!lastResult && !project.validation" class="card text-center py-8" style="color: var(--text-lo)">
            <p class="text-3xl mb-2">🔍</p>
            <p class="text-sm">Lancez la vérification pour comparer les échantillons à la matrice.</p>
          </div>

          <!-- Validation result panel -->
          <template v-else>
            <!-- Summary bar -->
            <div class="card mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div class="text-xl font-bold text-emerald-600">{{ summary.matched }}</div>
                <div class="text-xs" style="color: var(--text-lo)">Conformes</div>
              </div>
              <div>
                <div class="text-xl font-bold text-red-500">{{ summary.missing }}</div>
                <div class="text-xs" style="color: var(--text-lo)">Manquants</div>
              </div>
              <div>
                <div class="text-xl font-bold text-amber-500">{{ summary.mismatched }}</div>
                <div class="text-xs" style="color: var(--text-lo)">Écarts</div>
              </div>
              <div>
                <div class="text-xl font-bold text-purple-500">{{ summary.extra }}</div>
                <div class="text-xs" style="color: var(--text-lo)">Hors-matrice</div>
              </div>
            </div>

            <!-- Validated by / at -->
            <div v-if="project.validation" class="text-xs mb-3" style="color: var(--text-lo)">
              Dernière vérification par <strong>{{ project.validation.validated_by_username }}</strong>
              le {{ formatDate(project.validation.validated_at!) }}
            </div>

            <!-- Comparison table -->
            <div class="card overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border)">
                    <th class="text-left py-2 pr-3 font-semibold" style="color: var(--text-lo)">Référence</th>
                    <th class="text-center py-2 px-2 font-semibold" style="color: var(--text-lo)">Qté matrice</th>
                    <th class="text-center py-2 px-2 font-semibold" style="color: var(--text-lo)">Qté projet</th>
                    <th class="text-center py-2 px-2 font-semibold" style="color: var(--text-lo)">Type matrice</th>
                    <th class="text-center py-2 pl-2 font-semibold" style="color: var(--text-lo)">Type projet</th>
                    <th class="text-center py-2 font-semibold" style="color: var(--text-lo)">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in allRows"
                    :key="i"
                    class="border-b last:border-0"
                    style="border-color: var(--border)"
                    :class="rowBg(row.status)"
                  >
                    <td class="py-1.5 pr-3 font-mono font-semibold" style="color: var(--text-hi)">
                      {{ row.reference }}
                      <span v-if="row.designation" class="block font-sans font-normal text-[10px]" style="color: var(--text-lo)">{{ row.designation }}</span>
                    </td>
                    <td class="text-center py-1.5 px-2">{{ row.matrix_quantity ?? '—' }}</td>
                    <td class="text-center py-1.5 px-2">{{ row.project_quantity ?? '—' }}</td>
                    <td class="text-center py-1.5 px-2">{{ row.matrix_type || '—' }}</td>
                    <td class="text-center py-1.5 pl-2">{{ row.project_type || '—' }}</td>
                    <td class="text-center py-1.5">
                      <span :class="statusIcon(row.status)">{{ statusSymbol(row.status) }}</span>
                    </td>
                  </tr>
                  <tr v-if="!allRows.length">
                    <td colspan="6" class="text-center py-4" style="color: var(--text-lo)">Aucune donnée</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
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
import type { ProjectStatus, ValidationStatus, ValidationResultItem } from '@/api/workflow'

const route = useRoute()
const store = useWorkflowStore()
const auth = useAuthStore()

const showSampleForm = ref(false)
const sampleForm = ref({ reference: '', designation: '', quantity: 1, sample_type: '' })

const project = computed(() => store.currentProject)
const canEdit = computed(() => ['admin', 'planner'].includes(auth.user?.role ?? ''))
const lastResult = computed(() => store.validationResult)

const summary = computed(() => {
  const r = lastResult.value ?? project.value?.validation?.result
  if (!r) return { matched: 0, missing: 0, mismatched: 0, extra: 0 }
  const s = 'summary' in r ? (r as any).summary : r
  return s ?? { matched: 0, missing: 0, mismatched: 0, extra: 0 }
})

const allRows = computed((): ValidationResultItem[] => {
  const r = lastResult.value ?? project.value?.validation?.result
  if (!r) return []
  const { matched = [], missing = [], mismatched = [], extra = [] } = r as any
  return [...matched, ...missing, ...mismatched, ...extra]
    .sort((a: ValidationResultItem, b: ValidationResultItem) => a.reference.localeCompare(b.reference))
})

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
function rowBg(s: ValidationResultItem['status']) {
  return {
    matched:    '',
    missing:    'bg-red-50 dark:bg-red-900/10',
    mismatched: 'bg-amber-50 dark:bg-amber-900/10',
    extra:      'bg-purple-50 dark:bg-purple-900/10',
  }[s] ?? ''
}
function statusIcon(s: ValidationResultItem['status']) {
  return {
    matched:    'text-emerald-600 font-bold',
    missing:    'text-red-600 font-bold',
    mismatched: 'text-amber-600 font-bold',
    extra:      'text-purple-600 font-bold',
  }[s] ?? ''
}
function statusSymbol(s: ValidationResultItem['status']) {
  return { matched: '✓', missing: '✗', mismatched: '⚠', extra: '+' }[s] ?? s
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function submitSample() {
  if (!project.value || !sampleForm.value.reference) return
  const ok = await store.createProjectSample(project.value.id, { ...sampleForm.value })
  if (ok) {
    showSampleForm.value = false
    sampleForm.value = { reference: '', designation: '', quantity: 1, sample_type: '' }
    // Reset previous result so user knows they need to re-validate
    store.validationResult = null
  }
}

async function removeSample(id: string) {
  await store.deleteProjectSample(id)
  store.validationResult = null
}

async function runValidation() {
  if (!project.value) return
  await store.validateProject(project.value.id)
}

async function approve() {
  if (!project.value) return
  await store.approveProject(project.value.id)
}

onMounted(() => {
  store.validationResult = null
  store.fetchProject(route.params.id as string)
})
</script>
