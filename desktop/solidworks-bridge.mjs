import http from 'node:http'
import { accessSync, constants, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'

const PORT = 43127
const TEMP_DIR = path.join(tmpdir(), 'sample-tracker-solidworks')
const SOLIDWORKS_EXE = 'SLDWORKS.exe'
const MAX_FILE_SIZE = 1024 * 1024 * 1024
const SOLIDWORKS_EXTENSIONS = new Set([
  '.sldprt', '.sldasm', '.slddrw',
  '.step', '.stp', '.iges', '.igs', '.dxf',
])
const REGISTRY_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\SLDWORKS.exe',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\SLDWORKS.exe',
]
const COMMON_INSTALL_PATHS = [
  'C:\\Program Files\\SOLIDWORKS Corp\\SOLIDWORKS\\SLDWORKS.exe',
  'C:\\Program Files (x86)\\SOLIDWORKS Corp\\SOLIDWORKS\\SLDWORKS.exe',
]

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
    'Access-Control-Allow-Private-Network': 'true',
  })
  res.end(body)
}

function canReadFile(filePath) {
  try {
    accessSync(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function parseRegistryValue(output) {
  const lines = output.split(/\r?\n/)
  for (const line of lines) {
    if (!line.includes('REG_')) continue
    const parts = line.trim().split(/\s{2,}/)
    const value = parts[parts.length - 1]?.trim()
    if (value) return value
  }
  return null
}

async function findSolidWorksExe() {
  const configuredPath = process.env.SOLIDWORKS_EXE_PATH
  if (configuredPath && canReadFile(configuredPath)) {
    return configuredPath
  }

  for (const key of REGISTRY_KEYS) {
    try {
      const { stdout } = await execFileAsync('reg', ['query', key, '/ve'])
      const candidate = parseRegistryValue(stdout)
      if (candidate && canReadFile(candidate)) {
        return candidate
      }
    } catch {
      // Keep checking the remaining lookup strategies.
    }
  }

  for (const candidate of COMMON_INSTALL_PATHS) {
    if (canReadFile(candidate)) {
      return candidate
    }
  }

  try {
    const { stdout } = await execFileAsync('where', [SOLIDWORKS_EXE])
    const candidate = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
    if (candidate && canReadFile(candidate)) {
      return candidate
    }
  } catch {
    // Ignore PATH lookup failures.
  }

  return null
}

function launchSolidWorks(exePath, filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, [filePath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

function safeFileName(headerValue) {
  const decoded = headerValue ? decodeURIComponent(headerValue) : 'solidworks-file'
  return path.basename(decoded || 'solidworks-file')
}

async function readRequestBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_FILE_SIZE) {
      throw new Error('Le fichier dépasse la taille maximale autorisée de 1 Go.')
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

function writeTempFile(fileName, fileBuffer) {
  mkdirSync(TEMP_DIR, { recursive: true })
  const target = path.join(TEMP_DIR, `${Date.now()}-${fileName}`)
  writeFileSync(target, fileBuffer)
  return target
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
      'Access-Control-Allow-Private-Network': 'true',
    })
    return res.end()
  }

  const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (reqUrl.pathname === '/health' && req.method === 'GET') {
    const exePath = await findSolidWorksExe()
    return sendJson(res, 200, {
      ok: true,
      solidWorksInstalled: Boolean(exePath),
      executable: exePath,
    })
  }

  if (reqUrl.pathname !== '/open') {
    return sendJson(res, 404, { error: 'Route introuvable.' })
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Méthode non autorisée.' })
  }

  try {
    const exePath = await findSolidWorksExe()
    if (!exePath || !existsSync(exePath)) {
      return sendJson(res, 503, {
        error: "SolidWorks n'est pas installé sur ce poste.",
      })
    }

    const fileName = safeFileName(req.headers['x-file-name'])
    if (!SOLIDWORKS_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
      return sendJson(res, 400, { error: 'Format SolidWorks non pris en charge.' })
    }
    const fileBuffer = await readRequestBody(req)
    if (!fileBuffer.length) {
      return sendJson(res, 400, { error: 'Le fichier transmis est vide.' })
    }

    const localPath = writeTempFile(fileName, fileBuffer)
    await launchSolidWorks(exePath, localPath)
    return sendJson(res, 200, {
      ok: true,
      path: localPath,
      executable: exePath,
    })
  } catch (error) {
    return sendJson(res, 500, {
      error: error?.message || "Impossible d'ouvrir le fichier dans SolidWorks.",
    })
  }
})

server.on('error', (error) => {
  console.error(`[ERROR] Bridge failed to start: ${error.message}`)
  process.exitCode = 1
})

server.listen(PORT, '127.0.0.1', async () => {
  const exePath = await findSolidWorksExe()
  console.log(`[OK] Hacint SolidWorks Bridge listening on http://127.0.0.1:${PORT}`)
  if (exePath) {
    console.log(`[OK] SolidWorks found: ${exePath}`)
  } else {
    console.log('[WARNING] SLDWORKS.exe was not found. SolidWorks may use a custom installation path.')
  }
})
