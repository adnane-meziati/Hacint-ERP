<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t('nav.profile') }}</h1>

    <!-- Profile info form -->
    <div class="card space-y-4">
      <h2 class="text-base font-semibold text-slate-700 dark:text-slate-200">{{ t('profile.info') }}</h2>

      <!-- Avatar -->
      <div class="flex items-center gap-4">
        <div class="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0">
          <img v-if="avatarPreview || auth.user?.avatar" :src="avatarPreview || auth.user!.avatar!" class="w-full h-full object-cover" alt="" />
          <span v-else>{{ initials }}</span>
        </div>
        <div>
          <label class="btn-secondary cursor-pointer text-sm">
            {{ t('profile.changeAvatar') }}
            <input type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
          </label>
          <p class="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 2 MB</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label">{{ t('profile.firstName') }}</label>
          <input v-model="form.first_name" class="form-input" type="text" />
        </div>
        <div>
          <label class="form-label">{{ t('profile.lastName') }}</label>
          <input v-model="form.last_name" class="form-input" type="text" />
        </div>
        <div class="col-span-2">
          <label class="form-label">{{ t('profile.phone') }}</label>
          <input v-model="form.phone" class="form-input" type="tel" />
        </div>
        <div class="col-span-2">
          <label class="form-label">{{ t('profile.email') }}</label>
          <input v-model="form.email" class="form-input" type="email" />
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button class="btn-primary" :disabled="saving" @click="saveProfile">
          {{ saving ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </div>

    <!-- Change password form -->
    <div class="card space-y-4">
      <h2 class="text-base font-semibold text-slate-700 dark:text-slate-200">{{ t('profile.changePassword') }}</h2>

      <div class="space-y-3">
        <div>
          <label class="form-label">{{ t('profile.currentPassword') }}</label>
          <input v-model="pwd.current" class="form-input" type="password" autocomplete="current-password" />
        </div>
        <div>
          <label class="form-label">{{ t('profile.newPassword') }}</label>
          <input v-model="pwd.new1" class="form-input" type="password" autocomplete="new-password" />
        </div>
        <div>
          <label class="form-label">{{ t('profile.confirmPassword') }}</label>
          <input v-model="pwd.new2" class="form-input" type="password" autocomplete="new-password" />
          <p v-if="pwd.new1 && pwd.new2 && pwd.new1 !== pwd.new2" class="text-xs text-red-500 mt-1">
            {{ t('profile.passwordMismatch') }}
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="btn-primary"
          :disabled="savingPwd || !pwdValid"
          @click="changePassword"
        >
          {{ savingPwd ? t('common.saving') : t('profile.changePassword') }}
        </button>
      </div>
    </div>

    <!-- Read-only info -->
    <div class="card">
      <h2 class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-3">{{ t('profile.account') }}</h2>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt class="text-slate-500">{{ t('profile.username') }}</dt>
        <dd class="font-mono text-slate-800 dark:text-slate-100">{{ auth.user?.username }}</dd>
        <dt class="text-slate-500">{{ t('profile.role') }}</dt>
        <dd class="capitalize text-slate-800 dark:text-slate-100">{{ auth.user?.role }}</dd>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()

const form = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
})
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const saving = ref(false)
const savingPwd = ref(false)

const pwd = reactive({ current: '', new1: '', new2: '' })
const pwdValid = computed(() => pwd.current && pwd.new1 && pwd.new1 === pwd.new2 && pwd.new1.length >= 8)

const initials = computed(() => {
  const u = auth.user
  if (!u) return '?'
  if (u.first_name) return u.first_name[0].toUpperCase()
  return u.username[0].toUpperCase()
})

function onAvatarChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ui.addToast('error', t('profile.avatarTooLarge'))
    return
  }
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

async function saveProfile(): Promise<void> {
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('first_name', form.first_name)
    fd.append('last_name', form.last_name)
    fd.append('phone', form.phone)
    fd.append('email', form.email)
    if (avatarFile.value) fd.append('avatar', avatarFile.value)
    const { data } = await apiClient.patch('/users/me/', fd)
    auth.user = data
    ui.addToast('success', t('profile.saved'))
    avatarFile.value = null
  } catch {
    ui.addToast('error', t('common.error'))
  } finally {
    saving.value = false
  }
}

async function changePassword(): Promise<void> {
  savingPwd.value = true
  try {
    await apiClient.post('/users/me/password/', {
      old_password: pwd.current,
      new_password: pwd.new1,
    })
    ui.addToast('success', t('profile.passwordChanged'))
    pwd.current = ''
    pwd.new1 = ''
    pwd.new2 = ''
  } catch (e: any) {
    const msg = e?.response?.data?.detail ?? t('common.error')
    ui.addToast('error', msg)
  } finally {
    savingPwd.value = false
  }
}

onMounted(() => {
  const u = auth.user
  if (u) {
    form.first_name = u.first_name ?? ''
    form.last_name = u.last_name ?? ''
    form.phone = u.phone ?? ''
    form.email = u.email ?? ''
  }
})
</script>

<style scoped>
.card { @apply bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5; }
.form-label { @apply block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1; }
.form-input {
  @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
         text-sm text-slate-800 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50;
}
.btn-primary {
  @apply px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium
         hover:bg-primary/90 disabled:opacity-50 transition-colors;
}
.btn-secondary {
  @apply px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300
         hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors;
}
</style>
