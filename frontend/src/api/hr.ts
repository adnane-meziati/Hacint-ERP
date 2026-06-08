import apiClient from './client'

export interface Employee {
  id: string
  emp_code: string
  first_name: string
  last_name: string
  department: string
  department_name: string
  job_title: string
  hire_date: string
  employment_type: string
  status: string
  salary_base: string
  currency: string
}

export interface Department {
  id: string
  code: string
  name: string
  manager: string | null
  manager_name: string | null
  employee_count: number
}

export interface TimeOffRequest {
  id: string
  employee: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  status: string
}

export interface PayrollRecord {
  id: string
  employee: string
  employee_name: string
  period_start: string
  period_end: string
  gross_salary: string
  deductions: string
  net_salary: string
  currency: string
  status: string
  paid_date: string | null
}

export const hrApi = {
  listEmployees: (params = {}) => apiClient.get('/v1/hr/employees/', { params }).then(r => r.data),
  listDepartments: (params = {}) => apiClient.get('/v1/hr/departments/', { params }).then(r => r.data),
  listTimeOff: (params = {}) => apiClient.get('/v1/hr/time-off/', { params }).then(r => r.data),
  listPayroll: (params = {}) => apiClient.get('/v1/hr/payroll/', { params }).then(r => r.data),
}
