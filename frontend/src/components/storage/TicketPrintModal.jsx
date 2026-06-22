import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import JsBarcode from 'jsbarcode'

// ─── Barcode helper ───────────────────────────────────────────────────────────

/**
 * Render a CODE128 barcode onto `svgEl` (a detached SVG node).
 * Returns a base64 data-URL string for embedding in print HTML, or null on failure.
 */
function renderBarcodeToDataUrl(value) {
  if (!value || value === '—') return null
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, String(value), {
      format: 'CODE128',
      displayValue: true,
      fontSize: 12,
      fontOptions: 'bold',
      height: 48,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    })
    const str = new XMLSerializer().serializeToString(svg)
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`
  } catch {
    return null
  }
}

// ─── Barcode React component ──────────────────────────────────────────────────

function Barcode({ value }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !value || value === '—') return
    try {
      JsBarcode(svgRef.current, String(value), {
        format: 'CODE128',
        displayValue: true,
        fontSize: 11,
        fontOptions: 'bold',
        height: 44,
        margin: 3,
        background: '#ffffff',
        lineColor: '#111111',
      })
    } catch { /* invalid value — silently ignore */ }
  }, [value])

  if (!value || value === '—') return null
  return <svg ref={svgRef} className="w-full max-h-16" />
}

// ─── Print window helper ──────────────────────────────────────────────────────

function openPrintWindow(htmlContent) {
  const win = window.open('', '_blank', 'width=540,height=760')
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket HACINT</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
    .ticket {
      width: 10cm; border: 1.5px solid #111; border-radius: 5px;
      overflow: hidden; margin: 6px auto; page-break-inside: avoid;
    }
    /* ── Header band ── */
    .tk-header {
      background: #1a1a2e; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 12px;
    }
    .tk-header .brand { font-size: 14px; font-weight: 800; letter-spacing: 2px; }
    .tk-header .section-label {
      font-size: 9px; font-weight: 600; letter-spacing: 1px; opacity: .75;
    }
    .tk-header .dt { font-size: 9px; opacity: .7; }
    /* ── Barcode row ── */
    .tk-barcode { padding: 8px 12px 4px; border-bottom: 1px solid #e5e7eb; background: #fff; }
    .tk-barcode img { width: 100%; max-height: 62px; display: block; }
    /* ── Body ── */
    .tk-body { display: flex; gap: 0; }
    .tk-fields { flex: 1; padding: 8px 12px; border-right: 1px solid #e5e7eb; }
    .tk-qr { width: 100px; padding: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: #fafafa; }
    .tk-qr img { width: 84px; height: 84px; }
    .tk-qr .qr-label { font-size: 7px; color: #888; text-align: center; word-break: break-all; max-width: 84px; }
    /* ── Fields ── */
    .field { margin-bottom: 5px; }
    .fl { font-size: 7.5px; color: #888; text-transform: uppercase; letter-spacing: .4px; }
    .fv { font-size: 11px; font-weight: 600; color: #111; word-break: break-word; }
    .fv.xl { font-size: 14px; font-family: monospace; }
    .fv.sm { font-size: 9.5px; }
    .divider { border: none; border-top: 1px dashed #d1d5db; margin: 5px 0; }
    /* ── Footer ── */
    .tk-footer { border-top: 1px solid #e5e7eb; padding: 4px 12px; display: flex; justify-content: space-between; background: #f9fafb; }
    .tk-footer span { font-size: 8px; color: #aaa; }
    @media print {
      @page { margin: 0.4cm; size: A6; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>${htmlContent}</body>
</html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 450)
}

// ─── Ticket Print Modal ───────────────────────────────────────────────────────

export default function TicketPrintModal({ ticket, parsed, onClose }) {
  // Resolve all fields from parsed scan OR saved ticket object
  const pn           = parsed?.pn           || ticket?.articleCode    || '—'
  const desc         = parsed?.desc         || ticket?.articleNom     || '—'
  const qty          = parsed?.qty          || '—'
  const loc          = parsed?.loc          || ticket?.placementCode  || null
  const lot          = parsed?.lotNum       || ticket?.lotNumero       || null
  const order        = parsed?.orderNum     || null
  const customer     = parsed?.customer     || null
  const customerCode = parsed?.customerCode || null
  const inspector    = parsed?.inspector    || null
  const qrValue      = parsed?.raw          || ticket?.qr_contenu      || pn
  const dt           = parsed?.date         || (ticket?.date_scan
    ? new Date(ticket.date_scan).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR'))

  const barcodeRef = useRef(null)

  // Render 1D barcode in preview whenever pn changes
  useEffect(() => {
    if (!barcodeRef.current || !pn || pn === '—') return
    try {
      JsBarcode(barcodeRef.current, pn, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 11,
        fontOptions: 'bold',
        height: 44,
        margin: 3,
        background: '#ffffff',
        lineColor: '#111111',
      })
    } catch { /* ignore invalid barcode values */ }
  }, [pn])

  const handlePrint = () => {
    // 1. Barcode data-URL (pre-rendered before opening window)
    const barcodeUrl = renderBarcodeToDataUrl(pn)

    // 2. QR as base64 image
    const qrEl = document.getElementById('ticket-qr-preview')
    let qrHtml = ''
    if (qrEl) {
      const svgStr = new XMLSerializer().serializeToString(qrEl)
      const b64 = btoa(unescape(encodeURIComponent(svgStr)))
      qrHtml = `<img src="data:image/svg+xml;base64,${b64}" width="84" height="84" />`
    }

    const row = (label, value) =>
      value && value !== '—'
        ? `<div class="field">
             <div class="fl">${label}</div>
             <div class="fv">${value}</div>
           </div>`
        : ''

    const html = `
