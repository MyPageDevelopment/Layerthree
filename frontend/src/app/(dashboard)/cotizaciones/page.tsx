'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User, Product } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'
import InvoiceConfirmationModal, { ParsedInvoiceData } from '@/components/InvoiceConfirmationModal'
import ConfirmModal from '@/components/ConfirmModal'
import { useToast } from '@/components/ToastNotification'
import Tesseract from 'tesseract.js'

interface QuotationItem {
  id?: string
  productName: string
  productId?: string
  quantity: number
  unitMeasure?: string
  estimatedUnitPrice?: number
  supplier?: string
  itemNotes?: string
  linkUrl?: string
}

interface PurchaseDocument {
  id: string
  type: 'COTIZACION' | 'ORDEN_COMPRA' | 'FACTURA' | 'OTRO'
  name: string
  url: string
  uploadedAt: string
  uploadedBy?: string
}

interface QuotationRequest {
  id: string
  code: string
  customCode?: string
  destinationType: 'PROYECTO' | 'STOCK_BODEGA'
  deliveryType?: 'RETIRO_SUCURSAL' | 'DESPACHO_DOMICILIO'
  title: string
  projectId?: string
  projectName?: string
  requestedById: string
  requestedBy: {
    id: string
    name?: string
    email: string
    role: string
  }
  assignedToId?: string
  assignedTo?: {
    id: string
    name?: string
    email: string
    role: string
  }
  pickupWorkerId?: string
  pickupWorker?: {
    id: string
    name?: string
    email: string
    role: string
  }
  pickupWorkerName?: string
  notificationEmail?: string
  status: 'PENDING_QUOTE' | 'QUOTED' | 'ORDER_PLACED' | 'IN_PROCESSING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  attachmentUrl?: string
  attachmentName?: string
  ocAttachmentUrl?: string
  ocAttachmentName?: string
  invoiceAttachmentUrl?: string
  invoiceAttachmentName?: string
  documentsJson?: string
  bodegueroNotes?: string
  responseAttachmentUrl?: string
  responseAttachmentName?: string
  totalEstimatedCost: number
  supplierRut?: string
  supplierName?: string
  invoiceNumber?: string
  items: QuotationItem[]
  createdAt: string
  updatedAt: string
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_QUOTE' | 'ORDER_PLACED' | 'IN_PROCESSING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED'

export default function CotizacionesPage() {
  const { showToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [usersList, setUsersList] = useState<User[]>([])
  const [quotations, setQuotations] = useState<QuotationRequest[]>([])
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal 1: Iniciar Flujo de Compra (Solo Cotización Inicial)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [destinationType, setDestinationType] = useState<'STOCK_BODEGA' | 'PROYECTO'>('STOCK_BODEGA')
  const [customCode, setCustomCode] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')
  const [newAttachmentName, setNewAttachmentName] = useState('')
  const [newItems, setNewItems] = useState<QuotationItem[]>([
    { productName: '', quantity: 1, unitMeasure: 'UN', linkUrl: '', itemNotes: '' },
  ])

  // Detail Modal State
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRequest | null>(null)
  const [uploadDocType, setUploadDocType] = useState<'COTIZACION' | 'ORDEN_COMPRA' | 'FACTURA' | 'OTRO'>('COTIZACION')
  const [uploadDocName, setUploadDocName] = useState('')
  const [uploadDocUrl, setUploadDocUrl] = useState('')

  // Modal 2: Subida de OC / Tramitación & Configuración de Entrega
  const [showOcDeliveryModal, setShowOcDeliveryModal] = useState(false)
  const [deliveryType, setDeliveryType] = useState<'DESPACHO_DOMICILIO' | 'RETIRO_SUCURSAL'>('DESPACHO_DOMICILIO')
  const [pickupWorkerName, setPickupWorkerName] = useState('')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [sendEmailNotification, setSendEmailNotification] = useState(true)

  // OCR Modal State (Para Facturas en Imagen / PDF)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [parsedInvoiceData, setParsedInvoiceData] = useState<ParsedInvoiceData | null>(null)
  const [isParsingOcr, setIsParsingOcr] = useState(false)
  const [ocrProgressText, setOcrProgressText] = useState('')

  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionLoadingText, setActionLoadingText] = useState('Procesando...')

  useEffect(() => {
    setUser(getUser())
    fetchQuotations()
    fetchWarehouseProducts()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users')
      if (Array.isArray(res.data)) {
        setUsersList(res.data)
      }
    } catch {
      // Ignore
    }
  }

  const fetchWarehouseProducts = async () => {
    try {
      const res = await api.get('/products')
      if (Array.isArray(res.data)) {
        setWarehouseProducts(res.data)
      }
    } catch {
      // Ignore
    }
  }

  const fetchQuotations = async () => {
    setLoading(true)
    try {
      const res = await api.get<QuotationRequest[]>('/quotations')
      if (Array.isArray(res.data)) {
        setQuotations(res.data)
      }
    } catch (err) {
      console.error('Error al cargar flujos de compra:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItemRow = () => {
    setNewItems((prev) => [
      ...prev,
      { productName: '', quantity: 1, unitMeasure: 'UN', linkUrl: '', itemNotes: '' },
    ])
  }

  const handleRemoveItemRow = (index: number) => {
    if (newItems.length === 1) return
    setNewItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      showToast('El archivo no debe superar los 15MB', 'warning', 'Archivo Pesado')
      return
    }
    const reader = new FileReader()
    reader.onload = (evt) => {
      setNewAttachmentUrl(evt.target?.result as string)
      setNewAttachmentName(file.name)
      showToast(`Archivo "${file.name}" adjuntado al flujo`, 'info')
    }
    reader.readAsDataURL(file)
  }

  const handleDocUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      showToast('El archivo no debe superar los 15MB', 'warning')
      return
    }
    const reader = new FileReader()
    reader.onload = (evt) => {
      setUploadDocUrl(evt.target?.result as string)
      setUploadDocName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmDocUpload = async () => {
    if (!selectedQuotation || !uploadDocUrl || !uploadDocName) {
      showToast('Debes seleccionar un archivo para adjuntar.', 'warning')
      return
    }
    setActionLoadingText('Subiendo y vinculando documento...')
    setIsActionLoading(true)
    try {
      await api.post(`/quotations/${selectedQuotation.id}/documents`, {
        documentType: uploadDocType,
        fileName: uploadDocName,
        fileUrl: uploadDocUrl,
      })

      showToast(`Documento (${uploadDocType}) adjuntado exitosamente.`, 'success', 'Documento Guardado')
      setUploadDocUrl('')
      setUploadDocName('')
      const updated = await api.get(`/quotations/${selectedQuotation.id}`)
      setSelectedQuotation(updated.data)
      fetchQuotations()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al adjuntar documento', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // 1. Iniciar Flujo de Compra (Formulario enfocado exclusivamente en Cotización Inicial)
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = newItems.filter((i) => i.productName.trim().length > 0)
    setActionLoadingText('Iniciando flujo de cotización y compra...')
    setIsActionLoading(true)

    try {
      await api.post('/quotations', {
        title: newTitle,
        customCode: customCode || undefined,
        destinationType,
        projectName: destinationType === 'PROYECTO' ? newProjectName : 'Stock de Bodega',
        notes: newNotes,
        attachmentUrl: newAttachmentUrl || undefined,
        attachmentName: newAttachmentName || undefined,
        items: validItems,
      })

      showToast(`Flujo de compra "${newTitle}" iniciado exitosamente`, 'success', 'Flujo Creado')
      setShowCreateModal(false)
      setCustomCode('')
      setNewTitle('')
      setNewProjectName('')
      setNewNotes('')
      setNewAttachmentUrl('')
      setNewAttachmentName('')
      setNewItems([{ productName: '', quantity: 1, unitMeasure: 'UN', linkUrl: '', itemNotes: '' }])
      fetchQuotations()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al crear flujo de compra', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // State for in-app deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // 2. Guardar Modalidad de Retiro / Despacho y Responsable (Al marcar materiales listos para despacho/retiro)
  const handleSaveOcDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuotation) return

    setActionLoadingText('Guardando modalidad de entrega y responsable...')
    setIsActionLoading(true)

    try {
      await api.patch(`/quotations/${selectedQuotation.id}/workflow`, {
        status: 'READY_FOR_PICKUP',
        deliveryType,
        pickupWorkerName: pickupWorkerName || undefined,
        notificationEmail: notificationEmail || undefined,
        sendEmailNotification,
        notes: `Materiales listos para: ${deliveryType === 'RETIRO_SUCURSAL' ? `Retiro en Sucursal (Responsable: ${pickupWorkerName || 'Sin asignar'})` : 'Despacho a Domicilio/Obra'}`,
      })

      showToast('Materiales marcados como listos para retiro/despacho y responsable notificado', 'success', 'Materiales Listos')
      setShowOcDeliveryModal(false)
      const updated = await api.get(`/quotations/${selectedQuotation.id}`)
      setSelectedQuotation(updated.data)
      fetchQuotations()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error actualizando modalidad de retiro', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleUpdateWorkflowStatus = async (newStatus: string) => {
    if (!selectedQuotation) return

    // Al marcar "READY_FOR_PICKUP" (Materiales Listos), solicitar el responsable de retiro y modalidad si es retiro en sucursal
    if (newStatus === 'READY_FOR_PICKUP') {
      setShowOcDeliveryModal(true)
      return
    }

    setActionLoadingText('Actualizando estado del flujo...')
    setIsActionLoading(true)
    try {
      await api.patch(`/quotations/${selectedQuotation.id}/workflow`, {
        status: newStatus,
        deliveryType: selectedQuotation.deliveryType || deliveryType,
        pickupWorkerName: selectedQuotation.pickupWorkerName || pickupWorkerName,
        notificationEmail: selectedQuotation.notificationEmail || notificationEmail,
        sendEmailNotification,
      })

      showToast(`El flujo cambió de estado a: ${newStatus}`, 'info', 'Estado Actualizado')
      const updated = await api.get(`/quotations/${selectedQuotation.id}`)
      setSelectedQuotation(updated.data)
      fetchQuotations()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al actualizar flujo', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // 4. Reconocimiento OCR de Facturas en Formato Imagen (.png, .jpg, .jpeg, .webp) o PDF
  const handleProcessInvoiceImageOrPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedQuotation) return

    setIsParsingOcr(true)
    setOcrProgressText('🔍 Leyendo imagen de Factura con motor OCR...')

    const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp)$/i)

    let extractedText = ''

    if (isImage) {
      try {
        setOcrProgressText('🖼️ Reconociendo texto de la imagen de Factura...')
        const result = await Tesseract.recognize(file, 'spa', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgressText(`🖼️ Analizando caracteres de la imagen: ${Math.round(m.progress * 100)}%`)
            }
          },
        })
        extractedText = result.data.text
      } catch (ocrErr) {
        console.warn('Error en Tesseract OCR local, reintentando con eng/fallback:', ocrErr)
        try {
          const fbResult = await Tesseract.recognize(file, 'eng')
          extractedText = fbResult.data.text
        } catch {
          showToast('No se pudo procesar la imagen de la factura. Intente con una imagen con mayor nitidez.', 'warning')
        }
      }
    } else {
      // PDF or text format fallback
      const reader = new FileReader()
      extractedText = await new Promise((resolve) => {
        reader.onload = (evt) => resolve((evt.target?.result as string) || '')
        reader.readAsText(file)
      })
    }

