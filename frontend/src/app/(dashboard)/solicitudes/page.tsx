'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User, Product } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'

interface RequestItem {
  id: string
  productId?: string
  product?: Product
  productName?: string
  sku?: string
  requestedQuantity: number
  deliveredQuantity: number
  unitMeasure?: string
  isChecked: boolean
}

interface MaterialRequest {
  id: string
  code: string
  projectName?: string
  status: 'PENDING' | 'DISPATCHED' | 'REJECTED'
  recipientName?: string
  photoUrl?: string
  attachmentUrl?: string
  attachmentName?: string
  notes?: string
  createdAt: string
  updatedAt: string
  requestedBy: User
  assignedTo?: User
  van?: any
  items: RequestItem[]
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  EQUIPOS: { bg: 'bg-purple-100 dark:bg-purple-950/80', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800' },
  RED: { bg: 'bg-blue-100 dark:bg-blue-950/80', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
  FIBRA_OPTICA: { bg: 'bg-emerald-100 dark:bg-emerald-950/80', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
  ELECTRICIDAD: { bg: 'bg-amber-100 dark:bg-amber-950/80', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' },
  CANALIZACION: { bg: 'bg-rose-100 dark:bg-rose-950/80', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' },
  INSUMOS: { bg: 'bg-cyan-100 dark:bg-cyan-950/80', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-800' },
}

export default function SolicitudesPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Create Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  
  // Excel / CSV Upload State for Request
  const [uploadedAttachmentUrl, setUploadedAttachmentUrl] = useState('')
  const [uploadedAttachmentName, setUploadedAttachmentName] = useState('')
  const [isParsingExcel, setIsParsingExcel] = useState(false)
  const [excelParseMessage, setExcelParseMessage] = useState('')

  // Product Search & Filter inside modal
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS')

  // Selected items: map of productId -> quantity
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({})

  // Dispatch Modal State (For Bodeguero)
  const [dispatchRequest, setDispatchRequest] = useState<MaterialRequest | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [vans, setVans] = useState<any[]>([])
  const [systemUsers, setSystemUsers] = useState<any[]>([])
  const [selectedVanId, setSelectedVanId] = useState<string>('')
  const [itemChecks, setItemChecks] = useState<Record<string, { isChecked: boolean; quantity: number }>>({})

  // Items Dropdown state for Desktop & Mobile
  const [openItemsDropdownId, setOpenItemsDropdownId] = useState<string | null>(null)

  // Supplier Quote Modal State (For Bodeguero for missing items)
  const [showSupplierQuoteModal, setShowSupplierQuoteModal] = useState(false)
  const [supplierQuoteRequest, setSupplierQuoteRequest] = useState<MaterialRequest | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [supplierNotes, setSupplierNotes] = useState('')

  // Proof Photo View Modal
  const [viewPhotoRequest, setViewPhotoRequest] = useState<MaterialRequest | null>(null)

  useEffect(() => {
    setCurrentUser(getUser())
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reqRes, prodRes, vansRes, usersRes] = await Promise.all([
        api.get('/requests'),
        api.get('/products'),
        api.get('/vans').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ])
      if (Array.isArray(reqRes.data)) setRequests(reqRes.data)
      if (Array.isArray(prodRes.data)) setProducts(prodRes.data)
      if (Array.isArray(vansRes.data)) setVans(vansRes.data)
      if (Array.isArray(usersRes.data)) setSystemUsers(usersRes.data)
    } catch (err: any) {
      console.error('Error al obtener solicitudes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter products by search query and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = selectedCategoryFilter === 'TODOS' || p.category === selectedCategoryFilter
    return matchesSearch && matchesCategory
  })

  const handleAddProductToRequest = (prod: Product) => {
    setSelectedProductQuantities(prev => ({
      ...prev,
      [prod.id]: (prev[prod.id] || 0) + 1,
    }))
  }

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedProductQuantities(prev => {
      const current = prev[productId] || 0
      const next = current + delta
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: next }
    })
  }

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsingExcel(true)
    setExcelParseMessage('')

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        setUploadedAttachmentUrl(base64)
        setUploadedAttachmentName(file.name)

        try {
          const res = await api.post('/requests/parse-excel', {
            fileBase64: base64,
            fileName: file.name,
          })

          const parsedItems: Array<{
            productId?: string | null
            sku?: string | null
            productName: string
            requestedQuantity: number
            unitMeasure?: string
          }> = res.data?.items || []

          if (parsedItems.length === 0) {
            setExcelParseMessage('⚠️ Se adjuntó la planilla, pero no se hallaron filas con cantidad mayor a 0.')
            return
          }

          const newQuantities: Record<string, number> = { ...selectedProductQuantities }
          let matchedCount = 0

          parsedItems.forEach((p) => {
            if (p.productId) {
              newQuantities[p.productId] = p.requestedQuantity
              matchedCount++
            } else {
              const localProd = products.find(
                (lp) => (p.sku && lp.sku.toUpperCase() === p.sku.toUpperCase()) || lp.name.toUpperCase() === p.productName.toUpperCase()
              )
              if (localProd) {
                newQuantities[localProd.id] = p.requestedQuantity
                matchedCount++
              }
            }
          })

          setSelectedProductQuantities(newQuantities)
          setExcelParseMessage(`✅ ¡Éxito! Se interpretaron ${parsedItems.length} ítems desde "${file.name}" (${matchedCount} vinculados al inventario) y se transcribieron a la solicitud.`)
        } catch (err: any) {
          setExcelParseMessage(`📄 Se adjuntó "${file.name}" a la solicitud para que el bodeguero pueda revisarla.`)
        } finally {
          setIsParsingExcel(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setIsParsingExcel(false)
      alert('Error al leer el archivo seleccionado.')
    }
  }

  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionLoadingText, setActionLoadingText] = useState('Procesando...')

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    const itemsPayload = Object.entries(selectedProductQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
      }))

