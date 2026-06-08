import apiClient from './client'

export type WorkflowStage =
  | 'technical_study'
  | 'designer'
  | 'programmer'
  | 'cnc'
  | 'qc'
  | 'production'
  | 'done'

export type ApnPriority = 'low' | 'normal' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'completed' | 'cancelled'
export type WorkflowOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type AttachmentType = 'pdf' | 'g_code' | 'excel' | 'other'

export interface WfProject {
  id: string
  code: string
  name: string
  description: string
  status: ProjectStatus
  order_count: number
  created_at: string
}

export interface WfProjectDetail extends WfProject {
  orders: WfOrder[]
  updated_at: string
}

export interface WfOrder {
  id: string
  project: string
  order_number: string
  order_date: string
  description: string
  status: WorkflowOrderStatus
  apn_count: number
}

export interface WfOrderDetail extends WfOrder {
  apns: WfApn[]
  created_at: string
  updated_at: string
}

export interface WfApn {
  id: string
  work_order: string
  apn_code: string
  specification: string
  priority: ApnPriority
  has_sample: boolean
  current_stage: WorkflowStage
  assigned_user: string | null
  assigned_user_username: string | null
}

export interface WfApnDetail extends WfApn {
  history: WfApnStageHistory[]
  attachments: WfApnAttachment[]
  created_at: string
  updated_at: string
}

export interface WfApnStageHistory {
  id: string
  from_stage: WorkflowStage | null
  to_stage: WorkflowStage
  transitioned_by_username: string | null
  comment: string
  created_at: string
}

export interface WfApnAttachment {
  id: string
  attachment_type: AttachmentType
  original_name: string
  size_bytes: number
  stage_at_upload: WorkflowStage | null
  notes: string
  file_url: string | null
  created_at: string
}

export interface CreateProjectPayload {
  code: string
  name: string
  description?: string
  status?: ProjectStatus
}

export interface CreateOrderPayload {
  order_number: string
  order_date: string
  description?: string
  status?: WorkflowOrderStatus
}

export interface CreateApnPayload {
  apn_code: string
  specification?: string
  priority?: ApnPriority
  has_sample?: boolean
  assigned_user?: string | null
}

export interface AdvanceStagePayload {
  target_stage: WorkflowStage | 'next'
  comment?: string
  assigned_user?: string | null
}

export const workflowApi = {
  // Projects
  listProjects(): Promise<WfProject[]> {
    return apiClient.get('/workflow/projects/').then(r => r.data)
  },

  getProject(id: string): Promise<WfProjectDetail> {
    return apiClient.get(`/workflow/projects/${id}/`).then(r => r.data)
  },

  createProject(payload: CreateProjectPayload): Promise<WfProject> {
    return apiClient.post('/workflow/projects/', payload).then(r => r.data)
  },

  patchProject(id: string, payload: Partial<CreateProjectPayload>): Promise<WfProject> {
    return apiClient.patch(`/workflow/projects/${id}/`, payload).then(r => r.data)
  },

  // Orders
  listOrders(projectId: string): Promise<WfOrder[]> {
    return apiClient.get(`/workflow/projects/${projectId}/orders/`).then(r => r.data)
  },

  getOrder(id: string): Promise<WfOrderDetail> {
    return apiClient.get(`/workflow/orders/${id}/`).then(r => r.data)
  },

  createOrder(projectId: string, payload: CreateOrderPayload): Promise<WfOrder> {
    return apiClient.post(`/workflow/projects/${projectId}/orders/`, payload).then(r => r.data)
  },

  patchOrder(id: string, payload: Partial<CreateOrderPayload>): Promise<WfOrder> {
    return apiClient.patch(`/workflow/orders/${id}/`, payload).then(r => r.data)
  },

  // APNs
  listApns(orderId: string): Promise<WfApn[]> {
    return apiClient.get(`/workflow/orders/${orderId}/apns/`).then(r => r.data)
  },

  getApn(id: string): Promise<WfApnDetail> {
    return apiClient.get(`/workflow/apns/${id}/`).then(r => r.data)
  },

  createApn(orderId: string, payload: CreateApnPayload): Promise<WfApn> {
    return apiClient.post(`/workflow/orders/${orderId}/apns/`, payload).then(r => r.data)
  },

  advanceStage(apnId: string, payload: AdvanceStagePayload): Promise<WfApnDetail> {
    return apiClient.post(`/workflow/apns/${apnId}/advance/`, payload).then(r => r.data)
  },

  async uploadAttachment(
    apnId: string,
    file: File,
    attachmentType: AttachmentType,
    notes = ''
  ): Promise<WfApnAttachment> {
    const form = new FormData()
    form.append('file', file)
    form.append('attachment_type', attachmentType)
    if (notes) form.append('notes', notes)
    const { data } = await apiClient.post(`/workflow/apns/${apnId}/attachments/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  deleteAttachment(id: string): Promise<void> {
    return apiClient.delete(`/workflow/attachments/${id}/`).then(() => undefined)
  },

  // Queue
  queue(stage: WorkflowStage): Promise<WfApnDetail[]> {
    return apiClient.get(`/workflow/queue/${stage}/`).then(r => r.data)
  },
}
