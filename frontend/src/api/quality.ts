import apiClient from './client'

export interface Inspection {
  id: string
  ref: string
  inspection_date: string
  inspector: string
  inspector_name: string
  sales_order_ref: string
  mo_ref: string
  status: string
}

export interface NonConformity {
  id: string
  ref: string
  description: string
  severity: string
  status: string
  inspection: string | null
}

export interface CAPA {
  id: string
  action_type: string
  description: string
  assigned_to: string
  assigned_to_name: string
  due_date: string
  status: string
  ncr: string
}

export interface Audit {
  id: string
  ref: string
  audit_type: string
  scope: string
  auditor: string
  planned_date: string
  actual_date: string | null
  status: string
}

export const qualityApi = {
  listInspections: (params = {}) => apiClient.get('/v1/quality/inspections/', { params }).then(r => r.data),
  listNCRs: (params = {}) => apiClient.get('/v1/quality/ncrs/', { params }).then(r => r.data),
  listCAPAs: (params = {}) => apiClient.get('/v1/quality/capas/', { params }).then(r => r.data),
  listAudits: (params = {}) => apiClient.get('/v1/quality/audits/', { params }).then(r => r.data),
}