<div class="ticket">
  <div class="tk-header">
    <span class="brand">HACINT</span>
    <span class="section-label">TICKET STOCKAGE</span>
    <span class="dt">${dt}</span>
  </div>

  ${barcodeUrl ? `<div class="tk-barcode"><img src="${barcodeUrl}" alt="barcode" /></div>` : ''}

  <div class="tk-body">
    <div class="tk-fields">
      <div class="field">
        <div class="fl">Référence (PN / 物料号)</div>
        <div class="fv xl">${pn}</div>
      </div>
      ${row('Description / 描述', desc)}
      <hr class="divider"/>
      <div class="field">
        <div class="fl">Quantité / 数量</div>
        <div class="fv xl">${qty}</div>
      </div>
      ${loc ? row('Emplacement / 装置', loc) : ''}
      ${row('N° lot / 调拨单号', lot)}
      ${row('Ordre / 订单号', order)}
      ${row('Client / 客户', customer)}
      ${customerCode ? row('Code client / 客户码', customerCode) : ''}
      ${inspector ? row('Inspecteur / 检验员', inspector) : ''}
    </div>
    <div class="tk-qr">
      ${qrHtml}
      <div class="qr-label">${pn}</div>
    </div>
  </div>

  <div class="tk-footer">
    <span>Imprimé le ${dt}</span>
    <span>HACINT Gestion de Stock · www.hacint.com.cn</span>
  </div>
</div>`

    openPrintWindow(html)
  }

  // ── Preview card field helper ─────────────────────────────────────────────
  const Field = ({ label, value, large, mono }) => {
    if (!value || value === '—') return null
    return (
      <div className="mb-2.5">
        <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</div>
        <div className={`font-semibold text-gray-900 ${large ? 'text-base' : 'text-sm'} ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Aperçu du ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Preview */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden">

            {/* Header band */}
            <div className="bg-[#1a1a2e] text-white flex items-center justify-between px-4 py-2.5">
              <span className="font-black tracking-widest text-sm">HACINT</span>
              <span className="text-[10px] font-semibold tracking-widest opacity-70">TICKET STOCKAGE</span>
              <span className="text-[10px] opacity-60">{dt}</span>
            </div>

            {/* Barcode */}
            {pn !== '—' && (
              <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
                <svg ref={barcodeRef} className="w-full max-h-16" />
              </div>
            )}

            {/* Body */}
            <div className="flex gap-0">
              {/* Fields */}
              <div className="flex-1 px-4 py-3 border-r border-gray-100">
                <Field label="Référence · PN · 物料号" value={pn} large mono />
                <Field label="Description · 描述" value={desc} />
                <hr className="my-2 border-dashed border-gray-200" />
                <div className="mb-2.5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Quantité · 数量</div>
                  <div className="text-xl font-black text-orange-600">{qty}</div>
                </div>
                <Field label="Emplacement · 装置" value={loc} mono />
                <Field label="Lot · 调拨单号" value={lot} mono />
                <Field label="Ordre · 订单号" value={order} />
                <Field label="Client · 客户" value={customer} />
                <Field label="Code client · 客户码" value={customerCode} mono />
                <Field label="Inspecteur · 检验员" value={inspector} />
              </div>

              {/* QR */}
              <div className="w-28 flex flex-col items-center justify-center gap-2 py-3 px-2 bg-gray-50">
                <QRCodeSVG id="ticket-qr-preview" value={qrValue} size={90} level="M" />
                <span className="text-[9px] text-gray-400 font-mono text-center break-all max-w-full">{pn}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex justify-between">
              <span className="text-[9px] text-gray-400">Imprimé le {dt}</span>
              <span className="text-[9px] text-gray-400">HACINT · www.hacint.com.cn</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer le ticket
          </button>
        </div>
      </div>
    </div>
  )
}
