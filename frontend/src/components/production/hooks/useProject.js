import { useCallback, useState } from 'react'
import {
  approveValidation, createProject, getValidationList, updateProjectStatus,
} from '../../../api/client'

export function useProject() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setProjects(await getValidationList()) } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  async function create(name) {
    const p = await createProject(name.trim())
    setProjects(prev => [...prev, p])
    return p
  }

  async function resetStatus(projectName, status) {
    const updated = await updateProjectStatus(projectName, { validation_status: status })
    patch(projectName, updated)
    return updated
  }

  async function approve(projectName) {
    const v = await approveValidation(projectName)
    patch(projectName, { ...v })
    return v
  }

  function patch(projectName, data) {
    setProjects(prev =>
      prev.map(p => p.project_name === projectName ? { ...p, ...data } : p)
    )
  }

  return { projects, loading, load, create, resetStatus, approve, patch }
}
