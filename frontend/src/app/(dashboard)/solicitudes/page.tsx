'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User, Product } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'
import ConfirmModal from '@/components/ConfirmModal'
import { downloadFile } from '@/lib/download'

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
  recipientEmail?: string
  photoUrl?: string
  attachmentUrl?: string
  attachmentName?: string
  deliveryDocUrl?: string
  deliveryDocName?: string
  hasPhoto?: boolean
  hasAttachment?: boolean
  hasDeliveryDoc?: boolean
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

function isToolItem(item: RequestItem): boolean {
  if (!item.product) {
    const name = (item.productName || '').toLowerCase().trim()
    return (
      name.includes('fusionadora') ||
      name.includes('empalmadora') ||
      name.includes('taladro') ||
      name.includes('multimetro') ||
      name.includes('multímetro') ||
      name.includes('otdr') ||
      name.includes('certificador') ||
      name.includes('cleaver') ||
      name.includes('peladora') ||
      name.includes('prensaterminal') ||
      name.includes('cortadora') ||
      name.includes('escalera') ||
      name.includes('herramienta')
    )
  }

  const prod = item.product
  const category = (prod.category || '').toUpperCase()
  const subcategory = (prod.subcategory || '').toLowerCase().trim()
  const name = (prod.name || item.productName || '').toLowerCase().trim()

  if (category === 'HERRAMIENTAS' || subcategory.includes('herramienta')) {
    return true
  }

  if (
    name.includes('fusionadora') ||
    name.includes('empalmadora') ||
    name.includes('taladro') ||
    name.includes('multimetro') ||
    name.includes('multímetro') ||
    name.includes('otdr') ||
    name.includes('certificador') ||
    name.includes('cleaver') ||
    name.includes('peladora') ||
    name.includes('prensaterminal') ||
    name.includes('cortadora') ||
    name.includes('escalera')
  ) {
    if (!subcategory.includes('insumo') && !subcategory.includes('material')) {
      return true
    }
  }

  return false
}

