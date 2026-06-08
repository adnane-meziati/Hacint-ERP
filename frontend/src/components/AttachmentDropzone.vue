<template>
  <div>
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
      :class="isDragging
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Glissez un fichier ici ou
        <label class="text-blue-600 dark:text-blue-400 cursor-pointer underline">
          parcourir
          <input type="file" class="hidden" :accept="accept" @change="onFileInput" />
        </label>
      </p>
      <p class="text-xs text-gray-400 mt-1">{{ acceptLabel }}</p>
    </div>

    <div v-if="pending" class="mt-3 flex items-center gap-3 text-sm">
      <span class="text-gray-700 dark:text-gray-300 truncate max-w-xs">{{ pending.name }}</span>
      <select v-model="kind" class="select-sm">
        <option value="drawing">Dessin (PDF)</option>
        <option value="cam">CAM</option>
        <option value="photo">Photo</option>
        <option value="report">Rapport</option>
        <option value="other">Autre</option>
      </select>
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        :disabled="uploading"
        @click="upload"
      >
        {{ uploading ? 'Envoi…' : 'Joindre' }}
      </button>
      <button class="text-gray-400 hover:text-red-500 text-lg" @click="pending = null">×</button>
    </div>

    <div v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import apiClient from '@/api/client'

const props = defineProps<{
  contentTypeApp: string
  contentTypeModel: string
  objectId: string
  accept?: string
  acceptLabel?: string
}>()

const emit = defineEmits<{
  (e: 'uploaded', attachment: any): void
}>()

const isDragging = ref(false)
const pending = ref<File | null>(null)
const kind = ref('drawing')
const uploading = ref(false)
const error = ref('')

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) pending.value = file
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) pending.value = file
}

async function upload() {
  if (!pending.value) return
  uploading.value = true
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('file', pending.value)
    fd.append('kind', kind.value)
    fd.append('content_type_app', props.contentTypeApp)
    fd.append('content_type_model', props.contentTypeModel)
    fd.append('object_id', props.objectId)
    const res = await apiClient.post('/attachments/upload/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    emit('uploaded', res.data)
    pending.value = null
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? 'Échec du téléversement'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.select-sm {
  @apply px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100;
}
</style>
