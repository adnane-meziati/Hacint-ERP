import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  workflowApi,
  type CreateMatrixSamplePayload,
  type CreateProjectSamplePayload,
  type MatrixSample,
  type ProjectSample,
  type ValidationRunResult,
  type WfApn,
  type WfApnDetail,
  type WfOrder,
  type WfOrderDetail,
  type WfProject,
  type WfProjectDetail,
  type WfValidation,
  type CreateProjectPayload,
  type CreateOrderPayload,
  type CreateApnPayload,
  type AdvanceStagePayload,
  type WorkflowStage,
  type AttachmentType,
} from '@/api/workflow'

export const useWorkflowStore = defineStore(
  'workflow',
  () => {
    const projects = ref<WfProject[]>([])
    const currentProject = ref<WfProjectDetail | null>(null)
    const currentOrder = ref<WfOrderDetail | null>(null)
    const currentApn = ref<WfApnDetail | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    function setError(e: any, fallback: string) {
      const msg = e?.response?.data?.detail ?? fallback
      error.value = typeof msg === 'string' ? msg : fallback
    }

    // --- Projects ---

    async function fetchProjects() {
      loading.value = true
      error.value = null
      try {
        projects.value = await workflowApi.listProjects()
      } catch (e: any) {
        setError(e, 'Failed to load projects')
      } finally {
        loading.value = false
      }
    }

    async function fetchProject(id: string) {
      loading.value = true
      error.value = null
      try {
        currentProject.value = await workflowApi.getProject(id)
      } catch (e: any) {
        setError(e, 'Failed to load project')
      } finally {
        loading.value = false
      }
    }

    async function createProject(payload: CreateProjectPayload): Promise<WfProject | null> {
      loading.value = true
      error.value = null
      try {
        const project = await workflowApi.createProject(payload)
        projects.value.unshift(project)
        return project
      } catch (e: any) {
        setError(e, 'Failed to create project')
        return null
      } finally {
        loading.value = false
      }
    }

    async function patchProject(id: string, payload: Partial<CreateProjectPayload>): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        const updated = await workflowApi.patchProject(id, payload)
        if (currentProject.value?.id === id) {
          Object.assign(currentProject.value, updated)
        }
        return true
      } catch (e: any) {
        setError(e, 'Failed to update project')
        return false
      } finally {
        loading.value = false
      }
    }

    // --- Orders ---

    async function fetchOrder(id: string) {
      loading.value = true
      error.value = null
      try {
        currentOrder.value = await workflowApi.getOrder(id)
      } catch (e: any) {
        setError(e, 'Failed to load order')
      } finally {
        loading.value = false
      }
    }

    async function createOrder(projectId: string, payload: CreateOrderPayload): Promise<WfOrder | null> {
      loading.value = true
      error.value = null
      try {
        const order = await workflowApi.createOrder(projectId, payload)
        if (currentProject.value?.id === projectId) {
          currentProject.value.orders = [order, ...(currentProject.value.orders ?? [])]
        }
        return order
      } catch (e: any) {
        setError(e, 'Failed to create order')
        return null
      } finally {
        loading.value = false
      }
    }

    // --- APNs ---

    async function fetchApn(id: string) {
      loading.value = true
      error.value = null
      try {
        currentApn.value = await workflowApi.getApn(id)
      } catch (e: any) {
        setError(e, 'Failed to load APN')
      } finally {
        loading.value = false
      }
    }

    async function createApn(orderId: string, payload: CreateApnPayload): Promise<WfApn | null> {
      loading.value = true
      error.value = null
      try {
        const apn = await workflowApi.createApn(orderId, payload)
        if (currentOrder.value?.id === orderId) {
          currentOrder.value.apns = [...(currentOrder.value.apns ?? []), apn]
        }
        return apn
      } catch (e: any) {
        setError(e, 'Failed to create APN')
        return null
      } finally {
        loading.value = false
      }
    }

    async function advanceStage(apnId: string, payload: AdvanceStagePayload): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        const updated = await workflowApi.advanceStage(apnId, payload)
        currentApn.value = updated
        return true
      } catch (e: any) {
        setError(e, 'Failed to advance stage')
        return false
      } finally {
        loading.value = false
      }
    }

    async function uploadAttachment(
      apnId: string,
      file: File,
      attachmentType: AttachmentType,
      notes = ''
    ): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        const attachment = await workflowApi.uploadAttachment(apnId, file, attachmentType, notes)
        if (currentApn.value?.id === apnId) {
          currentApn.value.attachments = [attachment, ...(currentApn.value.attachments ?? [])]
        }
        return true
      } catch (e: any) {
        setError(e, 'Failed to upload attachment')
        return false
      } finally {
        loading.value = false
      }
    }

    async function deleteAttachment(id: string): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        await workflowApi.deleteAttachment(id)
        if (currentApn.value) {
          currentApn.value.attachments = currentApn.value.attachments.filter(a => a.id !== id)
        }
        return true
      } catch (e: any) {
        setError(e, 'Failed to delete attachment')
        return false
      } finally {
        loading.value = false
      }
    }

    function clearCurrent() {
      currentProject.value = null
      currentOrder.value = null
      currentApn.value = null
    }

    // --- Technical Study Validation ---

    const matrix = ref<MatrixSample[]>([])
    const validationResult = ref<ValidationRunResult | null>(null)

    async function fetchMatrix() {
      loading.value = true
      error.value = null
      try {
        matrix.value = await workflowApi.listMatrix()
      } catch (e: any) {
        setError(e, 'Failed to load matrix')
      } finally {
        loading.value = false
      }
    }

    async function createMatrixSample(payload: CreateMatrixSamplePayload): Promise<MatrixSample | null> {
      loading.value = true
      error.value = null
      try {
        const sample = await workflowApi.createMatrixSample(payload)
        matrix.value.push(sample)
        matrix.value.sort((a, b) => a.reference.localeCompare(b.reference))
        return sample
      } catch (e: any) {
        setError(e, 'Failed to create matrix entry')
        return null
      } finally {
        loading.value = false
      }
    }

    async function deleteMatrixSample(id: string): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        await workflowApi.deleteMatrixSample(id)
        matrix.value = matrix.value.filter(s => s.id !== id)
        return true
      } catch (e: any) {
        setError(e, 'Failed to delete matrix entry')
        return false
      } finally {
        loading.value = false
      }
    }

    async function createProjectSample(projectId: string, payload: CreateProjectSamplePayload): Promise<ProjectSample | null> {
      loading.value = true
      error.value = null
      try {
        const sample = await workflowApi.createProjectSample(projectId, payload)
        if (currentProject.value?.id === projectId) {
          currentProject.value.samples = [...(currentProject.value.samples ?? []), sample]
        }
        return sample
      } catch (e: any) {
        setError(e, 'Failed to add sample')
        return null
      } finally {
        loading.value = false
      }
    }

    async function deleteProjectSample(id: string): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        await workflowApi.deleteProjectSample(id)
        if (currentProject.value) {
          currentProject.value.samples = currentProject.value.samples.filter(s => s.id !== id)
        }
        return true
      } catch (e: any) {
        setError(e, 'Failed to delete sample')
        return false
      } finally {
        loading.value = false
      }
    }

    async function validateProject(projectId: string): Promise<ValidationRunResult | null> {
      loading.value = true
      error.value = null
      try {
        const result = await workflowApi.validateProject(projectId)
        validationResult.value = result
        if (currentProject.value?.id === projectId) {
          currentProject.value.validation_status = result.validation_status
          currentProject.value.validation = result.validation
        }
        return result
      } catch (e: any) {
        setError(e, 'Failed to run validation')
        return null
      } finally {
        loading.value = false
      }
    }

    async function approveProject(projectId: string): Promise<WfValidation | null> {
      loading.value = true
      error.value = null
      try {
        const validation = await workflowApi.approveProject(projectId)
        if (currentProject.value?.id === projectId) {
          currentProject.value.validation = validation
        }
        return validation
      } catch (e: any) {
        setError(e, 'Failed to approve project')
        return null
      } finally {
        loading.value = false
      }
    }

    return {
      projects,
      currentProject,
      currentOrder,
      currentApn,
      loading,
      error,
      fetchProjects,
      fetchProject,
      createProject,
      patchProject,
      fetchOrder,
      createOrder,
      fetchApn,
      createApn,
      advanceStage,
      uploadAttachment,
      deleteAttachment,
      clearCurrent,
      // Technical Study Validation
      matrix,
      validationResult,
      fetchMatrix,
      createMatrixSample,
      deleteMatrixSample,
      createProjectSample,
      deleteProjectSample,
      validateProject,
      approveProject,
    }
  },
  { persist: true }
)