    if (itemsPayload.length === 0 && !uploadedAttachmentUrl && !requestNotes.trim()) {
      alert('Debes agregar productos a la lista o adjuntar una foto/planilla de materiales')
      return
    }

    setActionLoadingText('Creando y registrando solicitud de materiales...')
    setIsActionLoading(true)

    try {
      await api.post('/requests', {
        projectName,
        notes: requestNotes,
        attachmentUrl: uploadedAttachmentUrl || undefined,
        attachmentName: uploadedAttachmentName || undefined,
        items: itemsPayload,
      })

      setShowCreateModal(false)
      setProjectName('')
      setRequestNotes('')
      setUploadedAttachmentUrl('')
      setUploadedAttachmentName('')
      setExcelParseMessage('')
      setSelectedProductQuantities({})
      setProductSearch('')
      setSelectedCategoryFilter('TODOS')
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear la solicitud')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle Photo File Upload with Client Canvas Compression (Fix 413 request entity too large)
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDim = 1200
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          setPhotoUrl(compressedBase64)
          setPhotoPreview(compressedBase64)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const [dispatchError, setDispatchError] = useState('')

  // Handle Opening Dispatch Modal for Bodeguero
  const handleOpenDispatchModal = (req: MaterialRequest) => {
    setDispatchRequest(req)
    setRecipientName('')
    setDispatchNotes('')
    setPhotoUrl('')
    setPhotoPreview('')
    setDispatchError('')
    const initialChecks: Record<string, { isChecked: boolean; quantity: number }> = {}
    req.items.forEach(item => {
      initialChecks[item.id] = { isChecked: true, quantity: item.requestedQuantity }
    })
    setItemChecks(initialChecks)
  }

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchRequest) return
    setDispatchError('')

    if (!recipientName.trim()) {
      setDispatchError('Debes ingresar el nombre de la persona responsable que recibe los materiales')
      return
    }

    if (!photoUrl) {
      setDispatchError('Debes adjuntar una fotografía o archivo de comprobante de despacho')
      return
    }

    const itemsPayload = Object.entries(itemChecks).map(([itemId, val]) => ({
      itemId,
      isChecked: val.isChecked,
      deliveredQuantity: val.quantity,
    }))

    setActionLoadingText('Procesando despacho y actualizando inventarios...')
    setIsActionLoading(true)

