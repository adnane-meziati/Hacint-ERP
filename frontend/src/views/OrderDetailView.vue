<template>
  <div class="p-6 space-y-6">
    <!-- Back + title -->
    <div class="flex items-center gap-4">
      <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="router.back()">← Retour</button>
      <h1 v-if="order" class="text-2xl font-bold text-slate-800 dark:text-slate-100">
        OP {{ order.n_ordre }}
        <span class="ml-3 text-sm font-normal text-gray-500">{{ order.client_code }}</span>
      </h1>
      <div v-else class="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div class="ml-auto flex gap-3">
        <a
          v-if="order"
          :href="`/api/orders/${order.id}/pdf`"
          target="_blank"
          class="btn-secondary"
        >PDF</a>
      </div>
    </div>

    <div v-if="store.loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card animate-pulse h-24" />
    </div>

    <template v-else-if="order">
      <!-- Header card -->
      <div class="card grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p class="label">N° OP</p>
          <p class="value">{{ order.n_ordre }}</p>
        </div>
        <div>
          <p class="label">Client</p>
          <p class="value">{{ order.client_code }}</p>
        </div>
        <div>
          <p class="label">Date création</p>
          <p class="value">{{ order.creation_date }}</p>
        </div>
        <div>
          <p class="label">Date livraison</p>
          <p class="value" :class="isLate ? 'text-red-500 font-semibold' : ''">
            {{ order.delivery_date }}
          </p>
        </div>
        <div>
          <p class="label">Statut</p>
          <p class="value font-semibold">{{ order.status }}</p>
        </div>
        <div v-if="order.notes" class="col-span-3">
          <p class="label">Notes</p>
          <p class="value">{{ order.notes }}</p>
        </div>
      </div>

      <!-- Lines -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Lignes ({{ order.lines.length }})
        </h2>
        <div
          v-for="line in order.lines"
          :key="line.id"
          class="border border-gray-100 dark:border-gray-800 rounded-lg p-4 mb-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <span class="font-mono text-blue-700 dark:text-blue-400 font-semibold">
                {{ line.article_ref }}
              </span>
              <span class="ml-2 text-sm text-gray-500">{{ line.article_desc }}</span>
              <span class="ml-3 text-sm text-gray-400">Série {{ line.n_serie }}</span>
            </div>
            <div class="flex items-center gap-3">
              <PriorityBadge :priority="line.priority" />
              <StageBadge :stage="line.current_stage_code ?? ''" />
            </div>
          </div>
          <StageTimeline
            :events="line.events"
            :current-stage-code="line.current_stage_code"
          />
        </div>
      </div>
    </template>

    <div v-if="store.error" class="text-red-500 text-sm">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOrdersStore } from '@/stores/orders'
import StageTimeline from '@/components/StageTimeline.vue'
import PriorityBadge from '@/components/PriorityBadge.vue'
import StageBadge from '@/components/StageBadge.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useOrdersStore()

const order = computed(() => store.currentOrder)
const isLate = computed(() =>
  order.value ? new Date(order.value.delivery_date) < new Date() && order.value.status === 'en_cours' : false
)

onMounted(() => {
  store.fetchOrder(route.params.id as string)
})
</script>

<style scoped>
.card   { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5; }
.label  { @apply text-xs text-gray-400 uppercase tracking-wide; }
.value  { @apply text-gray-900 dark:text-gray-100 font-medium mt-0.5; }
.btn-secondary { @apply px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors; }
</style>
