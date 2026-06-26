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
export type ValidationStatus = 'pending' | 'approved' | 'rejected'
export type WorkflowOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type AttachmentType = 'pdf' | 'g_code' | 'excel' | 'other'

// --- Technical Study Validation ---

export interface MatrixSample {
  id: string
  reference: string
  designation: string
  quantity: number
  sample_type: string
  notes: string
  created_at: string
  updated_at: string
}

export interface ProjectSample {
  id: string
  project: string
  reference: string
  designation: string
  quantity: number
  sample_type: string
  notes: string
  created_at: string
}

export interface ValidationResultItem {
  reference: string
  designation: string
  matrix_quantity: number | null
  matrix_type: string | null
  project_quantity: number | null
  project_type: string | null
  status: 'matched' | 'missing' | 'mismatched' | 'extra'
}

export interface ValidationSummary {
  total_matrix: number
  total_project: number
  matched: number
  missing: number
  mismatched: number
  extra: number
}

export interface WfValidation {
  id: string
  validation_status: ValidationStatus
  validated_at: string | null
  validated_by_username: string | null
  approved_at: string | null
  approved_by_username: string | null
  result: {
    matched: ValidationResultItem[]
    missing: ValidationResultItem[]
    mismatched: ValidationResultItem[]
    extra: ValidationResultItem[]
    summary: ValidationSummary
  }
  created_at: string
  updated_at: string
}

export interface ValidationRunResult {
  validation_status: ValidationStatus
  matched: ValidationResultItem[]
  missing: ValidationResultItem[]
  mismatched: ValidationResultItem[]
  extra: ValidationResultItem[]
  summary: ValidationSummary
  validation: WfValidation
}

export interface CreateMatrixSamplePayload {
  reference: string
  designation?: string
  quantity?: number
  sample_type?: string
  notes?: string
}

export interface CreateProjectSamplePayload {
  reference: string
  designation?: string
  quantity?: number
  sample_type?: string
  notes?: string
}

// ---

export interface WfProject {
  id: string
  code: string
  name: string
  description: string
  status: ProjectStatus
  validation_status: ValidationStatus
  order_count: number
  sample_count: number
  created_at: string
}

export interface WfProjectDetail extends WfProject {
  orders: WfOrder[]
  samples: ProjectSample[]
  validation: WfValidation | null
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

  // Technical Study Validation — Reference Matrix
  listMatrix(): Promise<MatrixSample[]> {
    return apiClient.get('/workflow/matrix/').then(r => r.data)
  },

  createMatrixSample(payload: CreateMatrixSamplePayload): Promise<MatrixSample> {
    return apiClient.post('/workflow/matrix/', payload).then(r => r.data)
  },

  deleteMatrixSample(id: string): Promise<void> {
    return apiClient.delete(`/workflow/matrix/${id}/`).then(() => undefined)
  },

  // Technical Study Validation — Project Samples
  listProjectSamples(projectId: string): Promise<ProjectSample[]> {
    return apiClient.get(`/workflow/projects/${projectId}/samples/`).then(r => r.data)
  },

  createProjectSample(projectId: string, payload: CreateProjectSamplePayload): Promise<ProjectSample> {
    return apiClient.post(`/workflow/projects/${projectId}/samples/`, payload).then(r => r.data)
  },

  deleteProjectSample(id: string): Promise<void> {
    return apiClient.delete(`/workflow/samples/${id}/`).then(() => undefined)
  },

  // Technical Study Validation — Validate & Approve
  validateProject(projectId: string): Promise<ValidationRunResult> {
    return apiClient.post(`/workflow/projects/${projectId}/validate/`).then(r => r.data)
  },

  approveProject(projectId: string): Promise<WfValidation> {
    return apiClient.post(`/workflow/projects/${projectId}/approve/`).then(r => r.data)
  },
}