    try {
      await api.patch(`/requests/${dispatchRequest.id}/dispatch`, {
        recipientName,
        photoUrl,
        vanId: selectedVanId || undefined,
        notes: dispatchNotes,
        items: itemsPayload,
      })

      setDispatchRequest(null)
      fetchData()
    } catch (err: any) {
      setDispatchError(err.response?.data?.message || 'Error al procesar el despacho')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle Supplier Quote Generation (Bodeguero)
  const handleOpenSupplierQuoteModal = (req: MaterialRequest) => {
    setSupplierQuoteRequest(req)
    setSupplierName('')
    setSupplierNotes('')
    setShowSupplierQuoteModal(true)
  }

  const handleOpenMailClient = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!supplierQuoteRequest) return

    const isUtp = (name: string) => name.toUpperCase().includes('UTP')
    const itemsText = supplierQuoteRequest.items
      .map(
        (i) =>
          `- [SKU: ${i.product?.sku || 'N/A'}] ${i.product?.name || i.productName}: ${i.requestedQuantity} ${
            isUtp(i.product?.name || '') ? 'MTS' : (i.unitMeasure || i.product?.unit || 'UN')
          }`,
      )
      .join('\n')

    const subject = `LAYERTHREE S.A. - Solicitud de Cotización de Materiales [${supplierQuoteRequest.code}] - Proyecto: ${supplierQuoteRequest.projectName || 'General'}`

