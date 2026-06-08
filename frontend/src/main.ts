import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import router from './router'
import fr from './i18n/fr.json'
import en from './i18n/en.json'
import './assets/main.css'

// Apply dark class immediately — industrial dark theme is default
try {
  const uiState = JSON.parse(localStorage.getItem('ui') || '{}')
  document.documentElement.classList.toggle('dark', uiState.darkMode !== false)
} catch {
  document.documentElement.classList.add('dark')
}

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'fr',
  fallbackLocale: 'fr',
  messages: { fr, en },
})

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
