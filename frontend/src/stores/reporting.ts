import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { reportingApi, type SavedReport, type ScheduledReport } from '@/api/reporting'

export const useReportingStore = defineStore('reporting', () => {
  const savedReports = ref<SavedReport[]>([])
  const scheduledReports = ref<ScheduledReport[]>([])

  const kpi = computed(() => ({
    savedReports: savedReports.value.length,
    scheduledReports: scheduledReports.value.filter(s => s.is_active).length,
    publicReports: savedReports.value.filter(r => r.is_public).length,
    modulesCovered: new Set(savedReports.value.map(r => r.module)).size,
  }))

  async function fetchAll(params: Record<string, string> = {}) {
    const [savedRes, scheduledRes] = await Promise.all([
      reportingApi.listSaved(params),
      reportingApi.listScheduled({}),
    ])
    savedReports.value = savedRes.results ?? savedRes
    scheduledReports.value = scheduledRes.results ?? scheduledRes
  }

  return { savedReports, scheduledReports, kpi, fetchAll }
})