    const body = `Estimados ${supplierName.trim() || 'Proveedor'},\n\nJunto con saludarles, desde el departamento de Adquisiciones y Logística de Layerthree S.A. solicitamos la cotización de precios y tiempo de entrega estimado para la siguiente lista de materiales:\n\n${itemsText}\n\n${
      supplierNotes.trim() ? `Observaciones Adicionales:\n${supplierNotes.trim()}\n\n` : ''
    }Quedamos atentos a su pronta respuesta.\n\nAtentamente,\nDepartamento de Bodega y Logística\nLayerthree S.A.`

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    window.location.href = mailtoUrl
  }

  const handleCopyQuoteText = () => {
    if (!supplierQuoteRequest) return
    const isUtp = (name: string) => name.toUpperCase().includes('UTP')
    const itemsText = supplierQuoteRequest.items
      .map((i) => `- [${i.product?.sku || 'N/A'}] ${i.product?.name}: ${i.requestedQuantity} ${isUtp(i.product?.name || '') ? 'MTS' : (i.unitMeasure || i.product?.unit || 'UN')}`)
      .join('\n')

    const text = `LAYERTHREE S.A. - Solicitud de Cotización de Materiales (${supplierQuoteRequest.code})\n\nEstimados ${supplierName || 'Proveedor'},\n\nJunto con saludarles, solicitamos cotización y tiempo de entrega para los siguientes materiales:\n\n${itemsText}\n\n${supplierNotes ? `Observaciones: ${supplierNotes}\n\n` : ''}Quedamos atentos a su respuesta.\nAtentamente,\nBodega Layerthree S.A.`

    navigator.clipboard.writeText(text)
    alert('¡Texto de la cotización copiado al portapapeles!')
  }

  const handlePrintQuoteDoc = () => {
    if (!supplierQuoteRequest) return
    const isUtp = (name: string) => name.toUpperCase().includes('UTP')
    const rowsHtml = supplierQuoteRequest.items
      .map(
        (i) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-family: monospace;">${i.product?.sku || 'N/A'}</td>
          <td style="padding: 8px;"><strong>${i.product?.name}</strong></td>
          <td style="padding: 8px; text-align: center; font-weight: bold;">${i.requestedQuantity} ${isUtp(i.product?.name || '') ? 'MTS' : (i.unitMeasure || i.product?.unit || 'UN')}</td>
        </tr>
      `,
      )
      .join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cotización Materiales - ${supplierQuoteRequest.code}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #1e293b; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .title { font-size: 20px; font-weight: bold; color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">LAYERTHREE S.A.</div>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Departamento de Adquisiciones y Logística</p>
            </div>
            <div style="text-align: right;">
              <strong>SOLICITUD DE COTIZACIÓN</strong>
              <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 14px;">${supplierQuoteRequest.code}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Fecha: ${new Date().toLocaleDateString('es-CL')}</p>
            </div>
          </div>

          <p><strong>Proveedor:</strong> ${supplierName || 'Proveedor'}</p>
          <p>Estimados, solicitamos la cotización y disponibilidad de entrega para los siguientes materiales:</p>

          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción del Material</th>
                <th style="text-align: center;">Cantidad Solicitada</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${supplierNotes ? `<p><strong>Observaciones:</strong> ${supplierNotes}</p>` : ''}

          <br/><br/>
          <p>Atentamente,</p>
          <p><strong>Bodega y Logística - Layerthree S.A.</strong></p>

          <div class="footer">
            Documento generado por la Plataforma Layerthree S.A.
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const canCreateRequest = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'JEFE_PROYECTO' || currentUser?.role === 'GERENTE' || currentUser?.role === 'JEFE'
  const canDispatch = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'BODEGUERO'

  const categories: string[] = ['TODOS', 'EQUIPOS', 'RED', 'FIBRA_OPTICA', 'ELECTRICIDAD', 'CANALIZACION', 'INSUMOS']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span>📑</span> Solicitudes y Pedidos de Materiales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Flujo de pedido por proyecto, comprobante fotográfico de entrega y trazabilidad.
          </p>
        </div>

        {canCreateRequest && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-lg transition active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>+</span> Nueva Solicitud
          </button>
        )}
      </div>

      {/* Requests Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-4xl block mb-2">📑</span>
            <p className="font-semibold text-lg">No hay solicitudes registradas</p>
            <p className="text-sm">Las solicitudes de materiales creadas por los Jefes de Proyecto aparecerán aquí.</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (For small screens) */}
            <div className="block md:hidden space-y-3">
              {requests.map((r) => {
                const isHighlighted = highlightId === r.id
                return (
                  <div
                    key={r.id}
                    className={`p-4 rounded-2xl border space-y-3 shadow-sm transition-all ${
                      isHighlighted
                        ? 'bg-blue-100/90 dark:bg-blue-950/90 border-blue-500 ring-2 ring-blue-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        {r.code}
                      </span>
                      {r.status === 'PENDING' ? (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300">
                          ⏳ Pendiente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300">
                          ✅ Despachado
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{r.projectName || 'Proyecto General'}</p>
                      <p className="text-[11px] text-slate-400">👤 Solicitante: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.requestedBy?.name || r.requestedBy?.email}</span></p>
                      {r.assignedTo && (
                        <p className="text-[11px] text-slate-400">📦 Despachado por: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{r.assignedTo.name || r.assignedTo.email}</span></p>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <p className="font-semibold text-[11px] text-slate-500 uppercase">Ítems Requeridos:</p>
                      {r.items.length === 0 ? (
                        <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                          <span>📷</span>
                          <span>Solicitud con foto/planilla adjunta (sin productos en lista)</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setOpenItemsDropdownId(openItemsDropdownId === r.id ? null : r.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl font-semibold text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 shadow-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span>📦</span>
                              <span>{r.items.length} {r.items.length === 1 ? 'Ítem Requerido' : 'Ítems Requeridos'}</span>
                              {r.items.some(i => (i.product?.stock ?? 0) < i.requestedQuantity) && (
                                <span className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold rounded">
                                  Sin Stock
                                </span>
                              )}
                            </span>
                            <span className="text-slate-400 text-xs">{openItemsDropdownId === r.id ? '▲ Ocultar' : '▼ Ver Lista'}</span>
                          </button>

                          {openItemsDropdownId === r.id && (
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 animate-fadeIn shadow-inner">
                              {r.items.map((item) => {
                                const isUtp = (item.product?.name || item.productName || '').toUpperCase().includes('UTP') || (item.product?.sku || item.sku || '').toUpperCase().includes('UTP')
                                const unitStr = isUtp ? 'MTS' : (item.unitMeasure || item.product?.unit || 'UN')
                                const currentStock = item.product?.stock ?? 0
                                const hasEnoughStock = currentStock >= item.requestedQuantity

                                return (
                                  <div key={item.id} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-1 last:border-0">
                                    <span className={item.isChecked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}>
                                      • {item.product?.name || item.productName} (x{item.requestedQuantity} {unitStr})
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
                                      hasEnoughStock
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                    }`}>
                                      {hasEnoughStock ? `Stock: ${currentStock}` : `Sin Stock (${currentStock})`}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {r.recipientName && (
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>🛻</span> Receptor: {r.recipientName} {r.van ? <span className="text-emerald-600 font-bold">[{r.van.plate}]</span> : ''}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-end gap-2">
                      {r.attachmentUrl && (
                        <a
                          href={r.attachmentUrl}
                          download={r.attachmentName || `Planilla_${r.code}.csv`}
                          className="w-full sm:w-auto py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border border-slate-300 dark:border-slate-700"
                          title="Descargar la planilla Excel/CSV subida originalmente"
                        >
                          <span>📥</span> {r.attachmentName || 'Planilla Adjunta'}
                        </a>
                      )}
                      {canDispatch && (
                        <button
                          onClick={() => handleOpenSupplierQuoteModal(r)}
                          className="w-full sm:w-auto py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow flex items-center justify-center gap-1"
                          title="Redactar correo de cotización a proveedor para materiales"
                        >
                          <span>📧</span> Cotizar a Proveedor
                        </button>
                      )}
                      {r.status === 'PENDING' && canDispatch && (
                        <button
                          onClick={() => handleOpenDispatchModal(r)}
                          className="w-full sm:w-auto py-1.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow"
                        >
                          Check & Despachar
                        </button>
                      )}
                      {r.status === 'DISPATCHED' && r.photoUrl && (
                        <button
                          onClick={() => setViewPhotoRequest(r)}
                          className="w-full sm:w-auto py-1.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1"
                        >
                          <span>📷</span> Ver Foto
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4 font-semibold">Código</th>
                      <th className="p-4 font-semibold">Proyecto</th>
                      <th className="p-4 font-semibold">Solicitado Por</th>
                      <th className="p-4 font-semibold">Despachado Por (Bodega)</th>
                      <th className="p-4 font-semibold">Ítems Requeridos</th>
                      <th className="p-4 font-semibold">Estado</th>
                      <th className="p-4 font-semibold">Receptor / Camioneta</th>
                      <th className="p-4 font-semibold text-right">Acciones & Cotización</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {requests.map((r) => {
                      const isHighlighted = highlightId === r.id
                      const hasMissingStock = r.items.some(i => (i.product?.stock ?? 0) < i.requestedQuantity)

                      return (
                        <tr
                          key={r.id}
                          id={`request-row-${r.id}`}
                          className={`transition-all duration-500 ${
                            isHighlighted
                              ? 'bg-blue-100/80 dark:bg-blue-950/80 ring-2 ring-blue-500 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {r.code}
                            {isHighlighted && (
                              <span className="ml-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-sans uppercase animate-pulse">
                                Destacado
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-medium">{r.projectName || 'Proyecto General'}</td>
                          <td className="p-4 text-xs">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{r.requestedBy?.name || 'Usuario'}</p>
                            <p className="text-slate-400">{r.requestedBy?.email}</p>
                          </td>
                          <td className="p-4 text-xs">
                            {r.assignedTo ? (
                              <div>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400">📦 {r.assignedTo.name || 'Bodeguero'}</p>
                                <p className="text-slate-400 text-[10px]">{r.assignedTo.email}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pendiente de despacho</span>
                            )}
                          </td>
                          <td className="p-4 text-xs relative">
                            {r.items.length === 0 ? (
                              <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                                <span>📷</span>
                                <span>Solicitud con foto/planilla adjunta (sin lista)</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenItemsDropdownId(openItemsDropdownId === r.id ? null : r.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition shadow-sm ${
                                    hasMissingStock
                                      ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  <span>📦</span>
                                  <span>{r.items.length} {r.items.length === 1 ? 'Ítem' : 'Ítems'}</span>
                                  {hasMissingStock ? (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold border border-red-300 dark:border-red-800">
                                      Falta Stock
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                                      Stock OK
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">{openItemsDropdownId === r.id ? '▲' : '▼'}</span>
                                </button>

                                {openItemsDropdownId === r.id && (
                                  <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-30 space-y-2 text-xs max-h-64 overflow-y-auto">
                                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-400">
                                      <span>Detalle de Materiales ({r.items.length})</span>
                                      <button
                                        type="button"
                                        onClick={() => setOpenItemsDropdownId(null)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold px-1"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {r.items.map((item) => {
                                      const isUtp = (item.product?.name || item.productName || '').toUpperCase().includes('UTP') || (item.product?.sku || item.sku || '').toUpperCase().includes('UTP')
                                      const unitStr = isUtp ? 'MTS' : (item.unitMeasure || item.product?.unit || 'UN')
                                      const currentStock = item.product?.stock ?? 0
                                      const hasEnoughStock = currentStock >= item.requestedQuantity
                                      const displayName = item.product?.name || item.productName || 'Producto'

                                      return (
                                        <div key={item.id} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                                          <span className={item.isChecked ? 'line-through text-slate-400 font-medium' : 'font-medium text-slate-800 dark:text-slate-200'}>
                                            • {displayName} (<strong>{item.requestedQuantity} {unitStr}</strong>)
                                          </span>
                                          <span className={`px-2 py-0.5 text-[10px] rounded font-bold shrink-0 ${
                                            hasEnoughStock
                                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300'
                                          }`}>
                                            {hasEnoughStock ? `Stock: ${currentStock}` : `Sin Stock (${currentStock})`}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {r.status === 'PENDING' ? (
                              <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1 w-fit">
                                <span>⏳</span> Pendiente
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1 w-fit">
                                <span>✅</span> Despachado
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {r.recipientName ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                  <span>👤</span> {r.recipientName}
                                </div>
                                {r.van && (
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    🛻 Camioneta: {r.van.plate} ({r.van.name})
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">Sin entregar</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-y-1.5">
                            {r.attachmentUrl && (
                              <a
                                href={r.attachmentUrl}
                                download={r.attachmentName || `Planilla_${r.code}.csv`}
                                className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1 transition"
                                title="Descargar la planilla Excel/CSV subida originalmente"
                              >
                                <span>📥</span> {r.attachmentName || 'Planilla Adjunta'}
                              </a>
                            )}
                            {canDispatch && (
                              <button
                                onClick={() => handleOpenSupplierQuoteModal(r)}
                                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1 ${
                                  hasMissingStock
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold animate-pulse'
                                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                                }`}
                                title="Redactar correo/documento formal de cotización a proveedor"
                              >
                                <span>📧</span> Cotizar a Proveedor
                              </button>
                            )}
                            {r.status === 'PENDING' && canDispatch && (
                              <button
                                onClick={() => handleOpenDispatchModal(r)}
                                className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
                              >
                                Check & Despachar
                              </button>
                            )}
                            {r.status === 'DISPATCHED' && r.photoUrl && (
                              <button
                                onClick={() => setViewPhotoRequest(r)}
                                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                <span>📷</span> Ver Foto
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Crear Solicitud */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">Nueva Solicitud de Materiales</h3>
                <p className="text-xs text-slate-400">Selecciona el proyecto y busca los materiales requeridos.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ej: Instalación Red NOC Corporativa"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Option to Upload Excel / CSV Spreadsheet */}
              <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-xs uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <span>📄</span> Cargar Planilla Excel / CSV de Materiales (.xlsx, .xlsm, .csv)
                  </label>
                  {uploadedAttachmentName && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedAttachmentUrl('')
                        setUploadedAttachmentName('')
                        setExcelParseMessage('')
                      }}
                      className="text-xs text-red-500 hover:underline font-semibold"
                    >
                      Remover archivo
                    </button>
                  )}
                </div>
                
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Si el Jefe de Proyecto rellenó una planilla Excel/CSV (ej: <code>NuevaPlanilla2.csv</code>), súbela aquí. El sistema la interpretará automáticamente y transcribirá los materiales solicitados.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow transition">
                    <span>📂 {isParsingExcel ? 'Analizando...' : 'Seleccionar Planilla Excel / CSV'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xlsm,.xls,.csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                      disabled={isParsingExcel}
                    />
                  </label>
                  {uploadedAttachmentName && (
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      📎 {uploadedAttachmentName}
                    </span>
                  )}
                </div>

                {excelParseMessage && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {excelParseMessage}
                  </p>
                )}
              </div>

              {/* Material Search Bar & Category Pill Filters */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="block font-semibold text-xs uppercase tracking-wider text-slate-500">
                  🔍 Buscar Materiales de Bodega
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Escribe para buscar por nombre o SKU (ej. Switch, Cat6a, FO-002)..."
                    className="w-full px-4 py-2 pl-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                </div>

                {/* Category Color Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map((cat) => {
                    const colors = CATEGORY_COLORS[cat] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' }
                    const isSelected = selectedCategoryFilter === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`px-3 py-1 text-xs rounded-full border transition font-semibold ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>

                {/* Product Search Results Grid */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pt-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No se encontraron productos coincidentes</p>
                  ) : (
                    filteredProducts.map(p => {
                      const colors = CATEGORY_COLORS[p.category] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
                      const addedQty = selectedProductQuantities[p.id] || 0
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{p.name}</span>
                              <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                                {p.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku} | Stock Disponible: <strong className="text-slate-700 dark:text-slate-200">{p.stock}</strong>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddProductToRequest(p)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition"
                          >
                            + Agregar {addedQty > 0 ? `(${addedQty})` : ''}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Selected Items Summary */}
              {Object.keys(selectedProductQuantities).length > 0 && (
                <div className="space-y-2 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <label className="block font-semibold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    📦 Lista de Productos Seleccionados ({Object.keys(selectedProductQuantities).length})
                  </label>
                  <div className="space-y-2">
                    {Object.entries(selectedProductQuantities).map(([pId, qty]) => {
                      const prod = products.find(p => p.id === pId)
                      if (!prod) return null
                      return (
                        <div key={pId} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                          <span className="font-semibold">{prod.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(pId, -1)}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold w-6 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(pId, 1)}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(pId, -qty)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Notas / Observaciones</label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Detalles sobre lugar de instalación u observaciones para bodega..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow"
                >
                  Enviar Solicitud a Bodega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Despacho Bodeguero */}
      {dispatchRequest && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">Despacho y Entrega de Pedido {dispatchRequest.code}</h3>
                <p className="text-xs text-slate-400">Proyecto: {dispatchRequest.projectName}</p>
              </div>
              <button
                onClick={() => setDispatchRequest(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4 text-sm">
              {dispatchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold flex justify-between items-center animate-fade-in shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>{dispatchError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDispatchError('')}
                    className="text-xs font-bold text-red-500 hover:text-red-700 p-1"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-2">Checklist de Materiales a Retirar de Bodega</label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {dispatchRequest.items.map((item) => {
                    const check = itemChecks[item.id] || { isChecked: true, quantity: item.requestedQuantity }
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-xs border-b border-slate-200 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
                        <label className="flex items-center space-x-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={check.isChecked}
                            onChange={(e) =>
                              setItemChecks(prev => ({
                                ...prev,
                                [item.id]: { ...check, isChecked: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 dark:border-slate-700 text-emerald-600"
                          />
                          <span className="font-medium">{item.product?.name}</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Cant:</span>
                          <input
                            type="number"
                            min="1"
                            max={item.requestedQuantity}
                            value={check.quantity}
                            onChange={(e) =>
                              setItemChecks(prev => ({
                                ...prev,
                                [item.id]: { ...check, quantity: parseInt(e.target.value) || 1 },
                              }))
                            }
                            className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center text-xs"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 flex justify-between items-center">
                  <span>Persona Responsable / Técnico Receptor <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Selecciona o escribe el nombre</span>
                </label>
                <input
                  type="text"
                  required
                  list="technicians-list"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Juan Pérez - Técnico Receptor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
                <datalist id="technicians-list">
                  {systemUsers.map((u) => (
                    <option key={u.id} value={`${u.name || u.email}${u.role ? ` (${u.role})` : ''}`} />
                  ))}
                  {vans.filter((v) => v.driver).map((v) => (
                    <option key={v.id} value={`${v.driver} (Conductor ${v.plate})`} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold mb-1 flex items-center gap-1.5">
                  <span>🛻</span> Camioneta de Destino (Actualización Automática de Stock Terreno)
                </label>
                <select
                  value={selectedVanId}
                  onChange={(e) => {
                    const vanId = e.target.value
                    setSelectedVanId(vanId)
                    if (vanId) {
                      const matchedVan = vans.find((v) => v.id === vanId)
                      if (matchedVan && matchedVan.driver && !recipientName) {
                        setRecipientName(matchedVan.driver)
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                >
                  <option value="">-- No asignar a camioneta (Entrega directa a persona) --</option>
                  {vans.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.plate}] {v.name} - Conductor: {v.driver || 'No asignado'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Upload Options for Bodeguero */}
              <div>
                <label className="block font-semibold mb-1">
                  📷 Fotografía de Comprobante de Entrega <span className="text-red-500">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <label className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer text-xs font-semibold transition text-center">
                    <span>📸 Sacar Foto con Cámara</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-xs font-semibold transition text-center">
                    <span>📁 Elegir de Galería / Archivos</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {photoPreview && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-emerald-500/50 max-h-48 flex justify-center bg-black">
                    <img src={photoPreview} alt="Comprobante entrega" className="max-h-48 object-contain" />
                    <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Foto Lista
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">Notas de Despacho</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Observaciones de entrega o guía de transporte..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchRequest(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow"
                >
                  Confirmar Entrega, Subir Foto & Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Foto de Entrega */}
      {viewPhotoRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📷</span> Comprobante de Entrega - {viewPhotoRequest.code}
                </h3>
                <p className="text-xs text-slate-400">Proyecto: {viewPhotoRequest.projectName}</p>
              </div>
              <button
                onClick={() => setViewPhotoRequest(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center p-2 shadow-inner">
                <img
                  src={viewPhotoRequest.photoUrl}
                  alt={`Comprobante ${viewPhotoRequest.code}`}
                  className="max-h-80 w-auto object-contain rounded-xl"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-400">Persona Responsable Receptor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">👤 {viewPhotoRequest.recipientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-400">Solicitado Por:</span>
                  <span className="font-semibold">{viewPhotoRequest.requestedBy?.name} ({viewPhotoRequest.requestedBy?.email})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-400">Fecha Despacho:</span>
                  <span className="font-mono">{new Date(viewPhotoRequest.updatedAt).toLocaleString('es-CL')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Ítems Entregados:</span>
                  <div className="space-y-1 pl-2">
                    {viewPhotoRequest.items.map(i => (
                      <p key={i.id} className="font-semibold">• {i.product?.name} (x{i.deliveredQuantity})</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewPhotoRequest(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow"
              >
                Cerrar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REDACTAR / GENERAR COTIZACIÓN A PROVEEDOR (BODEGUERO) */}
      {showSupplierQuoteModal && supplierQuoteRequest && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📧</span> Redactar Cotización a Proveedor
                </h3>
                <p className="text-xs text-slate-400 font-mono">Solicitud Origen: {supplierQuoteRequest.code} ({supplierQuoteRequest.projectName})</p>
              </div>
              <button
                onClick={() => setShowSupplierQuoteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenMailClient} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Empresa / Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Ej: Distribuidora Eléctrica Ltda. (dejar en blanco para 'Proveedor')"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Table Preview of Material Items */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  📋 Lista de Materiales a Cotizar:
                </label>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {supplierQuoteRequest.items.map((item) => {
                    const isUtp = (item.product?.name || '').toUpperCase().includes('UTP') || (item.product?.sku || '').toUpperCase().includes('UTP')
                    const unitStr = isUtp ? 'MTS' : (item.unitMeasure || item.product?.unit || 'UN')
                    const currentStock = item.product?.stock ?? 0

                    return (
                      <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.product?.name || item.productName}</span>
                          <span className="text-[11px] text-slate-400 font-mono ml-2">SKU: {item.product?.sku || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded">
                            {item.requestedQuantity} {unitStr}
                          </span>
                          <span className={`text-[10px] ${currentStock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            ({currentStock > 0 ? `Stock: ${currentStock}` : 'Sin Stock'})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notas u Observaciones Adicionales
                </label>
                <textarea
                  rows={2}
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="Ej: Indicar tiempo de despacho a Santiago y vigencia de la cotización..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">ℹ️ Envío directo desde tu App de Correo:</span>
                <p className="text-slate-500 dark:text-slate-400">
                  Al hacer clic en <strong>"Abrir en App de Correo"</strong>, se abrirá tu programa de correo predeterminado (Outlook, Gmail, Thunderbird, etc.) con el cuerpo formal del mensaje ya redactado. Allí podrás colocar los destinatarios correspondientes.
                </p>
              </div>

              {/* Toolbar Actions: Copy / Print / Email */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyQuoteText}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <span>📋</span> Copiar Texto
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintQuoteDoc}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <span>𖠡</span> Descargar / Imprimir PDF
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSupplierQuoteModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>✉️</span> Abrir en App de Correo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoadingOverlay isOpen={isActionLoading} message={actionLoadingText} />
    </div>
  )
}
