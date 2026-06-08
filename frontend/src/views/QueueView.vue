<template>
  <div class="p-6 space-y-5 max-w-3xl mx-auto">

    <!-- ── BROWSE MODAL ──────────────────────────────────────────────────── -->
    <div
      v-if="showBrowse"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      @click.self="showBrowse = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">
            Choisir un article à ajouter — {{ stageCode }}
          </h2>
          <button class="text-slate-400 hover:text-slate-600 text-xl" @click="showBrowse = false">✕</button>
        </div>

        <!-- Search -->
        <div class="p-4 border-b border-slate-100 dark:border-slate-800">
          <input
            v-model="browseSearch"
            type="text"
            placeholder="Rechercher par N° OP ou référence article…"
            class="input w-full text-sm"
          />
        </div>

        <div class="overflow-y-auto flex-1 p-4 space-y-3">
          <div v-if="browseLoading" class="text-center py-8 text-slate-400">Chargement…</div>
          <div v-else-if="filteredBrowseOrders.length === 0" class="text-center py-8 text-slate-400">Aucun résultat</div>

          <div
            v-for="order in filteredBrowseOrders"
            :key="order.id"
            class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <!-- Order header -->
            <div class="bg-slate-50 dark:bg-slate-800 px-4 py-2 flex items-center gap-3">
              <span class="font-bold font-mono text-blue-700 dark:text-blue-400">OP {{ order.n_ordre }}</span>
              <span class="text-sm text-slate-500">{{ order.client_code }}</span>
              <span class="text-xs text-slate-400 ml-auto">Livraison: {{ order.delivery_date }}</span>
            </div>
            <!-- Lines -->
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div
                v-for="line in order.lines"
                :key="line.id"
                class="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div>
                  <p class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{{ line.article_ref }}</p>
                  <p class="text-xs text-slate-400">{{ line.article_desc }} — Série {{ line.n_serie }}</p>
                </div>
                <button
                  v-if="line.current_stage_code !== stageCode"
                  class="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  :disabled="sendingLine === line.id"
                  @click="sendToMyQueue(line)"
                >
                  {{ sendingLine === line.id ? '…' : '➕ Ajouter à ma file' }}
                </button>
                <span
                  v-else
                  class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                >
                  ✓ Dans la file
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── STEP 1: Order list ───────────────────────────────────────────── -->
    <template v-if="!selectedOrder">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {{ stageName }} — {{ t('planning.queue') }}
          </h1>
          <p class="text-sm text-slate-400 mt-0.5">Sélectionnez un ordre de production</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-400">{{ orders.length }} OP</span>
          <button
            class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            @click="openBrowse"
          >
            ➕ Ajouter un article
          </button>
        </div>
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="card h-20 animate-pulse" />
      </div>

      <div v-else-if="orders.length === 0" class="card text-center py-16 text-slate-400">
        <div class="text-4xl mb-3">✅</div>
        <p class="font-medium">Aucune ligne en attente sur ce poste</p>
      </div>

      <div v-else class="space-y-3">
        <button
          v-for="order in orders"
          :key="order.n_ordre"
          class="card w-full text-left hover:border-blue-400 hover:shadow-md transition-all group"
          @click="selectOrder(order)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-xl font-bold font-mono text-blue-700 dark:text-blue-400 group-hover:text-blue-600">
                OP {{ order.n_ordre }}
              </span>
              <span
                v-if="order.hasUrgent"
                class="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              >
                URGENT
              </span>
            </div>
            <div class="flex items-center gap-4 text-right">
              <div>
                <p class="text-xs text-slate-400">Client</p>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ order.client }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400">Livraison</p>
                <p class="text-sm font-medium" :class="isLate(order.delivery_date) ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-200'">
                  {{ order.delivery_date }}
                </p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-blue-600">{{ order.lines.length }}</p>
                <p class="text-xs text-slate-400">article(s)</p>
              </div>
              <svg class="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </template>

    <!-- ── STEP 2: Articles inside selected order ───────────────────────── -->
    <template v-else-if="!selectedLine">
      <div class="flex items-center gap-3 mb-2">
        <button
          class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 text-sm"
          @click="selectedOrder = null"
        >
          ← Retour
        </button>
        <span class="text-slate-300">|</span>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">
          OP {{ selectedOrder.n_ordre }}
        </h1>
        <span
          v-if="selectedOrder.hasUrgent"
          class="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700"
        >URGENT</span>
      </div>

      <div class="card bg-slate-50 dark:bg-slate-800/50 flex gap-6 py-3">
        <div><span class="text-xs text-slate-400">Client</span><p class="font-medium">{{ selectedOrder.client }}</p></div>
        <div><span class="text-xs text-slate-400">Livraison</span>
          <p class="font-medium" :class="isLate(selectedOrder.delivery_date) ? 'text-red-500 font-bold' : ''">
            {{ selectedOrder.delivery_date }}
          </p>
        </div>
        <div><span class="text-xs text-slate-400">Poste</span><p class="font-medium font-mono text-blue-600">{{ stageCode }}</p></div>
      </div>

      <p class="text-sm text-slate-400">Sélectionnez un article à traiter</p>

      <div class="space-y-3">
        <button
          v-for="line in selectedOrder.lines"
          :key="line.id"
          class="card w-full text-left transition-all group"
          :class="line.stage_event_status === 'done'
            ? 'opacity-60 border-green-200 dark:border-green-900'
            : 'hover:border-blue-400 hover:shadow-md'"
          @click="line.stage_event_status !== 'done' && selectLine(line)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <!-- Status icon -->
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
                :class="statusIconClass(line.stage_event_status)"
              >
                {{ statusIcon(line.stage_event_status) }}
              </div>
              <div class="min-w-0">
                <p class="font-mono font-bold text-blue-700 dark:text-blue-400 truncate">
                  {{ line.article_ref }}
                </p>
                <p class="text-sm text-slate-500 truncate">{{ line.article_desc }}</p>
                <p class="text-xs text-slate-400 mt-0.5">N° Série: {{ line.n_serie }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0 ml-3">
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full"
                :class="priorityClass(line.priority)"
              >{{ line.priority.toUpperCase() }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded"
                :class="eventStatusClass(line.stage_event_status)"
              >{{ statusLabel(line.stage_event_status) }}</span>
              <svg
                v-if="line.stage_event_status !== 'done'"
                class="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </template>

    <!-- ── STEP 3: Work on selected article ────────────────────────────── -->
    <template v-else>
      <div class="flex items-center gap-3 mb-2">
        <button
          class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 text-sm"
          @click="selectedLine = null"
        >
          ← Retour
        </button>
        <span class="text-slate-300">|</span>
        <span class="text-sm text-slate-500">OP {{ selectedOrder.n_ordre }}</span>
      </div>

      <!-- Article detail card -->
      <div class="card space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl shrink-0">
            🔩
          </div>
          <div>
            <h2 class="text-xl font-bold font-mono text-blue-700 dark:text-blue-400">
              {{ selectedLine.article_ref }}
            </h2>
            <p class="text-slate-600 dark:text-slate-400">{{ selectedLine.article_desc }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p class="text-xs text-slate-400 mb-1">OP</p>
            <p class="font-bold font-mono">{{ selectedOrder.n_ordre }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p class="text-xs text-slate-400 mb-1">N° Série</p>
            <p class="font-bold">{{ selectedLine.n_serie }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p class="text-xs text-slate-400 mb-1">Poste actuel</p>
            <p class="font-bold font-mono text-blue-600">{{ stageCode }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p class="text-xs text-slate-400 mb-1">Priorité</p>
            <span
              class="text-xs font-bold px-2 py-0.5 rounded-full"
              :class="priorityClass(selectedLine.priority)"
            >{{ selectedLine.priority.toUpperCase() }}</span>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p class="text-xs text-slate-400 mb-1">Livraison</p>
            <p class="font-bold text-sm" :class="isLate(selectedOrder.delivery_date) ? 'text-red-500' : ''">
              {{ selectedOrder.delivery_date }}
            </p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p class="text-xs text-slate-400 mb-1">Statut</p>
            <span
              class="text-xs px-2 py-0.5 rounded"
              :class="eventStatusClass(selectedLine.stage_event_status)"
            >{{ statusLabel(selectedLine.stage_event_status) }}</span>
          </div>
        </div>
      </div>

      <!-- Start button (if pending/blocked) -->
      <button
        v-if="selectedLine.stage_event_status === 'pending' || selectedLine.stage_event_status === 'blocked'"
        class="w-full py-4 rounded-xl bg-blue-500 text-white text-lg font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-3"
        :disabled="!!submitting"
        @click="doStart"
      >
        <span class="text-2xl">▶</span>
        Démarrer le travail
      </button>

      <!-- Comment field -->
      <div class="field">
        <label class="text-xs font-medium text-slate-500">Commentaire (optionnel)</label>
        <textarea
          v-model="actionComment"
          rows="2"
          class="input w-full text-sm"
          placeholder="Ajouter un commentaire sur le travail effectué…"
        />
      </div>

      <!-- Main action buttons -->
      <div class="grid grid-cols-2 gap-4" v-if="selectedLine.stage_event_status !== 'done'">
        <button
          class="py-5 rounded-xl bg-green-600 text-white text-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex flex-col items-center gap-1"
          :disabled="!!submitting"
          @click="doComplete"
        >
          <span class="text-3xl">✓</span>
          <span>Terminé</span>
          <span class="text-xs font-normal opacity-80">Passer au poste suivant</span>
        </button>
        <button
          class="py-5 rounded-xl bg-red-500 text-white text-xl font-bold hover:bg-red-600 disabled:opacity-50 transition-colors flex flex-col items-center gap-1"
          :disabled="!!submitting"
          @click="doBlock"
        >
          <span class="text-3xl">⚠</span>
          <span>Bloquer</span>
          <span class="text-xs font-normal opacity-80">Signaler un problème</span>
        </button>
      </div>

      <div v-if="selectedLine.stage_event_status === 'done'" class="card text-center py-8 border-green-300 dark:border-green-700">
        <div class="text-5xl mb-2">✅</div>
        <p class="font-bold text-green-600 dark:text-green-400 text-lg">Travail terminé</p>
        <p class="text-sm text-slate-400 mt-1">Cet article est passé au poste suivant</p>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { stagesApi, ordersApi, type QueueLine } from '@/api/orders'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const stageCode = (route.params.code as string).toUpperCase()

const STAGE_NAMES: Record<string, string> = {
  ECH: 'Échantillon', CAD: 'Dessin (CAD)', CAM: 'CAM',
  CNC: 'CNC', MTG: 'Montage', QF: 'Qualité finale', AQC: 'Contrôle APTIV',
}
const stageName = computed(() => STAGE_NAMES[stageCode] ?? stageCode)

// ── State ─────────────────────────────────────────────────────────────────────
interface OrderGroup {
  n_ordre: number
  client: string
  delivery_date: string
  hasUrgent: boolean
  lines: QueueLine[]
}

const allLines    = ref<QueueLine[]>([])
const loading     = ref(true)
const error       = ref('')
const submitting  = ref<string | null>(null)
const actionComment = ref('')

const selectedOrder = ref<OrderGroup | null>(null)
const selectedLine  = ref<QueueLine | null>(null)

// ── Browse modal ──────────────────────────────────────────────────────────────
const showBrowse       = ref(false)
const browseSearch     = ref('')
const browseOrders     = ref<any[]>([])
const browseLoading    = ref(false)
const sendingLine      = ref<string | null>(null)

const filteredBrowseOrders = computed(() => {
  const q = browseSearch.value.toLowerCase()
  if (!q) return browseOrders.value
  return browseOrders.value.filter(o =>
    String(o.n_ordre).includes(q) ||
    o.lines?.some((l: any) => l.article_ref?.toLowerCase().includes(q) || l.article_desc?.toLowerCase().includes(q))
  )
})

async function openBrowse() {
  showBrowse.value = true
  browseSearch.value = ''
  browseLoading.value = true
  try {
    const res = await ordersApi.list({ page_size: 100, status: 'en_cours' })
    // Fetch detail for each order to get lines
    const details = await Promise.all(
      res.results.map((o: any) => ordersApi.get(o.id))
    )
    // Keep only lines that are NOT yet done at this stage and not delivered
    browseOrders.value = details
      .map((order: any) => ({
        ...order,
        lines: (order.lines ?? []).filter((line: any) => {
          // Skip fully delivered lines
          if (line.status === 'livree') return false
          // Skip if stage event for this stage is already done
          const ev = line.events?.find((e: any) => e.stage_code === stageCode)
          if (ev?.status === 'done') return false
          return true
        }),
      }))
      .filter((order: any) => order.lines.length > 0)
  } finally {
    browseLoading.value = false
  }
}

async function sendToMyQueue(line: any) {
  sendingLine.value = line.id
  try {
    await ordersApi.sendToStage(line.id, stageCode)
    ui.addToast('success', `Article "${line.article_ref}" ajouté à la file ${stageCode}`)
    await load()
    showBrowse.value = false
  } catch (e: any) {
    ui.addToast('error', e?.response?.data?.detail ?? 'Erreur')
  } finally {
    sendingLine.value = null
  }
}

// ── Group lines by order ──────────────────────────────────────────────────────
const orders = computed<OrderGroup[]>(() => {
  const map = new Map<number, OrderGroup>()
  for (const line of allLines.value) {
    if (!map.has(line.order_n_ordre)) {
      map.set(line.order_n_ordre, {
        n_ordre: line.order_n_ordre,
        client: line.client_code,
        delivery_date: line.delivery_date ?? '',
        hasUrgent: false,
        lines: [],
      })
    }
    const g = map.get(line.order_n_ordre)!
    g.lines.push(line)
    if (line.priority === 'urgent') g.hasUrgent = true
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.hasUrgent !== b.hasUrgent) return a.hasUrgent ? -1 : 1
    return a.delivery_date.localeCompare(b.delivery_date)
  })
})

// ── Navigation ────────────────────────────────────────────────────────────────
function selectOrder(order: OrderGroup) {
  selectedOrder.value = order
  selectedLine.value = null
  actionComment.value = ''
}

function selectLine(line: QueueLine) {
  selectedLine.value = { ...line }
  actionComment.value = ''
  error.value = ''
}

// ── Load data ─────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = ''
  try {
    allLines.value = await stagesApi.queue(stageCode)
    // Refresh selected order/line if still navigated in
    if (selectedOrder.value) {
      const refreshed = orders.value.find(o => o.n_ordre === selectedOrder.value!.n_ordre)
      selectedOrder.value = refreshed ?? null
    }
    if (selectedLine.value) {
      const refreshed = allLines.value.find(l => l.id === selectedLine.value!.id)
      selectedLine.value = refreshed ? { ...refreshed } : null
    }
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? t('common.error')
  } finally {
    loading.value = false
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function doStart() {
  if (!selectedLine.value) return
  submitting.value = selectedLine.value.id
  try {
    await stagesApi.start(selectedLine.value.id, stageCode)
    await load()
    ui.addToast('success', 'Travail démarré')
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? t('common.error')
  } finally {
    submitting.value = null
  }
}

async function doComplete() {
  if (!selectedLine.value) return
  submitting.value = selectedLine.value.id
  try {
    await stagesApi.complete(selectedLine.value.id, stageCode, actionComment.value)
    ui.addToast('success', `Article passé au poste suivant ✅`)
    await load()
    // Return to order list after marking done
    selectedLine.value = null
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? t('common.error')
  } finally {
    submitting.value = null
  }
}

async function doBlock() {
  if (!selectedLine.value) return
  submitting.value = selectedLine.value.id
  try {
    await stagesApi.block(selectedLine.value.id, stageCode, actionComment.value)
    ui.addToast('error', 'Article bloqué — planificateurs notifiés ⚠')
    await load()
    selectedLine.value = null
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? t('common.error')
  } finally {
    submitting.value = null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isLate(dateStr: string): boolean {
  return dateStr ? new Date(dateStr) < new Date() : false
}

function statusIcon(s: string): string {
  if (s === 'done')        return '✅'
  if (s === 'in_progress') return '⚡'
  if (s === 'blocked')     return '⚠️'
  return '⏳'
}

function statusIconClass(s: string): string {
  if (s === 'done')        return 'bg-green-50 dark:bg-green-900/20'
  if (s === 'in_progress') return 'bg-blue-50 dark:bg-blue-900/20'
  if (s === 'blocked')     return 'bg-red-50 dark:bg-red-900/20'
  return 'bg-slate-50 dark:bg-slate-800'
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: 'En attente', in_progress: 'En cours', done: 'Terminé', blocked: 'Bloqué',
  }
  return map[s] ?? s
}

function priorityClass(p: string): string {
  if (p === 'urgent') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  if (p === 'normal') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

function eventStatusClass(s: string): string {
  if (s === 'done')        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  if (s === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  if (s === 'blocked')     return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-slate-100 text-slate-500'
}

onMounted(load)
</script>

<style scoped>
.card   { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4; }
.input  { @apply px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500; }
.field  { @apply flex flex-col gap-1; }
.field label { @apply text-xs font-medium text-slate-500; }
</style>
