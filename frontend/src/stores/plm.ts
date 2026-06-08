import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { plmApi, type BOM, type ECN } from '@/api/plm'

export const usePlmStore = defineStore('plm', () => {
  const boms = ref<BOM[]>([])
  const ecns = ref<ECN[]>([])

  const kpi = computed(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      activeBOMs: boms.value.filter(b => b.status === 'active').length,
      pendingECNs: ecns.value.filter(e => ['draft', 'under_review'].includes(e.status)).length,
      articles: new Set(boms.value.map(b => b.article)).size,
      revisionsThisMonth: boms.value.length,
    }
  })

  async function fetchAll(params: Record<string, string> = {}) {
    const [bomsRes, ecnsRes] = await Promise.all([
      plmApi.listBOMs(params),
      plmApi.listECNs({}),
    ])
    boms.value = bomsRes.results ?? bomsRes
    ecns.value = ecnsRes.results ?? ecnsRes
  }

  return { boms, ecns, kpi, fetchAll }
})
