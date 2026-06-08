<template>
  <tr class="border-b border-gray-100 dark:border-gray-800">
    <td class="py-2 px-3 w-16">
      <input
        v-model.number="local.n_serie"
        type="number"
        min="1"
        class="input-sm w-full"
        placeholder="N°"
        @change="emit('update', idx, local)"
      />
    </td>
    <td class="py-2 px-3 flex-1">
      <div class="relative">
        <input
          v-model="searchRef"
          type="text"
          :class="['input-sm w-full', !local.article && searchRef ? 'border-red-400' : '']"
          placeholder="Tapez une réf et sélectionnez…"
          autocomplete="off"
          @input="onSearch"
          @focus="showSuggestions = true"
          @blur="onBlur"
        />
        <ul
          v-if="showSuggestions && suggestions.length"
          class="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto"
        >
          <li
            v-for="art in suggestions"
            :key="art.id"
            class="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700"
            @mousedown.prevent="selectArticle(art)"
          >
            <span class="font-mono text-blue-700 dark:text-blue-400">{{ art.ref_client }}</span>
            <span class="text-gray-500 ml-2 text-xs">{{ art.description }}</span>
          </li>
        </ul>
      </div>
    </td>
    <td class="py-2 px-3 w-16">
      <input
        v-model.number="local.quantity"
        type="number"
        min="1"
        class="input-sm w-full"
        @change="emit('update', idx, local)"
      />
    </td>
    <td class="py-2 px-3 w-28">
      <select v-model="local.priority" class="input-sm w-full" @change="emit('update', idx, local)">
        <option value="urgent">Urgent</option>
        <option value="normal">Normal</option>
        <option value="faible">Faible</option>
      </select>
    </td>
    <td class="py-2 px-3 w-10 text-center">
      <button
        class="text-red-500 hover:text-red-700 text-lg leading-none"
        @click="emit('remove', idx)"
      >×</button>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { articlesApi, type Article } from '@/api/articles'

export interface LinePayload {
  n_serie: number
  article: string
  quantity: number
  priority: string
  comments: string
  _article_ref?: string
}

const props = defineProps<{
  idx: number
  modelValue: LinePayload
}>()

const emit = defineEmits<{
  (e: 'update', idx: number, val: LinePayload): void
  (e: 'remove', idx: number): void
}>()

const local = reactive<LinePayload>({ ...props.modelValue })
const searchRef = ref(local._article_ref ?? '')
const suggestions = ref<Article[]>([])
const showSuggestions = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.modelValue, v => Object.assign(local, v))

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (searchRef.value.length < 2) { suggestions.value = []; return }
  searchTimer = setTimeout(async () => {
    const res = await articlesApi.list({ search: searchRef.value, page_size: 10 })
    suggestions.value = res.results
    showSuggestions.value = true
  }, 250)
}

function selectArticle(art: Article) {
  local.article = art.id
  local._article_ref = art.ref_client
  searchRef.value = `${art.ref_client} — ${art.description}`
  showSuggestions.value = false
  suggestions.value = []
  emit('update', props.idx, { ...local })
}

async function onBlur() {
  showSuggestions.value = false
  // If user typed something but never clicked a suggestion, try exact-match lookup
  if (searchRef.value && !local.article) {
    const res = await articlesApi.list({ search: searchRef.value, page_size: 5 })
    const exact = res.results.find(a =>
      a.ref_client.toLowerCase() === searchRef.value.toLowerCase()
    )
    if (exact) selectArticle(exact)
    else if (res.results.length === 1) selectArticle(res.results[0])
  }
}
</script>

<style scoped>
.input-sm {
  @apply px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500;
}
</style>
