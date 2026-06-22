const BRIDGE_BASE = 'http://127.0.0.1:43127'
const SOLIDWORKS_EXTENSIONS = new Set([
  'sldprt', 'sldasm', 'slddrw',
  'step', 'stp', 'iges', 'igs', 'dxf',
])

function getExtension(fileName = '') {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

export function isSolidWorksFile(fileName = '') {
  return SOLIDWORKS_EXTENSIONS.has(getExtension(fileName))
}

async function downloadSolidWorksFile(fileUrl) {
  const res = await fetch(fileUrl, {
    method: 'GET',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Le téléchargement du fichier a échoué (${res.status}).`)
  }

  return await res.arrayBuffer()
}

export async function openInSolidWorks({ fileUrl, fileName }) {
  if (!fileUrl) {
    throw new Error('Aucun fichier SolidWorks disponible.')
  }

  const ext = getExtension(fileName)
  if (!SOLIDWORKS_EXTENSIONS.has(ext)) {
    throw new Error("Ce type de fichier n'est pas pris en charge par SolidWorks.")
  }

  const fileBytes = await downloadSolidWorksFile(fileUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${BRIDGE_BASE}/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(fileName || `solidworks.${ext}`),
      },
      body: fileBytes,
      signal: controller.signal,
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload.error || 'Impossible de contacter le bridge SolidWorks local.')
    }

    return await res.json().catch(() => ({ ok: true }))
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(
        "Le bridge SolidWorks local ne répond pas. Vérifiez que le petit agent desktop est installé et lancé sur ce PC.",
      )
    }
    if (err instanceof TypeError) {
      throw new Error(
        "L'agent SolidWorks local est introuvable. Vérifiez qu'il est installé et démarré sur ce PC.",
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
