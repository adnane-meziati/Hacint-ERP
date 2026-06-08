import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { qualityApi, type Inspection, type NonConformity, type CAPA, type Audit } from '@/api/quality'

export const useQualityStore = defineStore('quality', () => {
  const inspections = ref<Inspection[]>([])
  const ncrs = ref<NonConformity[]>([])
  const capas = ref<CAPA[]>([])
  const audits = ref<Audit[]>([])

  const kpi = computed(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const passed = inspections.value.filter(i => i.status === 'passed').length
    const total = inspections.value.length
    return {
      inspectionsThisMonth: inspections.value.filter(i =>
        new Date(i.inspection_date) >= startOfMonth
      ).length,
      openNCRs: ncrs.value.filter(n => ['open', 'under_review'].includes(n.status)).length,
      openCAPAs: capas.value.filter(c => ['open', 'in_progress'].includes(c.status)).length,
      conformityRate: total > 0 ? Math.round((passed / total) * 100) : 100,
    }
  })

  async function fetchAll(params: Record<string, string> = {}) {
    const [inspRes, ncrRes, capaRes, auditRes] = await Promise.all([
      qualityApi.listInspections(params),
      qualityApi.listNCRs({}),
      qualityApi.listCAPAs({}),
      qualityApi.listAudits({}),
    ])
    inspections.value = inspRes.results ?? inspRes
    ncrs.value = ncrRes.results ?? ncrRes
    capas.value = capaRes.results ?? capaRes
    audits.value = auditRes.results ?? auditRes
  }

  return { inspections, ncrs, capas, audits, kpi, fetchAll }
})
