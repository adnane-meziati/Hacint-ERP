import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { hrApi, type Employee, type Department, type TimeOffRequest, type PayrollRecord } from '@/api/hr'

export const useHrStore = defineStore('hr', () => {
  const employees = ref<Employee[]>([])
  const departments = ref<Department[]>([])
  const timeOffRequests = ref<TimeOffRequest[]>([])
  const payrollRecords = ref<PayrollRecord[]>([])

  const kpi = computed(() => ({
    activeEmployees: employees.value.filter(e => e.status === 'active').length,
    pendingLeave: timeOffRequests.value.filter(r => r.status === 'pending').length,
    totalSalary: employees.value.filter(e => e.status === 'active').reduce((s, e) => s + Number(e.salary_base), 0),
    departments: departments.value.length,
  }))

  async function fetchAll(params: Record<string, string> = {}) {
    const [empRes, deptRes, timeOffRes, payrollRes] = await Promise.all([
      hrApi.listEmployees(params),
      hrApi.listDepartments({}),
      hrApi.listTimeOff({}),
      hrApi.listPayroll({}),
    ])
    employees.value = empRes.results ?? empRes
    departments.value = deptRes.results ?? deptRes
    timeOffRequests.value = timeOffRes.results ?? timeOffRes
    payrollRecords.value = payrollRes.results ?? payrollRes
  }

  return { employees, departments, timeOffRequests, payrollRecords, kpi, fetchAll }
})
