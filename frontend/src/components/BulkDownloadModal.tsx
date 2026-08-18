'use client'

import React, { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useToast } from '@/components/ToastNotification'

export interface QuotationRequest {
  id: string
  code: string
  customCode?: string
  destinationType: 'PROYECTO' | 'STOCK_BODEGA'
  deliveryType?: 'RETIRO_SUCURSAL' | 'DESPACHO_DOMICILIO'
  title: string
  projectId?: string
  projectName?: string
  status: string
  notes?: string
  attachmentUrl?: string
  attachmentName?: string
  ocAttachmentUrl?: string
  ocAttachmentName?: string
  invoiceAttachmentUrl?: string
  invoiceAttachmentName?: string
  documentsJson?: string
  createdAt: string
}

interface PurchaseDocument {
  id: string
  type: 'COTIZACION' | 'ORDEN_COMPRA' | 'FACTURA' | 'OTRO'
  name: string
  url: string
  uploadedAt: string
}

interface BulkDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  quotations: QuotationRequest[]
}

export default function BulkDownloadModal({
  isOpen,
  onClose,
  quotations,
}: BulkDownloadModalProps) {
  const { showToast } = useToast()
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [destinationFilter, setDestinationFilter] = useState<'ALL' | 'STOCK_BODEGA' | 'PROYECTO'>('ALL')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [includeCotizacion, setIncludeCotizacion] = useState(true)
  const [includeOc, setIncludeOc] = useState(true)
  const [includeFactura, setIncludeFactura] = useState(true)
  const [includeOtro, setIncludeOtro] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')

  if (!isOpen) return null

  // Collect unique project names
  const projectNames = Array.from(
    new Set(quotations.map((q) => q.projectName).filter(Boolean))
  ) as string[]

  const handleGenerateZip = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setProgressMessage('Iniciando empaquetado de documentos...')

    try {
      const zip = new JSZip()
      let totalFilesAdded = 0

      // Filter quotations by criteria
      const filteredQuotations = quotations.filter((q) => {
        // Date filter
        const createdDate = new Date(q.createdAt)
        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (createdDate < start) return false
        }
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (createdDate > end) return false
        }

        // Destination filter
        if (destinationFilter === 'STOCK_BODEGA' && q.destinationType !== 'STOCK_BODEGA') {
          return false
        }
        if (destinationFilter === 'PROYECTO') {
          if (q.destinationType !== 'PROYECTO') return false
          if (selectedProject && q.projectName !== selectedProject) return false
        }

        return true
      })

      if (filteredQuotations.length === 0) {
        showToast('No se encontraron flujos de compra que coincidan con los filtros seleccionados.', 'warning')
        setIsGenerating(false)
        return
      }

      const totalFlows = filteredQuotations.length

      for (let i = 0; i < totalFlows; i++) {
        const q = filteredQuotations[i]
        setProgressMessage(`Procesando flujo (${i + 1}/${totalFlows}): ${q.code}...`)

        // Top level folder: Project or Stock
        const sanitize = (name: string) =>
          name
            .replace(/[^a-zA-Z0-9_\-\.\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50)

        const topFolderName =
          q.destinationType === 'PROYECTO'
            ? `Proyectos/${sanitize(q.projectName || 'Sin_Nombre')}`
            : 'Stock_Bodega'

        const flowFolderName = `${topFolderName}/${sanitize(q.code)}_${sanitize(q.title)}`

        // Parse documentsJson
        let docs: PurchaseDocument[] = []
        if (q.documentsJson) {
          try {
            docs = JSON.parse(q.documentsJson)
          } catch (err) {}
        }

        // Add document attachments from legacy fields if not in docs
        if (q.attachmentUrl && !docs.some((d) => d.type === 'COTIZACION')) {
          docs.push({
            id: 'legacy-cot',
            type: 'COTIZACION',
            name: `Cotizacion_${q.code}`,
            url: q.attachmentUrl,
            uploadedAt: new Date(q.createdAt).toISOString(),
          })
        }
        if (q.ocAttachmentUrl && !docs.some((d) => d.type === 'ORDEN_COMPRA')) {
          docs.push({
            id: 'legacy-oc',
            type: 'ORDEN_COMPRA',
            name: `Orden_Compra_${q.code}`,
            url: q.ocAttachmentUrl,
            uploadedAt: new Date(q.createdAt).toISOString(),
          })
        }
        if (q.invoiceAttachmentUrl && !docs.some((d) => d.type === 'FACTURA')) {
          docs.push({
            id: 'legacy-fac',
            type: 'FACTURA',
            name: `Factura_${q.code}`,
            url: q.invoiceAttachmentUrl,
            uploadedAt: new Date(q.createdAt).toISOString(),
          })
        }

        for (const doc of docs) {
          // Check type filter
          if (doc.type === 'COTIZACION' && !includeCotizacion) continue
          if (doc.type === 'ORDEN_COMPRA' && !includeOc) continue
          if (doc.type === 'FACTURA' && !includeFactura) continue
          if (doc.type === 'OTRO' && !includeOtro) continue

          const typeFolderName =
            doc.type === 'COTIZACION'
              ? 'Cotizaciones'
              : doc.type === 'ORDEN_COMPRA'
              ? 'Ordenes_de_Compra'
              : doc.type === 'FACTURA'
              ? 'Facturas'
              : 'Otros_Documentos'

          const targetFolderPath = `${flowFolderName}/${typeFolderName}`

          // Extract content
          if (doc.url && doc.url.startsWith('data:')) {
            const match = doc.url.match(/^data:([^;]+);base64,(.+)$/)
            if (match) {
              const base64Content = match[2]
              let fileName = sanitize(doc.name)
              if (!fileName.includes('.')) {
                const mime = match[1]
                const ext = mime.includes('pdf')
                  ? '.pdf'
                  : mime.includes('png')
                  ? '.png'
                  : mime.includes('jpeg') || mime.includes('jpg')
                  ? '.jpg'
                  : mime.includes('sheet') || mime.includes('excel')
                  ? '.xlsx'
                  : '.bin'
                fileName += ext
              }

              zip.file(`${targetFolderPath}/${fileName}`, base64Content, { base64: true })
              totalFilesAdded++
            }
          } else if (doc.url) {
            // External URL fallback text placeholder
            zip.file(
              `${targetFolderPath}/${sanitize(doc.name)}.txt`,
              `URL del documento: ${doc.url}\nSubido el: ${doc.uploadedAt}`
            )
            totalFilesAdded++
          }
        }
      }

      if (totalFilesAdded === 0) {
        showToast('Se encontraron flujos pero no tenían documentos adjuntos para incluir en el ZIP.', 'warning')
        setIsGenerating(false)
        return
      }

      setProgressMessage('Comprimiendo carpeta de archivos ZIP...')
      const zipContent = await zip.generateAsync({ type: 'blob' })

      const dateTag = startDate || endDate ? `_${startDate || 'inicio'}_a_${endDate || 'hoy'}` : ''
      saveAs(zipContent, `Documentos_Compras_Layerthree${dateTag}.zip`)

      showToast(`¡Empaquetado completado! Se descargaron ${totalFilesAdded} documentos.`, 'success', 'Descarga Completa')
      onClose()
    } catch (err: any) {
      console.error('Error generando archivo ZIP masivo:', err)
      showToast('Ocurrió un error al generar la descarga masiva ZIP.', 'error')
    } finally {
      setIsGenerating(false)
      setProgressMessage('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-auto">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📦</span> Descarga Masiva de Documentos (ZIP)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleGenerateZip} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Descargue todos los documentos comprimidos en un archivo **.ZIP**, organizados jerárquicamente en carpetas por **Proyecto** y **Tipo de Documento**.
          </p>

          {/* Date range filters */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Fecha Desde (Opcional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Fecha Hasta (Opcional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              />
            </div>
          </div>

          {/* Destination filter */}
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
              Filtrar por Destino / Ubicación
            </label>
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">🌐 Todos los Destinos (Proyectos y Stock Bodega)</option>
              <option value="STOCK_BODEGA">📦 Solo Stock de Bodega</option>
              <option value="PROYECTO">🏗️ Solo Proyectos Específicos</option>
            </select>
          </div>

          {destinationFilter === 'PROYECTO' && projectNames.length > 0 && (
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Seleccionar Proyecto Especifico (Opcional)
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="">-- Todos los Proyectos --</option>
                {projectNames.map((proj) => (
                  <option key={proj} value={proj}>
                    🏗️ {proj}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Document type selection */}
          <div className="space-y-2 pt-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Tipos de Documentos a Incluir en el ZIP:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="flex items-center space-x-2 font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeCotizacion}
                  onChange={(e) => setIncludeCotizacion(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>📄 Cotizaciones</span>
              </label>

              <label className="flex items-center space-x-2 font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeOc}
                  onChange={(e) => setIncludeOc(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>📜 Órdenes de Compra (OC)</span>
              </label>

              <label className="flex items-center space-x-2 font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeFactura}
                  onChange={(e) => setIncludeFactura(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>🧾 Facturas</span>
              </label>

              <label className="flex items-center space-x-2 font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeOtro}
                  onChange={(e) => setIncludeOtro(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>📎 Otros Documentos</span>
              </label>
            </div>
          </div>

          {isGenerating && (
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-xl font-bold text-xs animate-pulse flex items-center gap-2">
              <span className="animate-spin text-sm">🔄</span> {progressMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow flex items-center gap-1.5"
            >
              <span>📦</span> {isGenerating ? 'Generando ZIP...' : 'Descargar Archivo ZIP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
