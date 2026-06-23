import { useState } from 'react'
import { approveProjectApn, runValidation } from '../../../api/client'

export function useVerification(projectName) {
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [approvedApns, setApprovedApns] = useState(new Set())
  const [approvingApn, setApprovingApn] = useState(null)

  async function run() {
    setRunning(true); setError(null)
    try {
      const d = await runValidation(projectName)
      setResult(d)
      const approved = new Set(
        [...(d.matched || []), ...(d.mismatched || []), ...(d.extra || [])]
          .filter(r => r.approved).map(r => r.reference)
      )
      setApprovedApns(approved)
      return d
    } catch (err) {
      setError(err?.response?.data?.error || 'Erreur lors de la vérification.')
    } finally { setRunning(false) }
  }

  async function toggleApn(apn) {
    const nowApproved = !approvedApns.has(apn)
    setApprovingApn(apn)
    try {
      await approveProjectApn(projectName, apn, nowApproved)
      setApprovedApns(prev => {
        const next = new Set(prev)
        nowApproved ? next.add(apn) : next.delete(apn)
        return next
      })
    } finally { setApprovingApn(null) }
  }

  const allRows = result
    ? [...(result.matched || []), ...(result.missing || []), ...(result.mismatched || []), ...(result.extra || [])]
        .sort((a, b) => a.reference.localeCompare(b.reference))
    : []

  return { result, running, error, approvedApns, approvingApn, run, toggleApn, allRows, summary: result?.summary }
}
