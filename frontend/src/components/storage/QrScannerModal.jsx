import { useEffect, useRef, useState } from 'react'

// ─── QR / barcode content parser ─────────────────────────────────────────────
// Handles the barcode label format (PN / QTY / LOC / DESC / DATE lines)
// and the HACINT QR certificate format (Chinese key:value pairs)

export function parseQrContent(raw) {
  const r = {
    raw,
    pn:           null,  // Part number / 物料号
    qty:          null,  // Quantity    / 数量
    loc:          null,  // Location    / LOC / 装置
    desc:         null,  // Description / 描述
    date:         null,  // Date
    orderNum:     null,  // 订单号
    customer:     null,  // 客户
    lotNum:       null,  // 调拨单号
    customerCode: null,  // 客户码
    inspector:    null,  // 检验员
  }

  // Try JSON first
  try { return { ...r, ...JSON.parse(raw) } } catch {}

  // Split only on newlines / carriage returns.
  // Do NOT split on semicolons — field values contain them (e.g. "Z-B;USB",
  // "HBQ-806-26-00;恒压高度测量"). Use first colon/： on each line as separator.
  const lines = raw.split(/[\n\r]+/)

  for (const line of lines) {
    const colonIdx = line.search(/[:：]/)
    if (colonIdx < 0) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (!val) continue

    if (/^PN$/i.test(key) || /物料号/.test(key)) {
      r.pn = val
    } else if (/^QTY$/i.test(key) || /数\s*量/.test(key)) {
      // Strip unit suffix ("件", "pcs", whitespace …)
      r.qty = val.replace(/[件件\s].*/i, '').trim() || val
      // 检验员 sometimes appears on the same line: "2件  检验员：07"
      const m = val.match(/检验员\s*[:：]\s*(\S+)/)
      if (m) r.inspector = m[1]
    } else if (/^LOC$/i.test(key) || /装置/.test(key)) {
      r.loc = val
    } else if (/^DESC$/i.test(key) || /描述/.test(key)) {
      r.desc = val
    } else if (/^DATE$/i.test(key) || /日期/.test(key)) {
      r.date = val
    } else if (/订单号/.test(key)) {
      r.orderNum = val
    } else if (/客户码/.test(key)) {
      r.customerCode = val
    } else if (/客\s*户(?!码)/.test(key)) {
      r.customer = val
    } else if (/调拨单号/.test(key)) {
      r.lotNum = val
    } else if (/检验员/.test(key)) {
      r.inspector = val
    }
  }

  return r
}

// ─── Hardware scanner modal ───────────────────────────────────────────────────
// The scanner device acts as a keyboard: it types the barcode/QR content
// then sends an Enter keystroke. This component just needs an auto-focused
// input field — no camera required.

export default function QrScannerModal({ onScan, onClose }) {
  const [value, setValue] = useState('')
  const [ready, setReady] = useState(false)
  const inputRef = useRef(null)

  // Auto-focus on mount, then signal "ready" after a short delay
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus()
      setReady(true)
    }, 100)
    return () => clearTimeout(t)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = value.trim()
      if (v) onScan(v)
    }
  }

  const handleSubmit = () => {
    const v = value.trim()
    if (v) onScan(v)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Scanner un code</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          {/* Status indicator */}
          <div className={`flex items-center justify-center gap-3 rounded-xl py-5 mb-6 transition-colors ${
            ready ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border-2 border-gray-200'
          }`}>
            <span className="text-3xl">{ready ? '🟢' : '⏳'}</span>
            <div>
              <p className={`font-semibold text-sm ${ready ? 'text-green-700' : 'text-gray-500'}`}>
                {ready ? 'Prêt — scannez maintenant' : 'Initialisation…'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Pointez le scanner sur le QR code ou code-barre
              </p>
            </div>
          </div>

          {/* Hidden-style input — focused for scanner input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Contenu scanné
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="En attente du scanner…"
              className="w-full border-2 border-orange-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-gray-400 mt-1">
              Le scanner envoie automatiquement. Vous pouvez aussi taper manuellement et appuyer sur <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Entrée</kbd>.
            </p>
          </div>

          {/* Manual confirm button */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border rounded-xl hover:bg-gray-50">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-40 font-medium">
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
