import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export const useUiStore = defineStore(
  'ui',
  () => {
    const darkMode = ref(true)
    const sidebarOpen = ref(true)
    const lang = ref<'fr' | 'en'>('fr')
    const toasts = ref<Toast[]>([])

    function toggleDark(): void {
      darkMode.value = !darkMode.value
      document.documentElement.classList.toggle('dark', darkMode.value)
    }

    function toggleSidebar(): void {
      sidebarOpen.value = !sidebarOpen.value
    }

    function setLang(l: 'fr' | 'en'): void {
      lang.value = l
      localStorage.setItem('lang', l)
    }

    function addToast(type: Toast['type'], message: string, durationMs = 3500): void {
      const id = crypto.randomUUID()
      toasts.value.push({ id, type, message })
      setTimeout(() => removeToast(id), durationMs)
    }

    function removeToast(id: string): void {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return { darkMode, sidebarOpen, lang, toasts, toggleDark, toggleSidebar, setLang, addToast, removeToast }
  },
  { persist: { paths: ['darkMode', 'sidebarOpen', 'lang'] } },
)
