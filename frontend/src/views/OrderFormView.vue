<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="router.back()">← Retour</button>
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('orders.new') }}</h1>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <!-- Header fields -->
      <div class="card space-y-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Informations générales</h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label>N° OP</label>
            <input v-model.number="form.n_ordre" type="number" min="1" required class="input" />
          </div>
          <div class="field">
            <label>Client</label>
            <select v-model="form.client" required class="input">
              <option value="" disabled>— Sélectionner un client —</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.code }} — {{ c.name }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>Date de création</label>
            <input v-model="form.creation_date" type="date" required class="input" />
          </div>
          <div class="field">
            <label>Date de livraison</label>
            <input v-model="form.delivery_date" type="date" required class="input" />
          </div>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea v-model="form.notes" rows="2" class="input" />
        </div>
      </div>

      <!-- Lines -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Lignes</h2>
          <button type="button" class="btn-secondary text-sm" @click="addLine">+ Ajouter une ligne</button>
        </div>

        <table class="min-w-full text-sm">
          <thead class="text-xs text-gray-500 dark:text-gray-400 uppercase">
            <tr>
              <th class="px-3 py-2 text-left w-16">N° Série</th>
              <th class="px-3 py-2 text-left">Article</th>
              <th class="px-3 py-2 text-left w-16">Qté</th>
              <th class="px-3 py-2 text-left w-28">Priorité</th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody>
            <OrderLineRow
              v-for="(line, idx) in form.lines"
              :key="idx"
              :idx="idx"
              :model-value="line"
              @update="(i, v) => { form.lines[i] = v }"
              @remove="form.lines.splice($event, 1)"
            />
          </tbody>
        </table>

        <p v-if="form.lines.length === 0" class="text-sm text-gray-400 text-center py-4">
          Aucune ligne. Cliquez sur "Ajouter une ligne".
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary" @click="router.back()">Annuler</button>
        <button
          type="submit"
          class="btn-primary"
          :disabled="store.loading || form.lines.length === 0"
        >
          {{ store.loading ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>

      <div v-if="store.error" class="text-red-500 text-sm">{{ store.error }}</div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOrdersStore } from '@/stores/orders'
import { articlesApi, type Client } from '@/api/articles'
import OrderLineRow, { type LinePayload } from '@/components/OrderLineRow.vue'

const { t } = useI18n()
const router = useRouter()
const store = useOrdersStore()

const clients = ref<Client[]>([])

onMounted(async () => {
  const res = await articlesApi.listClients()
  clients.value = res.results ?? (res as any)
})

const form = reactive({
  n_ordre: null as number | null,
  client: '',
  creation_date: new Date().toISOString().slice(0, 10),
  delivery_date: '',
  notes: '',
  lines: [] as LinePayload[],
})

function addLine() {
  form.lines.push({
    n_serie: form.lines.length + 1,
    article: '',
    quantity: 1,
    priority: 'normal',
    comments: '',
  })
}

async function submit() {
  if (!form.n_ordre || !form.client || !form.delivery_date) return
  const badLine = form.lines.find(l => !l.article)
  if (badLine) {
    store.error = `Ligne ${badLine.n_serie} : article non sélectionné. Tapez la référence et cliquez sur une suggestion.`
    return
  }
  const payload = {
    n_ordre: form.n_ordre,
    client: form.client,
    creation_date: form.creation_date,
    delivery_date: form.delivery_date,
    notes: form.notes,
    lines: form.lines.map(l => ({
      n_serie: l.n_serie,
      article: l.article,
      quantity: l.quantity,
      priority: l.priority,
      comments: l.comments,
    })),
  }
  const order = await store.createOrder(payload)
  if (order) router.push(`/orders/${order.id}`)
}
</script>

<style scoped>
.card   { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5; }
.field  { @apply flex flex-col gap-1; }
.field label { @apply text-xs font-medium text-gray-500 dark:text-gray-400; }
.input  { @apply px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500; }
.btn-primary   { @apply px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors; }
.btn-secondary { @apply px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors; }
</style>
