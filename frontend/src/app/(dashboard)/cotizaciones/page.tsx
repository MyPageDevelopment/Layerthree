'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'

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

interface QuotationRequest {
  id: string
  code: string
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
  status: 'PENDING_QUOTE' | 'QUOTED' | 'APPROVED' | 'REJECTED' | 'PURCHASED'
  notes?: string
  attachmentUrl?: string
  attachmentName?: string
  bodegueroNotes?: string
  responseAttachmentUrl?: string
  responseAttachmentName?: string
  totalEstimatedCost: number
  items: QuotationItem[]
  createdAt: string
  updatedAt: string
}

type StatusFilter = 'ALL' | 'PENDING_QUOTE' | 'QUOTED' | 'APPROVED' | 'REJECTED' | 'PURCHASED'

export default function CotizacionesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [quotations, setQuotations] = useState<QuotationRequest[]>([])
  const [warehouseProducts, setWarehouseProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Nueva Cotización
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')
  const [newAttachmentName, setNewAttachmentName] = useState('')
  const [newItems, setNewItems] = useState<QuotationItem[]>([
    { productName: '', quantity: 1, unitMeasure: 'UN', linkUrl: '', itemNotes: '' },
  ])

  // Modal Detalle / Cotizar
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRequest | null>(null)
  const [quoteItemUpdates, setQuoteItemUpdates] = useState<QuotationItem[]>([])
  const [submittingQuote, setSubmittingQuote] = useState(false)

  useEffect(() => {
    setUser(getUser())
    fetchQuotations()
    fetchWarehouseProducts()
  }, [])

  const fetchWarehouseProducts = async () => {
    try {
      const res = await api.get('/products')
      if (Array.isArray(res.data)) {
        setWarehouseProducts(res.data)
      }
    } catch {
      // Ignore error if catalog fetch fails
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
      console.error('Error al cargar cotizaciones:', err)
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

  const [excelParseMessage, setExcelParseMessage] = useState('')
  const [isParsingExcel, setIsParsingExcel] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no debe superar los 10MB')
      return
    }

    const isExcelOrCsv = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Content = event.target?.result as string
      setNewAttachmentUrl(base64Content)
      setNewAttachmentName(file.name)

      if (isExcelOrCsv) {
        setIsParsingExcel(true)
        setExcelParseMessage('Analizando e identificando materiales de la planilla...')
        try {
          const res = await api.post('/quotations/parse-excel', {
            fileBase64: base64Content,
            fileName: file.name,
          })
          if (res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
            const parsed = res.data.items.map((i: any) => ({
              productName: i.productName,
              productId: i.productId || undefined,
              quantity: i.requestedQuantity || 1,
              unitMeasure: i.unitMeasure || 'UN',
              estimatedUnitPrice: 0,
              supplier: '',
              itemNotes: i.sku && i.sku !== 'N/A' ? `SKU: ${i.sku}` : '',
              linkUrl: '',
            }))
            setNewItems(parsed)
            setExcelParseMessage(`✅ Se extrajeron ${parsed.length} materiales de la planilla "${file.name}" (${res.data.matchedCount || 0} coinciden con el inventario).`)
          } else {
            setExcelParseMessage(`ℹ️ Archivo "${file.name}" adjuntado sin extracción de ítems.`)
          }
        } catch (err: any) {
          console.error('Error parseando planilla en cotizaciones:', err)
          setExcelParseMessage(`ℹ️ Archivo "${file.name}" adjuntado.`)
        } finally {
          setIsParsingExcel(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSelectWarehouseProduct = (index: number, productName: string) => {
    const matched = warehouseProducts.find(p => p.name === productName || p.sku === productName)
    const updated = [...newItems]
    updated[index].productName = productName
    if (matched) {
      updated[index].productId = matched.id
      if (matched.description && matched.description.includes('Unidad:')) {
        const u = matched.description.split('Unidad:')[1]?.split('|')[0]?.trim()
        if (u) updated[index].unitMeasure = u
      }
    }
    setNewItems(updated)
  }

  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionLoadingText, setActionLoadingText] = useState('Procesando...')

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = newItems.filter((i) => i.productName.trim().length > 0)
    if (validItems.length === 0 && !newAttachmentUrl) {
      alert('Debes ingresar al menos un producto o adjuntar un archivo de materiales.')
      return
    }

    setActionLoadingText('Enviando solicitud de cotización...')
    setIsActionLoading(true)

    try {
      await api.post('/quotations', {
        title: newTitle,
        projectName: newProjectName,
        notes: newNotes,
        attachmentUrl: newAttachmentUrl || undefined,
        attachmentName: newAttachmentName || undefined,
        items: validItems,
      })

      setShowCreateModal(false)
      setNewTitle('')
      setNewProjectName('')
      setNewNotes('')
      setNewAttachmentUrl('')
      setNewAttachmentName('')
      setNewItems([{ productName: '', quantity: 1, unitMeasure: 'UN', linkUrl: '', itemNotes: '' }])
      fetchQuotations()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear solicitud de cotización')
    } finally {
      setIsActionLoading(false)
    }
  }

  const [responseAttachmentUrl, setResponseAttachmentUrl] = useState('')
  const [responseAttachmentName, setResponseAttachmentName] = useState('')
  const [bodegueroNotes, setBodegueroNotes] = useState('')

  const handleResponseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      alert('El archivo no debe superar los 15MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setResponseAttachmentUrl(event.target?.result as string)
      setResponseAttachmentName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleOpenDetailModal = (q: QuotationRequest) => {
    setSelectedQuotation(q)
    setBodegueroNotes(q.bodegueroNotes || '')
    setResponseAttachmentUrl(q.responseAttachmentUrl || '')
    setResponseAttachmentName(q.responseAttachmentName || '')
    setQuoteItemUpdates(
      q.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitMeasure: item.unitMeasure,
        estimatedUnitPrice: item.estimatedUnitPrice || 0,
        supplier: item.supplier || '',
        itemNotes: item.itemNotes || '',
        linkUrl: item.linkUrl || '',
      })),
    )
  }

  const handleSaveBodegueroQuote = async () => {
    if (!selectedQuotation) return
    setSubmittingQuote(true)
    setActionLoadingText('Guardando cotización y enviando notificaciones...')
    setIsActionLoading(true)
    try {
      const itemsPayload = quoteItemUpdates.map((item) => ({
        id: item.id,
        estimatedUnitPrice: Number(item.estimatedUnitPrice || 0),
        supplier: item.supplier || '',
        itemNotes: item.itemNotes || '',
      }))

      const totalEst = quoteItemUpdates.reduce((sum, i) => sum + (i.quantity || 0) * (i.estimatedUnitPrice || 0), 0)

      await api.patch(`/quotations/${selectedQuotation.id}/quote`, {
        bodegueroNotes,
        responseAttachmentUrl: responseAttachmentUrl || undefined,
        responseAttachmentName: responseAttachmentName || undefined,
        totalEstimatedCost: totalEst,
        itemUpdates: itemsPayload,
      })

      alert('Cotización guardada y notificada al Jefe de Proyecto por email y sistema.')
      setSelectedQuotation(null)
      fetchQuotations()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar cotización')
    } finally {
      setSubmittingQuote(false)
      setIsActionLoading(false)
    }
  }

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED' | 'PURCHASED') => {
    if (!selectedQuotation) return
    try {
      await api.patch(`/quotations/${selectedQuotation.id}/status`, { status })
      alert(`Estado de la cotización actualizado.`)
      setSelectedQuotation(null)
      fetchQuotations()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar estado')
    }
  }

  const getStatusBadge = (status: QuotationRequest['status']) => {
    switch (status) {
      case 'PENDING_QUOTE':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1 w-fit">
            <span>⏳</span> Pendiente de Cotizar
          </span>
        )
      case 'QUOTED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold flex items-center gap-1 w-fit">
            <span>💬</span> Cotizado por Bodega
          </span>
        )
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1 w-fit">
            <span>✅</span> Aprobado
          </span>
        )
      case 'PURCHASED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-semibold flex items-center gap-1 w-fit">
            <span>🛒</span> Comprado
          </span>
        )
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 text-xs rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold flex items-center gap-1 w-fit">
            <span>❌</span> Rechazado
          </span>
        )
      default:
        return null
    }
  }

  const filteredQuotations = quotations.filter((q) => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      return (
        q.code.toLowerCase().includes(term) ||
        q.title.toLowerCase().includes(term) ||
        (q.projectName?.toLowerCase().includes(term) || false) ||
        (q.requestedBy?.name?.toLowerCase().includes(term) || false)
      )
    }
    return true
  })

  const isBodegueroOrAdmin = Boolean(
    user?.role === 'BODEGUERO' || user?.role === 'SUPER_ADMIN' || user?.role === 'GERENTE'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📝</span> Cotizaciones de Materiales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Modulo de búsqueda y valorización de materiales entre el Jefe de Proyecto y el Bodeguero.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-lg transition active:scale-95 flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
        >
          <span>+</span> Nueva Cotización
        </button>
      </div>

      {/* Tabs Filter & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas ({quotations.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_QUOTE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'PENDING_QUOTE'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pendientes ({quotations.filter((q) => q.status === 'PENDING_QUOTE').length})
          </button>
          <button
            onClick={() => setStatusFilter('QUOTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'QUOTED'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cotizadas ({quotations.filter((q) => q.status === 'QUOTED').length})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Aprobadas ({quotations.filter((q) => q.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setStatusFilter('PURCHASED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'PURCHASED'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Compradas ({quotations.filter((q) => q.status === 'PURCHASED').length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por código, título, proyecto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* List / Cards View */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          Cargando cotizaciones...
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No hay solicitudes de cotización registradas en esta vista.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotations.map((q) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {q.code}
                  </span>
                  {getStatusBadge(q.status)}
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{q.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proyecto: <span className="font-semibold text-slate-700 dark:text-slate-300">{q.projectName || 'Sin Proyecto'}</span>
                  </p>
                </div>

                <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-600 dark:text-slate-400">
                    Solicitado por: <span className="font-semibold text-slate-800 dark:text-slate-200">{q.requestedBy?.name || q.requestedBy?.email}</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Ítems a Cotizar: <span className="font-bold text-slate-900 dark:text-white">{q.items.length}</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Costo Total Est.:{' '}
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${(q.totalEstimatedCost || 0).toLocaleString('es-CL')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  {new Date(q.createdAt).toLocaleDateString('es-CL')}
                </span>
                <button
                  onClick={() => handleOpenDetailModal(q)}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-semibold rounded-xl transition border border-blue-200 dark:border-blue-800"
                >
                  {isBodegueroOrAdmin && q.status === 'PENDING_QUOTE' ? '💬 Cotizar Materiales' : '👁️ Ver Detalle'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUEVA COTIZACIÓN */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📝</span> Nueva Solicitud de Cotización
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Título de la Solicitud
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Materiales Eléctricos Edificio Norte"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Nombre o Código del Proyecto
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ej: PROJ-2026-A1"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Notas u Observaciones Generales
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Detalles sobre plazo de entrega o prioridad..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* File Attachment Upload */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>📎</span> Adjuntar Lista o Documento de Materiales (PDF, Excel, Imagen, etc.)
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {newAttachmentName && (
                  <div className="flex items-center justify-between text-xs bg-blue-100 dark:bg-blue-950/80 px-3 py-1.5 rounded-lg text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <span className="truncate font-mono">📄 {newAttachmentName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewAttachmentUrl('')
                        setNewAttachmentName('')
                        setExcelParseMessage('')
                      }}
                      className="text-red-500 hover:text-red-700 font-bold ml-2"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                )}
                {isParsingExcel && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold animate-pulse flex items-center gap-1.5 pt-1">
                    <span className="animate-spin">🔄</span> Analizando e identificando materiales de la planilla...
                  </div>
                )}
                {excelParseMessage && !isParsingExcel && (
                  <div className="text-xs p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold">
                    {excelParseMessage}
                  </div>
                )}
              </div>

              {/* Datalist for autocomplete */}
              <datalist id="warehouse-products-list">
                {warehouseProducts.map((p) => (
                  <option key={p.id} value={p.name}>
                    Stock en bodega: {p.stock} | Categoría: {p.category}
                  </option>
                ))}
              </datalist>

              {/* Items List */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Ítems Solicitados (Catálogo / Manual)</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    + Agregar Ítem
                  </button>
                </div>

                <div className="space-y-3">
                  {newItems.map((item, index) => {
                    const matchedProduct = warehouseProducts.find(
                      (p) => p.name.toLowerCase() === item.productName.toLowerCase() || p.id === item.productId,
                    )
                    return (
                      <div
                        key={index}
                        className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 relative"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 sm:col-span-6">
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-semibold text-slate-500">Material / Producto</label>
                              {matchedProduct && (
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                  📦 Stock: {matchedProduct.stock}
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              list="warehouse-products-list"
                              placeholder="Escribe o selecciona de bodega..."
                              value={item.productName}
                              onChange={(e) => handleSelectWarehouseProduct(index, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            />
                          </div>

                          <div className="col-span-5 sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-slate-500">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...newItems]
                                updated[index].quantity = Number(e.target.value)
                                setNewItems(updated)
                              }}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            />
                          </div>

                          <div className="col-span-5 sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-500">Unidad</label>
                            <select
                              value={item.unitMeasure}
                              onChange={(e) => {
                                const updated = [...newItems]
                                updated[index].unitMeasure = e.target.value
                                setNewItems(updated)
                              }}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            >
                              <option value="UN">UN</option>
                              <option value="TIRA">TIRA</option>
                              <option value="MTS">MTS</option>
                              <option value="ROLLOS">ROLLOS</option>
                              <option value="CAJAS">CAJAS</option>
                            </select>
                          </div>

                          {newItems.length > 1 && (
                            <div className="col-span-2 sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(index)}
                                className="text-red-500 hover:text-red-700 text-sm font-bold p-1"
                                title="Eliminar fila"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <input
                          type="url"
                          placeholder="Link de referencia (opcional)"
                          value={item.linkUrl || ''}
                          onChange={(e) => {
                            const updated = [...newItems]
                            updated[index].linkUrl = e.target.value
                            setNewItems(updated)
                          }}
                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Especificación / Nota del ítem (opcional)"
                          value={item.itemNotes || ''}
                          onChange={(e) => {
                            const updated = [...newItems]
                            updated[index].itemNotes = e.target.value
                            setNewItems(updated)
                          }}
                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow"
                >
                  Enviar al Bodeguero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE & COTIZACIÓN POR BODEGUERO */}
      {selectedQuotation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {selectedQuotation.code}
                  </span>
                  {getStatusBadge(selectedQuotation.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedQuotation.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Proyecto:</p>
                <p className="font-bold text-slate-900 dark:text-white">{selectedQuotation.projectName || 'Sin Proyecto'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Solicitante (Jefe de Proyecto):</p>
                <p className="font-bold text-slate-900 dark:text-white">{selectedQuotation.requestedBy?.name || selectedQuotation.requestedBy?.email}</p>
              </div>
              {selectedQuotation.notes && (
                <div className="col-span-2">
                  <p className="text-slate-500 dark:text-slate-400">Observaciones Generales:</p>
                  <p className="text-slate-800 dark:text-slate-200">{selectedQuotation.notes}</p>
                </div>
              )}
              {selectedQuotation.attachmentUrl && (
                <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">📄 Archivo Adjunto de Materiales:</span>
                  <a
                    href={selectedQuotation.attachmentUrl}
                    download={selectedQuotation.attachmentName || 'materiales.pdf'}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition text-xs flex items-center gap-1 shadow"
                  >
                    <span>⬇️ Descargar / Ver ({selectedQuotation.attachmentName || 'Adjunto'})</span>
                  </a>
                </div>
              )}
            </div>

            {/* Formulario / Tabla de Ítems */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Ítems de Cotización
              </h4>

              <div className="space-y-3">
                {quoteItemUpdates.map((item, idx) => {
                  const matchedProduct = warehouseProducts.find(
                    (p) => p.name.toLowerCase() === item.productName.toLowerCase() || p.id === item.productId,
                  )
                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                              {item.productName}
                            </h5>
                            {matchedProduct ? (
                              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded">
                                📦 Stock en Bodega: {matchedProduct.stock} {item.unitMeasure}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold px-2 py-0.5 rounded">
                                ℹ️ No registrado en catálogo
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">
                            Cantidad Solicitada: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.quantity} {item.unitMeasure}</span>
                          </p>
                        </div>
                        {item.linkUrl && (
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline text-xs flex items-center gap-1 font-semibold"
                          >
                            🔗 Referencia
                          </a>
                        )}
                      </div>

                    {isBodegueroOrAdmin && (selectedQuotation.status === 'PENDING_QUOTE' || selectedQuotation.status === 'QUOTED') ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Precio Unitario ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.estimatedUnitPrice === 0 || !item.estimatedUnitPrice ? '' : item.estimatedUnitPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const updated = [...quoteItemUpdates]
                              updated[idx].estimatedUnitPrice = e.target.value === '' ? 0 : Number(e.target.value)
                              setQuoteItemUpdates(updated)
                            }}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Proveedor Sugerido</label>
                          <input
                            type="text"
                            placeholder="Ej: Sodimac / Estec"
                            value={item.supplier || ''}
                            onChange={(e) => {
                              const updated = [...quoteItemUpdates]
                              updated[idx].supplier = e.target.value
                              setQuoteItemUpdates(updated)
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Subtotal Est.</label>
                          <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                            ${((item.quantity || 0) * (item.estimatedUnitPrice || 0)).toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Precio Unitario:</span>
                          <span className="font-mono font-bold">${(item.estimatedUnitPrice || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Proveedor:</span>
                          <span className="font-semibold">{item.supplier || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Subtotal:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${((item.quantity || 0) * (item.estimatedUnitPrice || 0)).toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              </div>

              {/* Sección Respuesta del Bodeguero (Comentarios y Adjunto de Cotización) */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📄</span> Respuesta y Documentación del Bodeguero
                </h5>

                {isBodegueroOrAdmin && (selectedQuotation.status === 'PENDING_QUOTE' || selectedQuotation.status === 'QUOTED') ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Comentarios / Observaciones del Bodeguero:
                      </label>
                      <textarea
                        value={bodegueroNotes}
                        onChange={(e) => setBodegueroNotes(e.target.value)}
                        placeholder="Ej: Precios sujetos a confirmación de stock. Incluye despacho a faena..."
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Adjuntar Documento / PDF / Excel de Cotización de Proveedor:
                      </label>
                      <input
                        type="file"
                        onChange={handleResponseFileChange}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                      />
                      {responseAttachmentName && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ✓ Archivo Adjuntado: {responseAttachmentName}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {selectedQuotation.bodegueroNotes ? (
                      <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {selectedQuotation.bodegueroNotes}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">Sin comentarios adicionales del bodeguero.</p>
                    )}

                    {selectedQuotation.responseAttachmentUrl && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Documento de Cotización Adjunto:</span>
                        <a
                          href={selectedQuotation.responseAttachmentUrl}
                          download={selectedQuotation.responseAttachmentName || 'cotizacion_bodega.pdf'}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-xs flex items-center gap-1 shadow"
                        >
                          <span>⬇️ Descargar ({selectedQuotation.responseAttachmentName || 'Cotización'})</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Costo Total Estimado:</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-300 font-mono">
                  $
                  {quoteItemUpdates
                    .reduce((sum, i) => sum + (i.quantity || 0) * (i.estimatedUnitPrice || 0), 0)
                    .toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedQuotation(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
              >
                Cerrar
              </button>

              <div className="flex flex-wrap gap-2">
                {isBodegueroOrAdmin && (selectedQuotation.status === 'PENDING_QUOTE' || selectedQuotation.status === 'QUOTED') && (
                  <button
                    type="button"
                    disabled={submittingQuote}
                    onClick={handleSaveBodegueroQuote}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow"
                  >
                    {submittingQuote ? 'Guardando...' : '💬 Guardar y Enviar Cotización'}
                  </button>
                )}

                {(user?.role === 'JEFE_PROYECTO' || user?.role === 'SUPER_ADMIN' || user?.role === 'GERENTE') && (
                  <>
                    {selectedQuotation.status === 'QUOTED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('APPROVED')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow"
                      >
                        ✅ Aprobar Cotización
                      </button>
                    )}
                    {selectedQuotation.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('PURCHASED')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow"
                      >
                        🛒 Marcar como Comprado
                      </button>
                    )}
                    {selectedQuotation.status !== 'REJECTED' && selectedQuotation.status !== 'PURCHASED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('REJECTED')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow"
                      >
                        ❌ Rechazar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay isOpen={isActionLoading} message={actionLoadingText} />
    </div>
  )
}
