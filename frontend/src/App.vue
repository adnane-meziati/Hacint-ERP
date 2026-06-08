<template>
  <RouterView />
  <ToastContainer />
</template>

<script setup lang="ts">
  import { RouterView } from 'vue-router'
  import { useUiStore } from '@/stores/ui'
  import { onMounted } from 'vue'
  import ToastContainer from '@/components/ToastContainer.vue'

  const ui = useUiStore()

  onMounted(() => {
    if (ui.darkMode) {
      document.documentElement.classList.add('dark')
    }
  })
</script>