    if (!extractedText) {
      extractedText = file.name
    }

    try {
      setOcrProgressText('🧠 Cruzando ítems de la factura con el inventario de bodega...')
      const res = await api.post('/quotations/parse-invoice-text', {
        rawText: extractedText,
      })

      setParsedInvoiceData(res.data)
      setShowInvoiceModal(true)
      showToast('Factura leída exitosamente por OCR. Verifique las coincidencias de bodega.', 'success', 'OCR Completado')
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al analizar la factura', 'error')
    } finally {
      setIsParsingOcr(false)
      setOcrProgressText('')
    }
  }

  // 5. Eliminar Flujo Cerrado / Completado / Cancelado
  const handleConfirmDeleteQuotation = async () => {
    if (!deleteConfirmId) return
    const qId = deleteConfirmId
    setDeleteConfirmId(null)

    setActionLoadingText('Eliminando flujo de compra...')
    setIsActionLoading(true)

    try {
      await api.delete(`/quotations/${qId}`)
      showToast('El flujo de compra y sus documentos han sido eliminados del sistema.', 'success', 'Flujo Eliminado')
      setSelectedQuotation(null)
      fetchQuotations()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al eliminar el flujo de compra', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const getStatusBadge = (status: QuotationRequest['status']) => {
    switch (status) {
      case 'PENDING_QUOTE':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1 w-fit">
            <span>⏳</span> Cotización Pendiente
          </span>
        )
      case 'QUOTED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold flex items-center gap-1 w-fit">
            <span>💬</span> Cotizado
          </span>
        )
      case 'ORDER_PLACED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-semibold flex items-center gap-1 w-fit">
            <span>📄</span> Orden de Compra Subida
          </span>
        )
      case 'IN_PROCESSING':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-semibold flex items-center gap-1 w-fit">
            <span>⚙️</span> En Tramitación
          </span>
        )
      case 'READY_FOR_PICKUP':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-800 font-semibold flex items-center gap-1 w-fit">
            <span>📦</span> Listo para Retiro / Despacho
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1 w-fit">
            <span>✅</span> Facturado e Inventariado
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold flex items-center gap-1 w-fit">
            <span>🚫</span> Cancelado / Cerrado
          </span>
        )
      default:
        return null
    }
  }

  const filteredQuotations = quotations.filter((q) => {
    if (statusFilter === 'ACTIVE' && (q.status === 'COMPLETED' || q.status === 'CANCELLED')) return false
    if (statusFilter !== 'ALL' && statusFilter !== 'ACTIVE' && q.status !== statusFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      return (
        q.code.toLowerCase().includes(term) ||
        (q.customCode && q.customCode.toLowerCase().includes(term)) ||
        q.title.toLowerCase().includes(term) ||
        (q.projectName?.toLowerCase().includes(term) || false)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛍️</span> Flujo de Compras & Cotizaciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Modulo para iniciar cotizaciones, almacenar repositorio documental (Cotización, OC, Factura) e ingresar stock con OCR
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
        >
          <span>➕</span> Iniciar Flujo de Compra
        </button>
      </div>

      {/* Tabs Filter & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({quotations.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'ACTIVE'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🔥 Activos en Flujo ({quotations.filter((q) => q.status !== 'COMPLETED' && q.status !== 'CANCELLED').length})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ✅ Completados / Facturados ({quotations.filter((q) => q.status === 'COMPLETED').length})
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'CANCELLED'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🚫 Cancelados ({quotations.filter((q) => q.status === 'CANCELLED').length})
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 Buscar por código, título, proyecto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid of Purchase Workflows */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          Cargando flujos de compra...
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No hay flujos de compra registrados en esta sección.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuotations.map((q) => {
            let docsCount = 0
            if (q.documentsJson) {
              try {
                docsCount = JSON.parse(q.documentsJson).length
              } catch (e) {}
            }

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {q.customCode ? `${q.code} (${q.customCode})` : q.code}
                    </span>
                    {getStatusBadge(q.status)}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Destino: {q.destinationType === 'PROYECTO' ? `🏗️ ${q.projectName || 'Proyecto'}` : '📦 Stock de Bodega'}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">{q.title}</h3>
                  </div>

                  <div className="text-xs space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span>🚚 Entrega:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {q.deliveryType
                          ? q.deliveryType === 'RETIRO_SUCURSAL'
                            ? 'Retiro en Sucursal'
                            : 'Despacho a Domicilio'
                          : 'Por definir (Al subir OC)'}
                      </span>
                    </p>
                    {q.pickupWorkerName && (
                      <p className="text-slate-600 dark:text-slate-400">
                        👤 Responsable Retiro: <span className="font-bold text-slate-800 dark:text-slate-200">{q.pickupWorkerName}</span>
                      </p>
                    )}
                    <p className="text-slate-600 dark:text-slate-400">
                      📁 Documentos Adjuntos: <span className="font-bold text-blue-600 dark:text-blue-400">{docsCount} archivos</span>
                    </p>
                    {q.invoiceNumber && (
                      <p className="text-slate-600 dark:text-slate-400">
                        📄 Factura N°: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{q.invoiceNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">
                    {new Date(q.createdAt).toLocaleDateString('es-CL')}
                  </span>
                  <div className="flex gap-2">
                    {(q.status === 'COMPLETED' || q.status === 'CANCELLED' || user?.role === 'SUPER_ADMIN') && (
                      <button
                        onClick={() => setDeleteConfirmId(q.id)}
                        className="px-2.5 py-1.5 bg-rose-100 dark:bg-rose-950/80 text-rose-600 hover:bg-rose-200 font-bold rounded-xl transition border border-rose-300 dark:border-rose-800"
                        title="Eliminar flujo de compra"
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedQuotation(q)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow flex items-center gap-1"
                    >
                      <span>👁️</span> Abrir Flujo
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: CREAR NUEVO FLUJO DE COMPRA (Formulario Exclusivo de Cotización Inicial) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕</span> Iniciar Flujo de Compra (Cotización Inicial)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Destination selector */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDestinationType('STOCK_BODEGA')}
                  className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    destinationType === 'STOCK_BODEGA'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>📦</span> Para Stock de Bodega
                </button>
                <button
                  type="button"
                  onClick={() => setDestinationType('PROYECTO')}
                  className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    destinationType === 'PROYECTO'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>🏗️</span> Para Proyecto Específico
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Título / Nombre de la Cotización *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Cotización Abrazaderas Caddy y Conectores EMT"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    ID / Código Personalizado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="Ej: COT-ESTEC-001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {destinationType === 'PROYECTO' && (
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ej: Proyecto Edificio Central"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Initial document upload */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>📎</span> Adjuntar Documento o Planilla de Cotización (PDF, Word, Excel, Imagen)
                </label>
                <input
                  type="file"
                  onChange={handleCreateFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {newAttachmentName && (
                  <p className="text-[11px] text-emerald-600 font-semibold">✓ Adjuntado: {newAttachmentName}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Observaciones Generales
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notas adicionales para el proveedor o bodeguero..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow"
                >
                  Iniciar Flujo de Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE FLUJO & REPOSICIÓN DOCUMENTAL & OCR */}
      {selectedQuotation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] my-auto flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {selectedQuotation.customCode ? `${selectedQuotation.code} (${selectedQuotation.customCode})` : selectedQuotation.code}
                  </span>
                  {getStatusBadge(selectedQuotation.status)}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedQuotation.title}
                </h3>
              </div>
              <button onClick={() => setSelectedQuotation(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Stepper Status Bar */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className={`p-2 rounded-lg font-bold ${selectedQuotation.status === 'PENDING_QUOTE' || selectedQuotation.status === 'QUOTED' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  1. Cotización
                </div>
                <div className={`p-2 rounded-lg font-bold ${selectedQuotation.status === 'ORDER_PLACED' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  2. Orden de Compra (OC)
                </div>
                <div className={`p-2 rounded-lg font-bold ${selectedQuotation.status === 'IN_PROCESSING' || selectedQuotation.status === 'READY_FOR_PICKUP' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  3. Tramitación / Retiro
                </div>
                <div className={`p-2 rounded-lg font-bold ${selectedQuotation.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  4. Factura & Inventario
                </div>
              </div>

              {/* Documents Directory */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📂</span> Directorio de Documentos (Cotización, OC, Factura)
                </h4>

                {(() => {
                  let docs: PurchaseDocument[] = []
                  if (selectedQuotation.documentsJson) {
                    try {
                      docs = JSON.parse(selectedQuotation.documentsJson)
                    } catch (e) {}
                  }

                  if (docs.length === 0) {
                    return (
                      <p className="text-slate-400 italic">No hay documentos adjuntos en este directorio.</p>
                    )
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {doc.type}
                            </span>
                            <p className="font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[200px]">
                              {doc.name}
                            </p>
                          </div>
                          <a
                            href={doc.url}
                            download={doc.name}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md text-[11px] transition shadow"
                          >
                            ⬇️ Ver
                          </a>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Upload New Document Panel */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div>
                    <select
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="COTIZACION">Cotización</option>
                      <option value="ORDEN_COMPRA">Orden de Compra (OC)</option>
                      <option value="FACTURA">Factura de Compra</option>
                      <option value="OTRO">Otro Documento</option>
                    </select>
                  </div>

                  <div>
                    <input
                      type="file"
                      onChange={handleDocUploadSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmDocUpload}
                    className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow"
                  >
                    ➕ Adjuntar Documento
                  </button>
                </div>
              </div>

              {/* Status Update & Email Notification Action Panel */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>⚙️</span> Seguimiento de Tramitación y Retiro
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateWorkflowStatus('IN_PROCESSING')}
                    className="py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1"
                  >
                    <span>⚙️</span> Marcar "En Tramitación"
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateWorkflowStatus('READY_FOR_PICKUP')}
                    className="py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1"
                  >
                    <span>📦</span> Marcar "Materiales Listos para Retiro / Despacho"
                  </button>
                </div>
              </div>

              {/* OCR Invoice Upload & Recepción Final Panel */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <span>📄</span> Carga de Factura en Imagen / PDF con OCR de Productos
                </h4>

                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Adjunte la **imagen (.png, .jpg) o archivo de la Factura Electrónica**. El motor OCR extraerá automáticamente el Folio, RUT, Razón Social e Ítems comprados para actualizar la bodega.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="file"
                    onChange={handleProcessInvoiceImageOrPdf}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                </div>

                {isParsingOcr && (
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold text-xs animate-pulse flex items-center gap-2">
                    <span className="animate-spin text-sm">🔄</span> {ocrProgressText || 'Procesando lectura OCR de la imagen de factura...'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(selectedQuotation.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1"
              >
                <span>🗑️</span> Eliminar Flujo
              </button>

              <button
                type="button"
                onClick={() => setSelectedQuotation(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DEFINICIÓN DE RETIRO Y RESPONSABLE AL MARCAR MATERIALES LISTOS */}
      {showOcDeliveryModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📦</span> Materiales Listos: Definir Modalidad de Entrega & Responsable
              </h3>
              <button onClick={() => setShowOcDeliveryModal(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOcDelivery} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Los materiales están listos. Por favor confirme si es retiro en sucursal o despacho a domicilio, e indique el trabajador asignado para el retiro.
              </p>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Modalidad de Entrega *
                </label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  <option value="RETIRO_SUCURSAL">Retiro en Sucursal / Oficina del Proveedor</option>
                  <option value="DESPACHO_DOMICILIO">Despacho a Domicilio / Faena Obra</option>
                </select>
              </div>

              {deliveryType === 'RETIRO_SUCURSAL' && (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <label className="block font-bold mb-1 text-amber-900 dark:text-amber-300">
                    👤 Trabajador Responsable de Retiro en Sucursal *
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupWorkerName}
                    onChange={(e) => setPickupWorkerName(e.target.value)}
                    placeholder="Ej: Juan Pérez / Chofer Camioneta Layerthree"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Correo Electrónico para Notificaciones
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="ejemplo@layerthree.cl"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sendEmailCheck"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sendEmailCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Enviar correo de notificación con las instrucciones de retiro
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOcDeliveryModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow"
                >
                  Confirmar y Marcar Listo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN FACTURA Y MAPEO DE PRODUCTOS */}
      {selectedQuotation && parsedInvoiceData && (
        <InvoiceConfirmationModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          quotationId={selectedQuotation.id}
          quotationCode={selectedQuotation.code}
          parsedData={parsedInvoiceData}
          products={warehouseProducts}
          onConfirmed={() => {
            fetchQuotations()
            setSelectedQuotation(null)
          }}
        />
      )}

      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN DE FLUJO */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Eliminar Flujo de Compra"
        message="¿Estás seguro de eliminar permanentemente este flujo de compra? Se borrarán todos sus ítems y documentos adjuntos asociados."
        confirmText="Sí, Eliminar Flujo"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteQuotation}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <LoadingOverlay isOpen={isActionLoading} message={actionLoadingText} />
    </div>
  )
}