// Normalización de texto sin acentos/tildes para búsqueda precisa
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function SolicitudesPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // View Mode & Filtering States
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED' | 'REJECTED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCardItems, setExpandedCardItems] = useState<Record<string, boolean>>({})

  // Paginación (Ver 6 primero y continuar - Control de sobrecarga)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [cardsPerPage, setCardsPerPage] = useState<number>(6)
  const [tablePage, setTablePage] = useState<number>(1)
  const TABLE_ITEMS_PER_PAGE = 10

  // Create Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  
  // Multi-format Attachment State for Request (Image / Screenshot / Excel / PDF)
  const [uploadedAttachmentUrl, setUploadedAttachmentUrl] = useState('')
  const [uploadedAttachmentName, setUploadedAttachmentName] = useState('')
  const [isParsingExcel, setIsParsingExcel] = useState(false)
  const [excelParseMessage, setExcelParseMessage] = useState('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [zoomedAttachment, setZoomedAttachment] = useState<{ url: string; title: string } | null>(null)

  // Product Search & Filter inside modal (Buscador Inteligente)
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS')
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<string>('TODAS')

  // Selected items: map of productId -> quantity
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({})

  // Dispatch Modal State (For Bodeguero)
  const [dispatchRequest, setDispatchRequest] = useState<MaterialRequest | null>(null)
  const [dispatchItemsList, setDispatchItemsList] = useState<any[]>([])
  const [dispatchRemovedIds, setDispatchRemovedIds] = useState<string[]>([])
  const [showAddProductToDispatch, setShowAddProductToDispatch] = useState(false)
  const [dispatchAddSearch, setDispatchAddSearch] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [deliveryDocUrl, setDeliveryDocUrl] = useState('')
  const [deliveryDocName, setDeliveryDocName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [vans, setVans] = useState<any[]>([])
  const [systemUsers, setSystemUsers] = useState<any[]>([])
  const [selectedVanId, setSelectedVanId] = useState<string>('')
  const [itemChecks, setItemChecks] = useState<Record<string, { isChecked: boolean; quantity: number; serialNumber?: string }>>({})

  // Items Dropdown state for Table View
  const [openItemsDropdownId, setOpenItemsDropdownId] = useState<string | null>(null)

  // Supplier Quote Modal State (For Bodeguero for missing items)
  const [showSupplierQuoteModal, setShowSupplierQuoteModal] = useState(false)
  const [supplierQuoteRequest, setSupplierQuoteRequest] = useState<MaterialRequest | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [supplierNotes, setSupplierNotes] = useState('')

  // Proof Photo View Modal
  const [viewPhotoRequest, setViewPhotoRequest] = useState<MaterialRequest | null>(null)

  // Request Deletion Confirm State
  const [deleteConfirmRequestId, setDeleteConfirmRequestId] = useState<string | null>(null)

  useEffect(() => {
    setCurrentUser(getUser())
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('layerthree_solicitudes_view_mode')
      if (saved === 'cards' || saved === 'table') {
        setViewMode(saved)
      }
    }
    fetchData()
  }, [])

  const handleToggleView = (mode: 'cards' | 'table') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('layerthree_solicitudes_view_mode', mode)
    }
  }

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

  // Subcategorías dinámicas según la categoría seleccionada en el modal
  const availableSubcategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (selectedCategoryFilter === 'TODOS' || p.category === selectedCategoryFilter) {
        if (p.subcategory && p.subcategory.trim()) {
          set.add(p.subcategory.trim())
        }
      }
    })
    return Array.from(set).sort()
  }, [products, selectedCategoryFilter])

  // Buscador inteligente multi-palabra y normalizado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategoryFilter !== 'TODOS' && p.category !== selectedCategoryFilter) {
        return false
      }
      if (selectedSubcategoryFilter !== 'TODAS' && p.subcategory !== selectedSubcategoryFilter) {
        return false
      }
      if (productSearch.trim()) {
        const normQuery = normalizeText(productSearch.trim())
        const searchTokens = normQuery.split(/\s+/).filter(Boolean)
        const searchableText = normalizeText(
          `${p.sku} ${p.name} ${p.description || ''} ${p.category || ''} ${p.subcategory || ''} ${p.supplierCode || ''}`
        )
        const matchesAllTokens = searchTokens.every((token) => searchableText.includes(token))
        if (!matchesAllTokens) return false
      }
      return true
    })
  }, [products, productSearch, selectedCategoryFilter, selectedSubcategoryFilter])

  // Buscador inteligente para agregar productos directamente al despacho
  const filteredDispatchProducts = useMemo(() => {
    if (!dispatchAddSearch.trim()) return products.slice(0, 15)
    const normQuery = normalizeText(dispatchAddSearch.trim())
    const searchTokens = normQuery.split(/\s+/).filter(Boolean)
    return products
      .filter((p) => {
        const searchableText = normalizeText(
          `${p.sku} ${p.name} ${p.description || ''} ${p.category || ''} ${p.subcategory || ''} ${p.supplierCode || ''}`
        )
        return searchTokens.every((token) => searchableText.includes(token))
      })
      .slice(0, 20)
  }, [products, dispatchAddSearch])

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

  const processAttachedFile = async (file: File, customName?: string) => {
    const fileName = customName || file.name || 'adjunto'
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName)
    const isExcel = /\.(xlsx|xlsm|xls|csv)$/i.test(fileName)

    if (isExcel) {
      setIsParsingExcel(true)
      setExcelParseMessage('')

      try {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const base64 = event.target?.result as string
          setUploadedAttachmentUrl(base64)
          setUploadedAttachmentName(fileName)

          try {
            const res = await api.post('/requests/parse-excel', {
              fileBase64: base64,
              fileName: fileName,
            })

            const parsedItems: Array<{
              productId?: string | null
              sku?: string | null
              productName: string
              requestedQuantity: number
              unitMeasure?: string
            }> = res.data?.items || []

            if (parsedItems.length === 0) {
              setExcelParseMessage(`📄 Se adjuntó la planilla "${fileName}" a la solicitud.`)
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
            setExcelParseMessage(`✅ ¡Éxito! Se interpretaron ${parsedItems.length} ítems desde "${fileName}" (${matchedCount} vinculados al inventario) y se transcribieron a la solicitud.`)
          } catch (err: any) {
            setExcelParseMessage(`📄 Se adjuntó "${fileName}" a la solicitud para que el bodeguero pueda revisarla.`)
          } finally {
            setIsParsingExcel(false)
          }
        }
        reader.readAsDataURL(file)
      } catch (err: any) {
        setIsParsingExcel(false)
        alert('Error al leer la planilla.')
      }
      return
    }

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDim = 1600
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
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
          setUploadedAttachmentUrl(compressedBase64)
          setUploadedAttachmentName(fileName)
          setExcelParseMessage(`🖼️ Imagen / Pantallazo adjuntado con éxito ("${fileName}").`)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
      return
    }

    // Any other file format (PDF, etc.)
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setUploadedAttachmentUrl(base64)
      setUploadedAttachmentName(fileName)
      setExcelParseMessage(`📄 Documento adjuntado con éxito ("${fileName}").`)
    }
    reader.readAsDataURL(file)
  }

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processAttachedFile(file)
    }
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAttachedFile(e.dataTransfer.files[0])
    }
  }

  // Handle Clipboard Paste (Ctrl + V for screenshots anywhere when modal is open)
  const handlePasteEvent = useCallback((e: ClipboardEvent) => {
    if (!showCreateModal) return
    const clipboardItems = e.clipboardData?.items
    if (!clipboardItems) return

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
          processAttachedFile(file, `pantallazo_${timeStr}.png`)
          break
        }
      }
    }
  }, [showCreateModal, selectedProductQuantities, products])

  useEffect(() => {
    const listener = (e: ClipboardEvent) => handlePasteEvent(e)
    window.addEventListener('paste', listener)
    return () => window.removeEventListener('paste', listener)
  }, [handlePasteEvent])

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
        projectId: projectName,
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
          setDeliveryDocUrl(compressedBase64)
          setDeliveryDocName('foto_comprobante.jpg')
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Delivery Certificate (PDF or Image)
  const handleDeliveryDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName)

    if (isPdf) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setDeliveryDocUrl(base64)
        setDeliveryDocName(fileName)
        setPhotoUrl('')
        setPhotoPreview('')
      }
      reader.readAsDataURL(file)
      e.target.value = ''
      return
    }

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDim = 1400
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
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
          setDeliveryDocUrl(compressedBase64)
          setDeliveryDocName(fileName)
          setPhotoUrl(compressedBase64)
          setPhotoPreview(compressedBase64)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setDeliveryDocUrl(base64)
      setDeliveryDocName(fileName)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const [dispatchError, setDispatchError] = useState('')

  // Handle Opening Dispatch Modal for Bodeguero
  const handleOpenDispatchModal = async (req: MaterialRequest) => {
    setDispatchRequest(req)
    setDispatchItemsList([...req.items])
    setDispatchRemovedIds([])
    setShowAddProductToDispatch(false)
    setDispatchAddSearch('')
    setRecipientName('')
    setRecipientEmail('')
    setDispatchNotes('')
    setDeliveryDocUrl('')
    setDeliveryDocName('')
    setPhotoUrl('')
    setPhotoPreview('')
    setDispatchError('')

    const initialChecks: Record<string, { isChecked: boolean; quantity: number; serialNumber?: string }> = {}
    req.items.forEach(item => {
      initialChecks[item.id] = {
        isChecked: true,
        quantity: item.requestedQuantity,
        serialNumber: (item as any).serialNumber || '',
      }
    })
    setItemChecks(initialChecks)

    // Si la solicitud tiene adjunto o foto truncada, cargar en segundo plano la data completa
    if (req.attachmentUrl === 'HAS_ATTACHMENT' || req.photoUrl === 'HAS_PHOTO' || req.deliveryDocUrl === 'HAS_DELIVERY_DOC' || (!req.attachmentUrl && req.hasAttachment)) {
      try {
        const res = await api.get<MaterialRequest>(`/requests/${req.id}`)
        if (res.data) {
          setDispatchRequest(res.data)
        }
      } catch (e) {
        console.error('Error cargando detalle completo para despacho:', e)
      }
    }
  }

  const handleAddProductToDispatchChecklist = (product: Product) => {
    const tempId = `new-${product.id}-${Date.now()}`
    const newItem = {
      id: tempId,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      requestedQuantity: 1,
      deliveredQuantity: 1,
      unitMeasure: product.unit || 'UN',
      product: product,
    }
    setDispatchItemsList(prev => [...prev, newItem])
    setItemChecks(prev => ({
      ...prev,
      [tempId]: { isChecked: true, quantity: 1, serialNumber: product.serialNumber || '' },
    }))
    setShowAddProductToDispatch(false)
  }

  const handleRemoveItemFromDispatchChecklist = (itemId: string) => {
    if (!itemId.startsWith('new-')) {
      setDispatchRemovedIds(prev => [...prev, itemId])
    }
    setDispatchItemsList(prev => prev.filter(i => i.id !== itemId))
    setItemChecks(prev => {
      const copy = { ...prev }
      delete copy[itemId]
      return copy
    })
  }

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchRequest) return
    setDispatchError('')

    if (!recipientName.trim()) {
      setDispatchError('Debes ingresar el nombre de la persona responsable que recibe los materiales')
      return
    }

    const itemsPayload = Object.entries(itemChecks).map(([itemId, val]) => {
      const itemObj = dispatchItemsList.find(i => i.id === itemId)
      return {
        itemId: itemId.startsWith('new-') ? undefined : itemId,
        productId: itemObj?.productId || itemObj?.product?.id,
        productName: itemObj?.productName || itemObj?.product?.name,
        sku: itemObj?.sku || itemObj?.product?.sku,
        unitMeasure: itemObj?.unitMeasure || itemObj?.product?.unit,
        isChecked: val.isChecked,
        deliveredQuantity: val.quantity,
        serialNumber: val.serialNumber || undefined,
      }
    })

    setActionLoadingText('Procesando despacho y actualizando inventarios...')
    setIsActionLoading(true)

    try {
      await api.patch(`/requests/${dispatchRequest.id}/dispatch`, {
        recipientName,
        recipientEmail: recipientEmail.trim() || undefined,
        photoUrl: photoUrl || (deliveryDocUrl.startsWith('data:image/') ? deliveryDocUrl : undefined),
        deliveryDocUrl: deliveryDocUrl || undefined,
        deliveryDocName: deliveryDocName || undefined,
        vanId: selectedVanId || undefined,
        notes: dispatchNotes,
        items: itemsPayload,
        removedItemIds: dispatchRemovedIds,
      })

      setDispatchRequest(null)
      fetchData()
    } catch (err: any) {
      setDispatchError(err.response?.data?.message || 'Error al procesar el despacho')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle Reject Request
  const handleRejectRequest = async (id: string) => {
    setActionLoadingText('Rechazando / Cancelando solicitud...')
    setIsActionLoading(true)
    try {
      await api.patch(`/requests/${id}/reject`, { reason: 'Rechazada por el usuario en solicitudes' })
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al rechazar la solicitud')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle Delete Request
  const handleConfirmDeleteRequest = async () => {
    if (!deleteConfirmRequestId) return
    const reqId = deleteConfirmRequestId
    setDeleteConfirmRequestId(null)

    setActionLoadingText('Eliminando solicitud...')
    setIsActionLoading(true)
    try {
      await api.delete(`/requests/${reqId}`)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar la solicitud')
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

  // Filtered requests by Status tab and Search query
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false
      }

      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchCode = r.code.toLowerCase().includes(query)
        const matchProject = (r.projectName || '').toLowerCase().includes(query)
        const matchRequester = (r.requestedBy?.name || '').toLowerCase().includes(query) || (r.requestedBy?.email || '').toLowerCase().includes(query)
        const matchRecipient = (r.recipientName || '').toLowerCase().includes(query)
        const matchNotes = (r.notes || '').toLowerCase().includes(query)
        const matchItems = (r.items || []).some(
          (i) =>
            (i.product?.name || i.productName || '').toLowerCase().includes(query) ||
            (i.product?.sku || i.sku || '').toLowerCase().includes(query)
        )
        return matchCode || matchProject || matchRequester || matchRecipient || matchNotes || matchItems
      }

      return true
    })
  }, [requests, statusFilter, searchTerm])

  // Reset de páginas al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
    setTablePage(1)
  }, [statusFilter, searchTerm, cardsPerPage])

  const totalCardPages = Math.ceil(filteredRequests.length / cardsPerPage) || 1
  const paginatedCardRequests = useMemo(() => {
    const start = (currentPage - 1) * cardsPerPage
    return filteredRequests.slice(start, start + cardsPerPage)
  }, [filteredRequests, currentPage, cardsPerPage])

  const totalTablePages = Math.ceil(filteredRequests.length / TABLE_ITEMS_PER_PAGE) || 1
  const paginatedTableRequests = useMemo(() => {
    const start = (tablePage - 1) * TABLE_ITEMS_PER_PAGE
    return filteredRequests.slice(start, start + TABLE_ITEMS_PER_PAGE)
  }, [filteredRequests, tablePage])

  const handleOpenPhotoViewer = async (r: MaterialRequest) => {
    const isTruncated =
      r.deliveryDocUrl === 'HAS_DELIVERY_DOC' ||
      r.photoUrl === 'HAS_PHOTO' ||
      (!r.deliveryDocUrl && !r.photoUrl && (r.hasDeliveryDoc || r.hasPhoto))

    if (isTruncated) {
      try {
        setActionLoadingText('Cargando acta y comprobante de entrega...')
        setIsActionLoading(true)
        const res = await api.get<MaterialRequest>(`/requests/${r.id}`)
        setViewPhotoRequest(res.data)
      } catch {
        setViewPhotoRequest(r)
      } finally {
        setIsActionLoading(false)
      }
    } else {
      setViewPhotoRequest(r)
    }
  }

  const handleOpenAttachment = async (r: MaterialRequest) => {
    let attachmentUrl = r.attachmentUrl
    let attachmentName = r.attachmentName

    if (!attachmentUrl || attachmentUrl === 'HAS_ATTACHMENT') {
      try {
        setActionLoadingText('Cargando adjunto / pantallazo...')
        setIsActionLoading(true)
        const res = await api.get<MaterialRequest>(`/requests/${r.id}`)
        attachmentUrl = res.data.attachmentUrl
        attachmentName = res.data.attachmentName
      } catch (e) {
        console.error('Error cargando adjunto:', e)
      } finally {
        setIsActionLoading(false)
      }
    }

    if (!attachmentUrl) return

    const isImg =
      attachmentUrl.startsWith('data:image/') ||
      /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(attachmentName || '') ||
      attachmentName?.toLowerCase().includes('pantallazo') ||
      !attachmentName?.includes('.')

    if (isImg) {
      setZoomedAttachment({
        url: attachmentUrl,
        title: `Adjunto ${r.code} - ${attachmentName || 'Comprobante / Pantallazo'}`,
      })
    } else {
      downloadFile(attachmentUrl, attachmentName || `adjunto_${r.code}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span>📑</span> Solicitudes y Pedidos de Materiales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Flujo de pedido por proyecto, comprobante fotográfico de entrega y trazabilidad de despacho.
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

      {/* Top Toolbar: Status Filter Tabs, Search Bar and View Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>⏳</span> Pendientes ({requests.filter((r) => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setStatusFilter('DISPATCHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              statusFilter === 'DISPATCHED'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>✅</span> Despachadas ({requests.filter((r) => r.status === 'DISPATCHED').length})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🚫</span> Rechazadas ({requests.filter((r) => r.status === 'REJECTED').length})
          </button>
        </div>

        {/* Search Input & View Switcher (Tarjetas vs Tabla) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="🔍 Buscar solicitud, proyecto, ítem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleView('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Vista tipo Tarjeta (estilo Cotizaciones)"
            >
              <span>🗂️</span> Tarjetas
            </button>
            <button
              type="button"
              onClick={() => handleToggleView('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Vista tipo Tabla / Lista"
            >
              <span>📋</span> Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            Cargando solicitudes...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-4xl block mb-2">📑</span>
            <p className="font-semibold text-lg">No se encontraron solicitudes</p>
            <p className="text-sm">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Prueba modificando los filtros o el término de búsqueda.'
                : 'Las solicitudes de materiales creadas por los Jefes de Proyecto aparecerán aquí.'}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* ============================================================
             VISTA TARJETAS (CARD GRID - SIMILAR A COTIZACIONES)
             ============================================================ */
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedCardRequests.map((r) => {
              const isExpanded = !!expandedCardItems[r.id]
              const hasMissingStock = r.items.some(
                (item) => !isToolItem(item) && (item.product?.stock ?? 0) < item.requestedQuantity
              )
              const isHighlighted = highlightId === r.id
              const totalUnits = r.items.reduce((sum, i) => sum + (i.requestedQuantity || 0), 0)

              return (
                <div
                  key={r.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 ${
                    isHighlighted
                      ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50/10 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top: Code & Status Badge */}
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                        {r.code}
                      </span>
                      {r.status === 'PENDING' ? (
                        <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          ⏳ Pendiente Despacho
                        </span>
                      ) : r.status === 'REJECTED' ? (
                        <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                          🚫 Rechazada
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <span>✓</span> Despachada
                        </span>
                      )}
                    </div>

                    {/* Project Title */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Proyecto Asignado
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                        🏗️ {r.projectName || 'Proyecto General'}
                      </h3>
                    </div>

                    {/* Info Card Box (Similar to Cotizaciones) */}
                    <div className="text-xs space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {/* Requester & Date */}
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>👤</span> <strong className="text-slate-800 dark:text-slate-200">{r.requestedBy?.name || r.requestedBy?.email || 'Usuario'}</strong>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString('es-CL')}
                        </span>
                      </div>

                      {/* Items counter */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400">📦 Total Requerido:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {r.items.length} {r.items.length === 1 ? 'ítem' : 'ítems'} ({totalUnits} unid.)
                        </span>
                      </div>

                      {/* Dispatch Delivery Info */}
                      {r.recipientName && (
                        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Receptor:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">👤 {r.recipientName}</span>
                          </div>
                          {r.recipientEmail && (
                            <div className="flex justify-between items-center text-[11px] text-blue-600 dark:text-blue-400">
                              <span>Correo:</span>
                              <span className="font-mono truncate max-w-[170px]" title={r.recipientEmail}>✉️ {r.recipientEmail}</span>
                            </div>
                          )}
                          {r.van && (
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <span>Camioneta:</span>
                              <span>🛻 {r.van.plate} ({r.van.name})</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attachment file preview button */}
                      {(r.attachmentUrl || r.hasAttachment) && (
                        <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-slate-500">Archivo Adjunto:</span>
                          {(r.attachmentUrl && r.attachmentUrl.startsWith('data:image/')) ||
                          /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(r.attachmentName || '') ||
                          r.attachmentName?.toLowerCase().includes('pantallazo') ||
                          !r.attachmentName?.includes('.') ? (
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(r)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-[11px] flex items-center gap-1 border border-blue-200 dark:border-blue-800 transition shadow-sm"
                            >
                              <span>🖼️</span> {r.attachmentName?.toLowerCase().includes('pantallazo') ? 'Ver Pantallazo' : 'Ver Imagen'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(r)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-[11px] flex items-center gap-1 border border-slate-300 dark:border-slate-700 transition shadow-sm"
                            >
                              <span>📥</span> {r.attachmentName || 'Descargar Planilla'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Notes snippet */}
                      {r.notes && (
                        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 italic">
                          "{r.notes}"
                        </div>
                      )}
                    </div>

                    {/* Collapsible Items Accordion */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCardItems((prev) => ({
                            ...prev,
                            [r.id]: !prev[r.id],
                          }))
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📦</span> Ver {r.items.length} {r.items.length === 1 ? 'material' : 'materiales'} solicitados
                          {r.status === 'PENDING' && hasMissingStock && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold rounded text-[9px]">
                              Sin Stock
                            </span>
                          )}
                        </span>
                        <span className="text-slate-400 text-xs font-mono">{isExpanded ? '▲ Ocultar' : '▼ Expandir'}</span>
                      </button>

                      {isExpanded && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {r.items.length === 0 ? (
                            <p className="text-xs text-slate-400 italic p-2 text-center">Solicitud sin ítems en lista (adjunto adjuntado)</p>
                          ) : (
                            r.items.map((item) => {
                              const isUtp =
                                (item.product?.name || item.productName || '').toUpperCase().includes('UTP') ||
                                (item.product?.sku || item.sku || '').toUpperCase().includes('UTP')
                              const unitStr = isUtp ? 'MTS' : item.unitMeasure || item.product?.unit || 'UN'
                              const isTool = isToolItem(item)
                              const currentStock = item.product?.stock ?? 0
                              const hasEnoughStock = isTool || currentStock >= item.requestedQuantity

                              return (
                                <div
                                  key={item.id}
                                  className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`font-semibold ${item.isChecked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'} truncate`}>
                                        {item.product?.name || item.productName}
                                      </span>
                                      {isTool && (
                                        <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded text-[9px] font-bold">
                                          HERRAMIENTA
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      SKU: {item.product?.sku || item.sku || 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded text-[11px]">
                                      {item.requestedQuantity} {unitStr}
                                    </span>
                                    {r.status === 'PENDING' && (
                                      <span
                                        className={`text-[10px] font-semibold ${
                                          isTool
                                            ? 'text-purple-600 dark:text-purple-400'
                                            : hasEnoughStock
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        {isTool ? '(Camioneta)' : hasEnoughStock ? `(Stock: ${currentStock})` : `(Sin Stock: ${currentStock})`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {canDispatch && r.status === 'PENDING' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOpenDispatchModal(r)}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <span>📦</span> Despachar
                        </button>
                        <button
                          onClick={() => handleOpenSupplierQuoteModal(r)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5 ${
                            hasMissingStock
                              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                              : 'bg-slate-700 hover:bg-slate-600 text-white'
                          }`}
                          title="Redactar correo/documento de cotización a proveedor"
                        >
                          <span>📧</span> Cotizar
                        </button>
                      </div>
                    )}

                    {canDispatch && r.status === 'DISPATCHED' && (
                      <div className="grid grid-cols-2 gap-2">
                        {r.deliveryDocUrl || r.photoUrl || r.hasDeliveryDoc || r.hasPhoto ? (
                          <button
                            onClick={() => handleOpenPhotoViewer(r)}
                            className="py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow transition active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <span>{r.deliveryDocName?.toLowerCase().endsWith('.pdf') ? '📄' : '📜'}</span> Ver Acta
                          </button>
                        ) : (
                          <span className="py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold text-center flex items-center justify-center">
                            Sin Acta
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenSupplierQuoteModal(r)}
                          className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                        >
                          <span>📧</span> Cotizar
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      {canDispatch && r.status === 'PENDING' && (
                        <button
                          onClick={() => handleRejectRequest(r.id)}
                          className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-300 dark:border-amber-800 transition text-center"
                        >
                          🚫 Rechazar
                        </button>
                      )}

                      {!canDispatch && r.status === 'DISPATCHED' && (r.deliveryDocUrl || r.photoUrl || r.hasDeliveryDoc || r.hasPhoto) && (
                        <button
                          onClick={() => handleOpenPhotoViewer(r)}
                          className="flex-1 py-1.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow transition text-center flex items-center justify-center gap-1.5"
                        >
                          <span>{r.deliveryDocName?.toLowerCase().endsWith('.pdf') ? '📄' : '📜'}</span> Ver Acta de Entrega
                        </button>
                      )}

                      {(canCreateRequest || canDispatch) && (
                        <button
                          onClick={() => setDeleteConfirmRequestId(r.id)}
                          className="py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                          title="Eliminar solicitud"
                        >
                          <span>🗑️</span> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Controles de Paginación de Tarjetas (6 en 6 para optimizar carga y navegación) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{filteredRequests.length === 0 ? 0 : (currentPage - 1) * cardsPerPage + 1}</strong> a <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * cardsPerPage, filteredRequests.length)}</strong> de <strong className="text-slate-800 dark:text-slate-200">{filteredRequests.length}</strong> solicitudes
              </span>
              <span className="hidden sm:inline">|</span>
              <div className="flex items-center gap-1">
                <span>Ver:</span>
                {[6, 12, 24].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setCardsPerPage(size)
                      setCurrentPage(1)
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                      cardsPerPage === size
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCardsPerPage(filteredRequests.length || 999)
                    setCurrentPage(1)
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                    cardsPerPage >= filteredRequests.length && filteredRequests.length > 0
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold transition"
              >
                ← Anterior
              </button>
              <div className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Página {currentPage} de {totalCardPages}
              </div>
              <button
                type="button"
                disabled={currentPage >= totalCardPages}
                onClick={() => setCurrentPage((p) => Math.min(totalCardPages, p + 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold transition"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      ) : (
          /* ============================================================
             VISTA TABLA (DENSE TABLE VIEW)
             ============================================================ */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs uppercase font-mono">
                    <th className="p-4">Código / Fecha</th>
                    <th className="p-4">Proyecto & Solicitante</th>
                    <th className="p-4">Ítems Solicitados</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Receptor / Camioneta</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedTableRequests.map((r) => {
                    const hasMissingStock = r.items.some((item) => !isToolItem(item) && (item.product?.stock ?? 0) < item.requestedQuantity)
                    const isHighlighted = highlightId === r.id

                    return (
                      <tr
                        key={r.id}
                        className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          isHighlighted ? 'bg-blue-50/80 dark:bg-blue-950/40 font-semibold' : ''
                        }`}
                      >
                        <td className="p-4 font-mono">
                          <span className="font-bold text-blue-600 dark:text-blue-400 block">{r.code}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString('es-CL')}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-900 dark:text-white block">{r.projectName || 'Proyecto General'}</span>
                          <span className="text-xs text-slate-400">👤 {r.requestedBy?.name || r.requestedBy?.email}</span>
                          {r.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">"{r.notes}"</p>}
                        </td>
                        <td className="p-4">
                          {r.items.length === 0 ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400">📷 Solicitud con adjunto</span>
                          ) : (
                            <div className="space-y-1 max-w-xs">
                              <button
                                type="button"
                                onClick={() => setOpenItemsDropdownId(openItemsDropdownId === r.id ? null : r.id)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                              >
                                <span>📦 {r.items.length} ítems</span>
                                <span className="text-slate-400">{openItemsDropdownId === r.id ? '▲' : '▼'}</span>
                              </button>

                              {openItemsDropdownId === r.id && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 text-xs mt-1">
                                  {r.items.map((i) => (
                                    <div key={i.id} className="flex justify-between items-center gap-2">
                                      <span className="truncate">• {i.product?.name || i.productName} (x{i.requestedQuantity})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {r.status === 'PENDING' ? (
                            <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300">
                              ⏳ Pendiente
                            </span>
                          ) : r.status === 'REJECTED' ? (
                            <span className="px-2.5 py-1 text-xs rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-300">
                              🚫 Rechazada
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300">
                              ✅ Despachada
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {r.recipientName ? (
                            <div>
                              <span>👤 {r.recipientName}</span>
                              {r.recipientEmail && (
                                <div className="text-[11px] text-blue-500 font-mono">✉️ {r.recipientEmail}</div>
                              )}
                              {r.van && <div className="text-[10px] text-emerald-600">🛻 {r.van.plate}</div>}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sin entregar</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-y-1.5">
                          {(r.attachmentUrl || r.hasAttachment) && (
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(r)}
                              className="w-full px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1"
                            >
                              <span>📎</span> {r.attachmentName || 'Ver Adjunto'}
                            </button>
                          )}
                          {canDispatch && r.status === 'PENDING' && (
                            <button
                              onClick={() => handleOpenDispatchModal(r)}
                              className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
                            >
                              Check & Despachar
                            </button>
                          )}
                          {canDispatch && (
                            <button
                              onClick={() => handleOpenSupplierQuoteModal(r)}
                              className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold"
                            >
                              📧 Cotizar
                            </button>
                          )}
                          {canDispatch && r.status === 'PENDING' && (
                            <button
                              onClick={() => handleRejectRequest(r.id)}
                              className="w-full px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold border border-amber-300"
                            >
                              🚫 Rechazar
                            </button>
                          )}
                          {(canCreateRequest || canDispatch) && (
                            <button
                              onClick={() => setDeleteConfirmRequestId(r.id)}
                              className="w-full px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg text-xs font-bold border border-rose-300"
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                          {r.status === 'DISPATCHED' && (r.deliveryDocUrl || r.photoUrl || r.hasDeliveryDoc || r.hasPhoto) && (
                            <button
                              onClick={() => handleOpenPhotoViewer(r)}
                              className="w-full px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow flex items-center justify-center gap-1"
                            >
                              <span>{r.deliveryDocName?.toLowerCase().endsWith('.pdf') ? '📄' : '📜'}</span> Ver Acta
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación de Tabla */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{filteredRequests.length === 0 ? 0 : (tablePage - 1) * TABLE_ITEMS_PER_PAGE + 1}</strong> - <strong className="text-slate-800 dark:text-slate-200">{Math.min(tablePage * TABLE_ITEMS_PER_PAGE, filteredRequests.length)}</strong> de <strong className="text-slate-800 dark:text-slate-200">{filteredRequests.length}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:pointer-events-none rounded-lg font-semibold border border-slate-200 dark:border-slate-600 transition"
                >
                  ← Anterior
                </button>
                <span className="font-mono font-bold px-2 text-slate-700 dark:text-slate-300">
                  {tablePage} / {totalTablePages}
                </span>
                <button
                  type="button"
                  disabled={tablePage >= totalTablePages}
                  onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:pointer-events-none rounded-lg font-semibold border border-slate-200 dark:border-slate-600 transition"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Solicitud */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
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

            <form onSubmit={handleCreateRequest} className="space-y-4 text-sm overflow-y-auto pr-1 flex-1">
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

              {/* Interactive Drag & Drop & Screenshot Paste Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                  isDraggingFile
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-4 ring-blue-500/20 scale-[1.01]'
                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>📎</span> Adjuntar Comprobante, Planilla o Pantallazo
                  </label>
                  {uploadedAttachmentName && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedAttachmentUrl('')
                        setUploadedAttachmentName('')
                        setExcelParseMessage('')
                      }}
                      className="text-xs text-red-500 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>🗑️</span> Remover adjunto
                    </button>
                  )}
                </div>

                {/* Drop & Paste Instructions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center sm:justify-start gap-1.5">
                      <span>📥</span> Arrastra archivos aquí o pega un pantallazo con <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[11px] font-bold">Ctrl + V</kbd>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Soporta imágenes (PNG, JPG), planillas Excel/CSV con lectura automática, y documentos PDF.
                    </p>
                  </div>

                  <label className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow transition active:scale-95">
                    <span>📁 Seleccionar Archivo</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.xlsx,.xlsm,.xls,.csv,.doc,.docx"
                      onChange={handleFileUploadChange}
                      className="hidden"
                      disabled={isParsingExcel}
                    />
                  </label>
                </div>

                {/* File Attachment Preview Card */}
                {uploadedAttachmentUrl && (
                  <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {uploadedAttachmentUrl.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(uploadedAttachmentName) ? (
                        <button
                          type="button"
                          onClick={() => setZoomedAttachment({ url: uploadedAttachmentUrl, title: uploadedAttachmentName })}
                          className="group relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-blue-500 transition"
                          title="Hacer clic para ver en tamaño completo"
                        >
                          <img src={uploadedAttachmentUrl} alt={uploadedAttachmentName} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px]">🔍</span>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center text-lg shrink-0">
                          {/\.(xlsx|xls|csv)$/i.test(uploadedAttachmentName) ? '📊' : '📄'}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{uploadedAttachmentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {uploadedAttachmentUrl.startsWith('data:image/') ? '🖼️ Imagen / Pantallazo cargado' : '📎 Documento adjunto'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {uploadedAttachmentUrl.startsWith('data:image/') && (
                        <button
                          type="button"
                          onClick={() => setZoomedAttachment({ url: uploadedAttachmentUrl, title: uploadedAttachmentName })}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                        >
                          🔍 Ver
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {excelParseMessage && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
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

                {/* Subcategory dropdown if available */}
                {availableSubcategories.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Subcategoría:</span>
                    <select
                      value={selectedSubcategoryFilter}
                      onChange={(e) => setSelectedSubcategoryFilter(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
                    >
                      <option value="TODAS">Todas las subcategorías ({availableSubcategories.length})</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
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

            <form onSubmit={handleConfirmDispatch} className="space-y-4 text-sm overflow-y-auto pr-1 flex-1">
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

              {/* Sección de Adjunto / Pantallazo de Solicitud para el Bodeguero */}
              {(dispatchRequest.attachmentUrl || dispatchRequest.hasAttachment) && (
                <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-lg shrink-0">
                      🖼️
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-blue-900 dark:text-blue-200 block truncate">
                        {dispatchRequest.attachmentName || 'Pantallazo / Comprobante de Materiales'}
                      </span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400">
                        Lista de materiales solicitada por el técnico
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAttachment(dispatchRequest)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow shrink-0 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>🔍</span> Ver Pantallazo
                  </button>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-semibold">Checklist de Materiales a Retirar de Bodega</label>
                  <button
                    type="button"
                    onClick={() => setShowAddProductToDispatch(prev => !prev)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>+ Agregar Material Adicional</span>
                  </button>
                </div>

                {/* Add Product Search Dropdown */}
                {showAddProductToDispatch && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center font-bold text-blue-800 dark:text-blue-300">
                      <span>🔍 Seleccionar Material de Bodega para Agregar al Despacho</span>
                      <button type="button" onClick={() => setShowAddProductToDispatch(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <input
                      type="text"
                      value={dispatchAddSearch}
                      onChange={(e) => setDispatchAddSearch(e.target.value)}
                      placeholder="Buscar por nombre o SKU..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredDispatchProducts.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-2 text-center">No se encontraron productos coincidentes</p>
                      ) : (
                        filteredDispatchProducts.map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold block truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-400">SKU: {p.sku} | Stock: <strong className="text-slate-700 dark:text-slate-300">{p.stock}</strong> | Cat: {p.category}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddProductToDispatchChecklist(p)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold text-[11px] hover:bg-emerald-500 shrink-0"
                            >
                              + Añadir
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto">
                  {dispatchItemsList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No hay materiales en el checklist</p>
                  ) : (
                    dispatchItemsList.map((item) => {
                      const check = itemChecks[item.id] || { isChecked: true, quantity: item.requestedQuantity || 1, serialNumber: '' }
                      const prodName = item.productName || item.product?.name || 'Material'
                      const isEquipment = (item.product?.category === 'EQUIPOS') || prodName.toUpperCase().includes('SWITCH') || prodName.toUpperCase().includes('ROUTER')
                      
                      return (
                        <div key={item.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={check.isChecked}
                                onChange={(e) =>
                                  setItemChecks(prev => ({
                                    ...prev,
                                    [item.id]: { ...check, isChecked: e.target.checked },
                                  }))
                                }
                                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 shrink-0"
                              />
                              <span className="font-semibold truncate">{prodName}</span>
                              {item.sku && <span className="text-[10px] font-mono text-slate-400">({item.sku})</span>}
                            </label>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-[11px]">Cant:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={check.quantity}
                                  onChange={(e) =>
                                    setItemChecks(prev => ({
                                      ...prev,
                                      [item.id]: { ...check, quantity: parseInt(e.target.value) || 1 },
                                    }))
                                  }
                                  className="w-14 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-bold"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromDispatchChecklist(item.id)}
                                className="text-red-500 hover:text-red-700 p-1 font-bold"
                                title="Quitar este material de la lista de entrega"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Optional Serial Number Input */}
                          <div className="flex items-center gap-2 pl-6 pt-0.5">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">N° Serie (Opcional):</span>
                            <input
                              type="text"
                              value={check.serialNumber || ''}
                              onChange={(e) =>
                                setItemChecks(prev => ({
                                  ...prev,
                                  [item.id]: { ...check, serialNumber: e.target.value },
                                }))
                              }
                              placeholder={isEquipment ? 'Ej. SN-882347102 (Recomendado para equipos)' : 'Opcional...'}
                              className="w-full px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono"
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
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
                  onChange={(e) => {
                    const val = e.target.value
                    setRecipientName(val)
                    // Auto-sugerir correo si coincide con un usuario registrado y aún no hay correo
                    const matchedUser = systemUsers.find(
                      (u) =>
                        `${u.name || u.email}${u.role ? ` (${u.role})` : ''}`.toLowerCase() === val.toLowerCase() ||
                        (u.name && u.name.toLowerCase() === val.toLowerCase()) ||
                        (u.email && u.email.toLowerCase() === val.toLowerCase())
                    )
                    if (matchedUser && matchedUser.email && !recipientEmail) {
                      setRecipientEmail(matchedUser.email)
                    }
                  }}
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
                <label className="block font-semibold mb-1 flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <span>📧</span> Correo del Trabajador Receptor <span className="text-slate-400 font-normal text-[11px]">(Opcional)</span>
                  </span>
                  <span className="text-[10px] text-blue-500 font-medium">Notificación automática de materiales</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="ej: juan.perez@layerthree.cl"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Opcional: Si indicas su correo, el trabajador recibirá una notificación por email con la lista detallada de los materiales entregados.
                </p>
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

              {/* Sección de Acta de Entrega / Certificado (PDF o Imagen - Opcional) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>📜</span> Acta de Entrega / Certificado de Recepción <span className="text-slate-400 font-normal text-[11px]">(Opcional)</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                    PDF o Imagen
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Adjunta el acta firmada en formato PDF o una imagen/foto para certificar la recepción de los materiales. Es opcional para no alterar solicitudes históricas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center justify-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer text-xs font-semibold transition text-center shadow-sm">
                    <span>📄</span> Cargar Acta (PDF o Imagen)
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleDeliveryDocChange}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer text-xs font-semibold transition text-center shadow-sm">
                    <span>📸</span> Sacar Foto con Cámara
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleDeliveryDocChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {deliveryDocUrl && (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">
                        {deliveryDocName?.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                          {deliveryDocName || 'Acta de Entrega'}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                          ✓ Acta cargada y lista para certificar la entrega
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryDocUrl('')
                        setDeliveryDocName('')
                        setPhotoUrl('')
                        setPhotoPreview('')
                      }}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                      title="Quitar acta adjunta"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                )}

                {photoPreview && !deliveryDocName?.toLowerCase().endsWith('.pdf') && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-emerald-500/50 max-h-40 flex justify-center bg-black">
                    <img src={photoPreview} alt="Comprobante entrega" className="max-h-40 object-contain" />
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
                  Confirmar Entrega & Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Acta y Comprobante de Entrega */}
      {viewPhotoRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📜</span> Acta y Certificado de Entrega - {viewPhotoRequest.code}
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

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Renderizado de Acta / Documento / Foto */}
              {(() => {
                const docUrl = viewPhotoRequest.deliveryDocUrl || viewPhotoRequest.photoUrl
                const docName = viewPhotoRequest.deliveryDocName || `Acta_Entrega_${viewPhotoRequest.code}`
                const isPdf =
                  docUrl?.startsWith('data:application/pdf') ||
                  docName.toLowerCase().endsWith('.pdf')

                if (!docUrl) {
                  return (
                    <div className="p-6 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-center text-slate-500 dark:text-slate-400 text-xs">
                      ℹ️ Esta solicitud fue despachada sin acta o foto adjunta (Registro histórico).
                    </div>
                  )
                }

                if (isPdf) {
                  return (
                    <div className="space-y-3">
                      <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3 shadow-inner">
                        <span className="text-5xl">📄</span>
                        <div>
                          <p className="font-bold text-sm text-white">{docName}</p>
                          <p className="text-xs text-slate-400">Documento PDF certificado de entrega</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => downloadFile(docUrl, docName.endsWith('.pdf') ? docName : `${docName}.pdf`)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95"
                          >
                            <span>📥</span> Descargar Acta PDF
                          </button>
                        </div>
                      </div>
                      <iframe
                        src={docUrl}
                        title="Visor PDF Acta de Entrega"
                        className="w-full h-80 rounded-xl border border-slate-300 dark:border-slate-700 hidden sm:block"
                      />
                    </div>
                  )
                }

                return (
                  <div className="space-y-2">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center p-2 shadow-inner">
                      <img
                        src={docUrl}
                        alt={`Acta de entrega ${viewPhotoRequest.code}`}
                        className="max-h-80 w-auto object-contain rounded-xl cursor-pointer"
                        onClick={() =>
                          setZoomedAttachment({
                            url: docUrl,
                            title: `Acta de Entrega ${viewPhotoRequest.code} - ${docName}`,
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => downloadFile(docUrl, docName.includes('.') ? docName : `${docName}.jpg`)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <span>📥</span> Descargar Imagen
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Delivery Metadata Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-2.5 text-xs border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-400">Responsable / Técnico Receptor:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">👤 {viewPhotoRequest.recipientName}</span>
                    {viewPhotoRequest.recipientEmail && (
                      <span className="text-[11px] text-blue-500 font-mono block">✉️ {viewPhotoRequest.recipientEmail}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-400">Despachado Por:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {viewPhotoRequest.assignedTo?.name || viewPhotoRequest.assignedTo?.email || 'Bodega Layerthree'}
                  </span>
                </div>

                {viewPhotoRequest.van && (
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2 text-emerald-600 dark:text-emerald-400">
                    <span>Camioneta Asignada:</span>
                    <span className="font-bold font-mono">🛻 {viewPhotoRequest.van.plate} ({viewPhotoRequest.van.name})</span>
                  </div>
                )}

                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-400">Fecha y Hora de Despacho:</span>
                  <span className="font-mono">{new Date(viewPhotoRequest.updatedAt).toLocaleString('es-CL')}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1 font-semibold">Ítems y Materiales Entregados:</span>
                  <div className="space-y-1.5 pl-2 max-h-40 overflow-y-auto">
                    {viewPhotoRequest.items.map((i) => (
                      <div key={i.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                        <div>
                          <span className="font-semibold">• {i.productName || i.product?.name}</span>
                          {i.sku && <span className="font-mono text-[10px] text-slate-400 ml-1.5">({i.sku})</span>}
                          {(i as any).serialNumber && (
                            <span className="text-[10px] text-blue-400 font-mono block ml-3">N/S: {(i as any).serialNumber}</span>
                          )}
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                          {i.deliveredQuantity > 0 ? i.deliveredQuantity : i.requestedQuantity} {i.unitMeasure || 'UN'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {viewPhotoRequest.notes && (
                  <div className="pt-1 text-[11px] text-slate-400">
                    <span className="font-semibold block text-slate-300">Notas de Despacho:</span>
                    <p className="italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">{viewPhotoRequest.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewPhotoRequest(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                Cerrar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REDACTAR / GENERAR COTIZACIÓN A PROVEEDOR (BODEGUERO) */}
      {showSupplierQuoteModal && supplierQuoteRequest && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
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

      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN DE SOLICITUD */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmRequestId)}
        title="Eliminar Solicitud de Materiales"
        message="¿Estás seguro de eliminar permanentemente esta solicitud de materiales? Esta acción borrará la solicitud y sus ítems requeridos."
        confirmText="Sí, Eliminar Solicitud"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteRequest}
        onCancel={() => setDeleteConfirmRequestId(null)}
      />

      {/* MODAL ZOOM / LIGHTBOX DE IMAGEN O PANTALLAZO ADJUNTO */}
      {zoomedAttachment && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setZoomedAttachment(null)}
        >
          <div className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center text-white pb-3">
              <span className="font-bold text-sm truncate">{zoomedAttachment.title}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cleanTitle = zoomedAttachment.title.replace(/[^a-zA-Z0-9._-]/g, '_')
                    const filename = cleanTitle.includes('.') ? cleanTitle : `${cleanTitle}.jpg`
                    downloadFile(zoomedAttachment.url, filename)
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1"
                >
                  <span>📥</span> Descargar
                </button>
                <button
                  onClick={() => setZoomedAttachment(null)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-xs transition"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>
            <img
              src={zoomedAttachment.url}
              alt={zoomedAttachment.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      <LoadingOverlay isOpen={isActionLoading} message={actionLoadingText} />
    </div>
  )
}
