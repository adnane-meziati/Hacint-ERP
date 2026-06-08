<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="router.back()">← Retour</button>
      <h1 v-if="article" class="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
        {{ article.ref_client }}
      </h1>
      <div v-else class="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>

    <div v-if="store.loading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="card animate-pulse h-24" />
    </div>

    <template v-else-if="article">
      <!-- Article info -->
      <div class="card grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="label">Référence client</p>
          <p class="value font-mono">{{ article.ref_client }}</p>
        </div>
        <div>
          <p class="label">Famille</p>
          <p class="value">
            <span class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">
              {{ article.family_code }}
            </span>
          </p>
        </div>
        <div class="col-span-2">
          <p class="label">Désignation</p>
          <p class="value">{{ article.description }}</p>
        </div>
        <div v-if="article.notes" class="col-span-2">
          <p class="label">Notes</p>
          <p class="value">{{ article.notes }}</p>
        </div>
      </div>

      <!-- Revisions -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Révisions ({{ article.revisions?.length ?? 0 }})
          </h2>
        </div>

        <div v-if="!article.revisions?.length" class="text-sm text-gray-400 py-4 text-center">
          Aucune révision enregistrée.
        </div>

        <div
          v-for="rev in article.revisions"
          :key="rev.id"
          class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 py-3 last:border-0"
        >
          <div>
            <span class="font-semibold font-mono text-blue-700 dark:text-blue-400">{{ rev.revision_no }}</span>
            <span class="ml-3 text-sm text-gray-500">{{ rev.effective_date }}</span>
            <p v-if="rev.notes" class="text-xs text-gray-400 mt-0.5">{{ rev.notes }}</p>
          </div>
          <div class="flex gap-3">
            <a
              v-if="rev.drawing_pdf"
              :href="rev.drawing_pdf"
              target="_blank"
              class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >📄 Dessin</a>
            <a
              v-if="rev.cam_archive"
              :href="rev.cam_archive"
              target="_blank"
              class="text-sm text-green-600 dark:text-green-400 hover:underline"
            >🗜 CAM</a>
          </div>
        </div>
      </div>

      <!-- Upload new revision / drawing -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Joindre un fichier</h2>
        <AttachmentDropzone
          content-type-app="catalog"
          content-type-model="article"
          :object-id="article.id"
          accept=".pdf,.zip,.dxf,.dwg"
          accept-label="PDF, ZIP, DXF, DWG"
          @uploaded="onUploaded"
        />
        <div v-if="attachments.length" class="mt-4 space-y-2">
          <div
            v-for="att in attachments"
            :key="att.id"
            class="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 py-2"
          >
            <a :href="att.url" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
              {{ att.original_name }}
            </a>
            <span class="text-xs text-gray-400">{{ att.kind }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="store.error" class="text-red-500 text-sm">{{ store.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useArticlesStore } from '@/stores/articles'
import AttachmentDropzone from '@/components/AttachmentDropzone.vue'
import apiClient from '@/api/client'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useArticlesStore()

const article = computed(() => store.currentArticle)
const attachments = ref<any[]>([])

async function loadAttachments() {
  if (!article.value) return
  try {
    const res = await apiClient.get('/attachments/', {
      params: { content_type: 'catalog.article', object_id: article.value.id },
    })
    attachments.value = res.data.results ?? res.data
  } catch {
    // silently fail
  }
}

function onUploaded(att: any) {
  attachments.value.unshift(att)
}

onMounted(async () => {
  await store.fetchArticle(route.params.id as string)
  await loadAttachments()
})
</script>

<style scoped>
.card  { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5; }
.label { @apply text-xs text-gray-400 uppercase tracking-wide; }
.value { @apply text-gray-900 dark:text-gray-100 font-medium mt-0.5; }
</style>
