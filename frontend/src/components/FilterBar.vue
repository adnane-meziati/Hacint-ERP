<template>
  <div class="flex flex-wrap gap-3 items-end bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
    <!-- Search -->
    <div v-if="showSearch" class="flex flex-col gap-1 min-w-[200px] flex-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Recherche</label>
      <input
        v-model="local.search"
        type="text"
        placeholder="Réf, N° OP, client…"
        class="input-base"
        @input="emit('change', { ...local })"
      />
    </div>

    <!-- Status -->
    <div v-if="showStatus" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Statut</label>
      <select v-model="local.status" class="select-base" @change="emit('change', { ...local })">
        <option value="">Tous</option>
        <option value="en_cours">En cours</option>
        <option value="livree">Livrée</option>
        <option value="standby">Standby</option>
      </select>
    </div>

    <!-- Priority -->
    <div v-if="showPriority" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Priorité</label>
      <select v-model="local.priority" class="select-base" @change="emit('change', { ...local })">
        <option value="">Toutes</option>
        <option value="urgent">Urgent</option>
        <option value="normal">Normal</option>
        <option value="faible">Faible</option>
      </select>
    </div>

    <!-- Client -->
    <div v-if="showClient" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Client</label>
      <input
        v-model="local.client"
        type="text"
        placeholder="Code client"
        class="input-base w-28"
        @input="emit('change', { ...local })"
      />
    </div>

    <!-- Family -->
    <div v-if="showFamily && families.length" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Famille</label>
      <select v-model="local.family" class="select-base" @change="emit('change', { ...local })">
        <option value="">Toutes</option>
        <option v-for="f in families" :key="f.code" :value="f.code">{{ f.code }}</option>
      </select>
    </div>

    <!-- Date from -->
    <div v-if="showDates" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Du</label>
      <input v-model="local.from_date" type="date" class="input-base" @change="emit('change', { ...local })" />
    </div>

    <!-- Date to -->
    <div v-if="showDates" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Au</label>
      <input v-model="local.to_date" type="date" class="input-base" @change="emit('change', { ...local })" />
    </div>

    <!-- Reset -->
    <button
      class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      @click="reset"
    >
      Réinitialiser
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Family } from '@/api/articles'

interface Filters {
  search?: string
  status?: string
  priority?: string
  client?: string
  family?: string
  from_date?: string
  to_date?: string
}

const props = withDefaults(defineProps<{
  modelValue?: Filters
  families?: Family[]
  showSearch?: boolean
  showStatus?: boolean
  showPriority?: boolean
  showClient?: boolean
  showFamily?: boolean
  showDates?: boolean
}>(), {
  modelValue: () => ({}),
  families: () => [],
  showSearch: true,
  showStatus: true,
  showPriority: true,
  showClient: false,
  showFamily: false,
  showDates: false,
})

const emit = defineEmits<{
  (e: 'change', filters: Filters): void
}>()

const local = reactive<Filters>({ ...props.modelValue })

function reset() {
  Object.keys(local).forEach(k => { (local as any)[k] = '' })
  emit('change', { ...local })
}
</script>

<style scoped>
.input-base {
  @apply px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
.select-base {
  @apply px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
</style>
