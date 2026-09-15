'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { isAdmin, canManageInventory } from '@/lib/auth'
import type { Product, Movement, ProductCategory, QuotationRequest } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import LoadingOverlay from '@/components/LoadingOverlay'
import SearchableProductSelect from '@/components/SearchableProductSelect'
import ChileanDatePicker from '@/components/ChileanDatePicker'
import Toast, { ToastMessage } from '@/components/Toast'
import { downloadFile } from '@/lib/download'

type TabType = 'dashboard' | 'products' | 'movements'
type DateFilter = 'day' | 'month' | 'year' | 'all'

export default function BodegaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [quotations, setQuotations] = useState<QuotationRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros Compras y Cotizaciones por Proyecto (Dashboard)
  const [purchaseTitleFilter, setPurchaseTitleFilter] = useState<string>('ALL')
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState<string>('')
  const [purchasePeriodFilter, setPurchasePeriodFilter] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom_month'>('all')
  const [customMonthValue, setCustomMonthValue] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})

  // Notificaciones Toast y Loading Overlay
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [loadingOverlay, setLoadingOverlay] = useState<{ isOpen: boolean; message?: string }>({ isOpen: false })

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setToast({ type, message, title })
  }
  const startLoading = (message: string) => setLoadingOverlay({ isOpen: true, message })
  const stopLoading = () => setLoadingOverlay({ isOpen: false })

  // Filtros Dashboard
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))

  // Búsqueda y Filtros Productos
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'low-stock' | 'out-of-stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('ALL')

  // Modales y Dialogs
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  // Modal CSV
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvTextContent, setCsvTextContent] = useState('')
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvMessage, setCsvMessage] = useState('')
  
  // Formulario Producto
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'EQUIPOS' as ProductCategory,
    subcategory: '',
    stock: 0,
    minStock: 0,
    unitPrice: 0,
    unit: 'UN',
    unitCost: 0,
    listPrice: 0,
    supplierCode: '',
    serialNumber: '',
    location: '',
  })



  // Formulario Movimiento Lote/Múltiple
  const [movementBatchType, setMovementBatchType] = useState<'ENTRY' | 'EXIT'>('ENTRY')
  const [movementNotes, setMovementNotes] = useState('')
  const [movementProjectId, setMovementProjectId] = useState('')
  const [movementVanId, setMovementVanId] = useState('')
  const [vans, setVans] = useState<any[]>([])
  const [movementItems, setMovementItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 },
  ])
  const [showMovementModal, setShowMovementModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsRes, movementsRes, vansRes, quotationsRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Movement[]>('/movements'),
        api.get('/vans').catch(() => ({ data: [] })),
        api.get<QuotationRequest[]>('/quotations').catch(() => ({ data: [] })),
      ])
      setProducts(productsRes.data)
      setMovements(movementsRes.data)
      if (Array.isArray(vansRes.data)) setVans(vansRes.data)
      if (Array.isArray(quotationsRes.data)) setQuotations(quotationsRes.data)
    } catch (err) {
      console.error('Error cargando bodega:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado de movimientos por fecha
  const filteredMovements = movements.filter((m) => {
    if (dateFilter === 'all') return true
    const start = new Date(`${selectedDate}T00:00:00`)
    const end = new Date(`${selectedDate}T23:59:59.999`)
    const mDate = new Date(m.createdAt)
    if (dateFilter === 'day') return mDate >= start && mDate <= end
    if (dateFilter === 'month') return mDate.getMonth() === start.getMonth() && mDate.getFullYear() === start.getFullYear()
    if (dateFilter === 'year') return mDate.getFullYear() === start.getFullYear()
    return true
  })

  // Stats Dashboard
  const lowStockList = products.filter((p) => p.stock < p.minStock)
  const totalValue = products.reduce((sum, p) => {
    const cost = p.unitCost ?? p.unitPrice ?? 0
    return sum + (p.stock || 0) * cost
  }, 0)

  // Proyectos / Títulos únicos para el filtro
  const uniqueProjectTitles = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>()
    quotations.forEach((q) => {
      const trimmed = q.title?.trim()
      if (!trimmed) return
      const existing = map.get(trimmed)
      if (existing) {
        existing.count += 1
      } else {
        map.set(trimmed, { title: trimmed, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
  }, [quotations])

  // Filtrado de Cotizaciones / Compras según Fecha y Título
  const filteredPurchaseQuotations = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return quotations.filter((q) => {
      // 1. Filtro por Fecha
      const qDate = new Date(q.createdAt)
      const qYear = qDate.getFullYear()
      const qMonth = qDate.getMonth()

      if (purchasePeriodFilter === 'this_month') {
        if (qYear !== currentYear || qMonth !== currentMonth) return false
      } else if (purchasePeriodFilter === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
        if (qYear !== lastMonthDate.getFullYear() || qMonth !== lastMonthDate.getMonth()) return false
      } else if (purchasePeriodFilter === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        if (qDate < threeMonthsAgo) return false
      } else if (purchasePeriodFilter === 'this_year') {
        if (qYear !== currentYear) return false
      } else if (purchasePeriodFilter === 'custom_month' && customMonthValue) {
        const [targetY, targetM] = customMonthValue.split('-').map(Number)
        if (qYear !== targetY || qMonth !== targetM - 1) return false
      }

      // 2. Filtro por Título seleccionado en dropdown
      if (purchaseTitleFilter !== 'ALL') {
        if (q.title?.trim().toLowerCase() !== purchaseTitleFilter.trim().toLowerCase()) return false
      }

      // 3. Filtro por Buscador de texto
      if (purchaseSearchTerm.trim()) {
        const term = purchaseSearchTerm.toLowerCase()
        const matches =
          (q.title && q.title.toLowerCase().includes(term)) ||
          (q.projectName && q.projectName.toLowerCase().includes(term)) ||
          (q.code && q.code.toLowerCase().includes(term)) ||
          (q.customCode && q.customCode.toLowerCase().includes(term))
        if (!matches) return false
      }

      return true
    })
  }, [quotations, purchasePeriodFilter, customMonthValue, purchaseTitleFilter, purchaseSearchTerm])

  // Agrupación de compras por Título (Proyecto) - considerando compras sucesivas del mismo título
  const groupedProjects = useMemo(() => {
    const map = new Map<string, {
      title: string
      projectNames: Set<string>
      totalSpent: number
      purchasesCount: number
      purchases: QuotationRequest[]
      lastDate: string
    }>()

    filteredPurchaseQuotations.forEach((q) => {
      const key = q.title?.trim() || 'Sin Título'
      const existing = map.get(key)
      const cost = Number(q.totalEstimatedCost) || 0

      if (existing) {
        existing.totalSpent += cost
        existing.purchasesCount += 1
        existing.purchases.push(q)
        if (q.projectName) existing.projectNames.add(q.projectName)
        if (q.createdAt > existing.lastDate) existing.lastDate = q.createdAt
      } else {
        const names = new Set<string>()
        if (q.projectName) names.add(q.projectName)
        map.set(key, {
          title: key,
          projectNames: names,
          totalSpent: cost,
          purchasesCount: 1,
          purchases: [q],
          lastDate: q.createdAt,
        })
      }
    })

    // Ordenar por mayor gasto total
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [filteredPurchaseQuotations])

  // KPIs Financieros de Compras
  const totalPurchaseSpent = useMemo(() => {
    return filteredPurchaseQuotations.reduce((acc, q) => acc + (Number(q.totalEstimatedCost) || 0), 0)
  }, [filteredPurchaseQuotations])

  const totalProjectsCount = groupedProjects.length
  const totalOrdersCount = filteredPurchaseQuotations.length
  const avgPerProject = totalProjectsCount > 0 ? totalPurchaseSpent / totalProjectsCount : 0

  const handleToggleProjectExpand = (title: string) => {
    setExpandedProjects((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const handleExportPurchaseReport = () => {
    if (filteredPurchaseQuotations.length === 0) {
      showToast('warning', 'No hay datos de compras para exportar con los filtros aplicados.', 'Reporte Vacío')
      return
    }

    const headers = [
      'Código',
      'Código Personalizado',
      'Título Cotización / Compra',
      'Nombre del Proyecto',
      'Destino',
      'Estado',
      'Valor Compra ($ CLP)',
      'Fecha Creación',
      'Solicitante',
      'Factura N°'
    ]

    const rows = filteredPurchaseQuotations.map((q) => [
      q.code,
      q.customCode || '',
      `"${(q.title || '').replace(/"/g, '""')}"`,
      `"${(q.projectName || '').replace(/"/g, '""')}"`,
      q.destinationType,
      q.status,
      q.totalEstimatedCost || 0,
      new Date(q.createdAt).toLocaleDateString('es-CL'),
      `"${(q.requestedBy?.name || q.requestedBy?.email || '').replace(/"/g, '""')}"`,
      q.invoiceNumber || ''
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    downloadFile(
      `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
      `Reporte_Gastos_Compras_Proyectos_${new Date().toISOString().slice(0, 10)}.csv`
    )
    showToast('success', 'Reporte de compras exportado en CSV', 'Descarga Lista')
  }

  const getPurchaseStatusBadge = (status: QuotationRequest['status']) => {
    switch (status) {
      case 'PENDING_QUOTE':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">⏳ Cot. Pendiente</span>
      case 'QUOTED':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-semibold border border-blue-300 dark:border-blue-800">💬 Cotizado</span>
      case 'ORDER_PLACED':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 font-semibold border border-indigo-300 dark:border-indigo-800">📄 OC Subida</span>
      case 'IN_PROCESSING':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 font-semibold border border-sky-300 dark:border-sky-800">⚙️ En Tramitación</span>
      case 'READY_FOR_PICKUP':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 font-semibold border border-teal-300 dark:border-teal-800">📦 Listo Retiro</span>
      case 'COMPLETED':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">✅ Facturado</span>
      case 'CANCELLED':
        return <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-semibold border border-rose-300 dark:border-rose-800">🚫 Cancelado</span>
      default:
        return null
    }
  }



  // Auto SKU Generator
  const fetchNextSku = async (category: string, subcategory?: string) => {
    try {
      let url = `/products/next-sku?category=${encodeURIComponent(category)}`
      if (subcategory) {
        url += `&subcategory=${encodeURIComponent(subcategory)}`
      }
      const res = await api.get<{ nextSku: string }>(url)
      if (res.data?.nextSku) {
        setFormData(prev => ({ ...prev, sku: res.data.nextSku }))
      }
    } catch (err) {
      console.error('Error al obtener siguiente SKU:', err)
    }
  }

  const handleOpenCreateModal = async () => {
    setEditingProduct(null)
    const defaultCat: ProductCategory = 'RED'
    setFormData({
      sku: 'Generando...',
      name: '',
      description: '',
      category: defaultCat,
      subcategory: '',
      stock: 0,
      minStock: 5,
      unitPrice: 0,
      unit: 'UN',
      unitCost: 0,
      listPrice: 0,
      supplierCode: '',
      serialNumber: '',
      location: '',
    })
    setShowProductModal(true)
    fetchNextSku(defaultCat)
  }

  const handleCategoryChangeInForm = (newCategory: ProductCategory) => {
    setFormData(prev => ({ ...prev, category: newCategory }))
    fetchNextSku(newCategory, formData.subcategory)
  }



  // Subcategorías disponibles dinámicas según filtro
  const availableSubcategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (categoryFilter === 'ALL' || p.category === categoryFilter) {
        if (p.subcategory && p.subcategory.trim()) {
          set.add(p.subcategory.trim())
        }
      }
    })
    return Array.from(set).sort()
  }, [products, categoryFilter])

  // Búsqueda inteligente multi-palabra y filtrado de Productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (stockFilter === 'available' && p.stock <= 0) return false
      if (stockFilter === 'low-stock' && p.stock >= p.minStock) return false
      if (stockFilter === 'out-of-stock' && p.stock > 0) return false
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false
      if (subcategoryFilter !== 'ALL' && p.subcategory !== subcategoryFilter) return false

      if (searchTerm.trim()) {
        const searchTokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean)
        const searchableText = `${p.sku} ${p.name} ${p.description || ''} ${p.category} ${p.subcategory || ''} ${p.supplierCode || ''}`.toLowerCase()

        const matchesAllTokens = searchTokens.every((token) => searchableText.includes(token))
        if (!matchesAllTokens) return false
      }

      return true
    })
  }, [products, stockFilter, categoryFilter, subcategoryFilter, searchTerm])

  // Paginación de Productos y Movimientos (Control de rendimiento)
  const [productPage, setProductPage] = useState<number>(1)
  const [productsPerPage, setProductsPerPage] = useState<number>(20)
  const [movementPage, setMovementPage] = useState<number>(1)
  const MOVEMENTS_PER_PAGE = 25

  useEffect(() => {
    setProductPage(1)
  }, [searchTerm, stockFilter, categoryFilter, subcategoryFilter, productsPerPage])

  useEffect(() => {
    setMovementPage(1)
  }, [dateFilter, selectedDate])

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage) || 1
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productsPerPage
    return filteredProducts.slice(start, start + productsPerPage)
  }, [filteredProducts, productPage, productsPerPage])

  const totalMovementPages = Math.ceil(filteredMovements.length / MOVEMENTS_PER_PAGE) || 1
  const paginatedMovements = useMemo(() => {
    const start = (movementPage - 1) * MOVEMENTS_PER_PAGE
    return filteredMovements.slice(start, start + MOVEMENTS_PER_PAGE)
  }, [filteredMovements, movementPage])

  // Handlers Productos
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    startLoading(editingProduct ? 'Actualizando producto...' : 'Creando nuevo producto...')
    try {
      const payload = {
        ...formData,
        unitPrice: formData.unitCost,
      }
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload)
        showToast('success', 'Producto modificado exitosamente', 'Inventario')
      } else {
        await api.post('/products', payload)
        showToast('success', 'Nuevo producto agregado exitosamente', 'Inventario')
      }
      setShowProductModal(false)
      resetProductForm()
      loadData()
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Error al guardar producto')
    } finally {
      stopLoading()
    }
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    startLoading('Eliminando producto del sistema...')
    try {
      await api.delete(`/products/${productToDelete}`)
      showToast('success', 'Producto eliminado de la base de datos', 'Inventario')
      setShowConfirmDialog(false)
      setProductToDelete(null)
      loadData()
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Error al eliminar producto')
      setShowConfirmDialog(false)
    } finally {
      stopLoading()
    }
  }

  const resetProductForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'EQUIPOS',
      subcategory: '',
      stock: 0,
      minStock: 5,
      unitPrice: 0,
      unit: 'UN',
      unitCost: 0,
      listPrice: 0,
      supplierCode: '',
      serialNumber: '',
      location: '',
    })
    setEditingProduct(null)
  }

  // Handlers Movimientos
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = movementItems.filter(item => item.productId && item.quantity > 0)
    if (validItems.length === 0) {
      showToast('warning', 'Debes seleccionar al menos un producto con cantidad mayor a 0')
      return
    }

    startLoading('Registrando movimientos de inventario...')
    try {
      if (validItems.length === 1) {
        await api.post('/movements', {
          productId: validItems[0].productId,
          quantity: validItems[0].quantity,
          type: movementBatchType,
          notes: movementNotes || undefined,
          projectId: movementProjectId || undefined,
          vanId: movementVanId || undefined,
        })
      } else {
        await api.post('/movements/bulk', {
          items: validItems,
          type: movementBatchType,
          notes: movementNotes || undefined,
          projectId: movementProjectId || undefined,
          vanId: movementVanId || undefined,
        })
      }

      showToast('success', 'Movimiento de inventario registrado correctamente', 'Bodega')
      setShowMovementModal(false)
      setMovementItems([{ productId: '', quantity: 1 }])
      setMovementNotes('')
      setMovementProjectId('')
      setMovementVanId('')
      loadData()
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Error al registrar movimientos')
    } finally {
      stopLoading()
    }
  }

  // Reportes
  const downloadReport = async (type: 'inventory' | 'movements') => {
    startLoading('Generando reporte Excel...')
    try {
      let url = `/reports/${type}`
      if (type === 'movements' && dateFilter !== 'all') {
        url += `?filter=${dateFilter}&date=${selectedDate}`
      }
      const response = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const filename = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`
      downloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      showToast('info', 'Reporte Excel generado y descargado', 'Reportes')
    } catch (err) {
      showToast('error', 'Error al generar el reporte Excel')
    } finally {
      stopLoading()
    }
  }

  const canManage = canManageInventory()
  const admin = isAdmin()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const arrayBuffer = evt.target?.result as ArrayBuffer
        if (!arrayBuffer) return

        const bytes = new Uint8Array(arrayBuffer)
        let text = ''
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
          text = utf8Decoder.decode(bytes)
        } catch {
          let macScore = 0
          let winScore = 0
          for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i]
            if (b === 0x87 || b === 0x97 || b === 0x92 || b === 0x96 || b === 0x8e || b === 0x9c) {
              macScore++
            }
            if (b === 0xe1 || b === 0xf3 || b === 0xed || b === 0xf1 || b === 0xe9 || b === 0xfa) {
              winScore++
            }
          }

          if (macScore >= winScore && macScore > 0) {
            try {
              text = new TextDecoder('macintosh').decode(bytes)
            } catch {
              text = new TextDecoder('windows-1252').decode(bytes)
            }
          } else {
            try {
              text = new TextDecoder('windows-1252').decode(bytes)
            } catch {
              text = new TextDecoder('latin1').decode(bytes)
            }
          }
        }

        setCsvTextContent(text)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleImportCsvSubmit = async () => {
    if (!csvTextContent.trim()) {
      showToast('warning', 'Por favor selecciona o pega el contenido de un archivo CSV')
      return
    }
    setCsvUploading(true)
    setCsvMessage('')
    startLoading('Procesando e importando catálogo CSV...')
    try {
      const res = await api.post('/products/import-csv', { csvText: csvTextContent })
      setCsvMessage(res.data.message || 'Importación realizada con éxito')
      showToast('success', res.data.message || 'Importación realizada con éxito', 'Importación CSV')
      loadData()
      setTimeout(() => {
        setShowCsvModal(false)
        setCsvTextContent('')
        setCsvMessage('')
      }, 2000)
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Error al importar archivo CSV')
    } finally {
      setCsvUploading(false)
      stopLoading()
    }
  }

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'SKU,Nombre Producto,Categoria,Subcategoria,Cantidad Bodega,Unidad,Costo Unitario CLP,Costo Total Bodega CLP,Precio Lista CLP,Estado,Codigo Proveedor,Observaciones\n' +
      'LT-EMT-001,EMT 20MM X 3 MTS,Canalización Metálica (EMT/Conduit),Tuberías y Conductos,10,TIRA,2251.0,=E2*G2,3127.0,Disponible,P07872,Carga inicial\n' +
      'LT-RED-043,CABLE UTP CAT 3,Cableado Estructurado y Redes,Cables de Red y Conductores,100,MTS,1404.0,=E3*G3,2070.0,Disponible,P01928,UTP por metros'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadFile(blob, 'inventario_con_costos_y_formulas.csv', 'text/csv;charset=utf-8;')
  }

  const handleExportCsvBackup = () => {
    if (!products || products.length === 0) {
      alert('No hay productos registrados en el inventario actual para exportar.')
      return
    }

    const headers = 'SKU,Nombre Producto,Categoria,Subcategoria,Cantidad Bodega,Unidad,Costo Unitario CLP,Costo Total Bodega CLP,Precio Lista CLP,Ubicacion,Estado,Codigo Proveedor,Observaciones'
    const rows = products.map((p, idx) => {
      const lineNum = idx + 2
      const isUtp = (p.name || '').toUpperCase().includes('UTP') || (p.sku || '').toUpperCase().includes('UTP')
      const cleanSku = (p.sku || '').replace(/"/g, '""')
      const cleanName = (p.name || '').replace(/"/g, '""')
      const cleanCat = (p.category || '').replace(/"/g, '""')
      const cleanSubcat = (p.subcategory || '').replace(/"/g, '""')
      const qty = p.stock || 0
      const unit = isUtp ? 'MTS' : (p.unit || 'UN')
      const unitCost = p.unitCost ?? p.unitPrice ?? 0
      const formulaTotal = `=E${lineNum}*G${lineNum}`
      const listPrice = p.listPrice || 0
      const cleanLoc = (p.location || '').replace(/"/g, '""')
      const estado = qty > 0 ? 'Disponible' : 'Sin Stock'
      const provCode = (p.supplierCode || '').replace(/"/g, '""')
      const cleanObs = (p.description || '').replace(/"/g, '""')

      return `"${cleanSku}","${cleanName}","${cleanCat}","${cleanSubcat}",${qty},"${unit}",${unitCost},"${formulaTotal}",${listPrice},"${cleanLoc}","${estado}","${provCode}","${cleanObs}"`
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const dateStr = new Date().toISOString().split('T')[0]
    downloadFile(blob, `inventario_con_costos_y_formulas_${dateStr}.csv`, 'text/csv;charset=utf-8;')
  }

  if (loading) {
    return <div className="py-12 text-center text-slate-400">Cargando Módulo de Bodega...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📦</span> Bodega e Inventario
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gestión de productos, movimientos de stock y auditoría</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-900 p-1 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Productos ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === 'movements'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Movimientos ({movements.length})
          </button>
        </div>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Export buttons & Date Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Filtrar por fecha:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="all">Histórico Completo</option>
                <option value="day">Día</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
              {dateFilter !== 'all' && (
                <div className="w-40">
                  <ChileanDatePicker
                    value={selectedDate}
                    onChange={(iso) => setSelectedDate(iso)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => downloadReport('inventory')}
                className="flex-1 md:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
              >
                📊 Exportar Excel Inventario
              </button>
              <button
                onClick={() => downloadReport('movements')}
                className="flex-1 md:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
              >
                📄 Exportar Excel Movimientos
              </button>
            </div>
          </div>

          {/* Cards Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total Productos</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 sm:mt-2">{products.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Stock Bajo Crítico</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-500 mt-1 sm:mt-2">{lowStockList.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Movimientos</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 sm:mt-2">{filteredMovements.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Valor Inventario</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2">${totalValue.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {/* Listas Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alertas Stock Bajo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span>⚠️</span> Alertas de Stock Bajo
              </h3>
              {lowStockList.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Todos los productos tienen niveles de stock óptimos.</p>
              ) : (
                <div className="space-y-3">
                  {lowStockList.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{p.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">SKU: {p.sku} | Cat: {p.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg">
                          Stock: {p.stock} / Mín: {p.minStock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Entradas/Salidas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span>🔄</span> Actividad Reciente de Movimientos
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Entradas</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 mt-1">
                    {filteredMovements.filter((m) => m.type === 'ENTRY').length}
                  </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs text-rose-700 dark:text-rose-400 font-semibold uppercase">Salidas</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-300 mt-1">
                    {filteredMovements.filter((m) => m.type === 'EXIT').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN FINANCIERA: INVERSIÓN Y GASTOS EN COMPRAS POR PROYECTO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
            {/* Header de la Sección */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>💼</span> Inversión & Gastos en Compras por Proyecto
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Filtra por título/proyecto (agrupa automáticamente compras adicionales del mismo proyecto) y por períodos de fecha para conocer el gasto mensual o histórico.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleExportPurchaseReport}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  <span>📊</span> Exportar Reporte (CSV)
                </button>
                <Link
                  href="/cotizaciones"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  <span>➕</span> Nueva Cotización
                </Link>
              </div>
            </div>

            {/* Barra de Filtros: Período + Selector de Proyecto + Buscador */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Filtro por Período */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  📅 Filtrar por Fecha / Período:
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setPurchasePeriodFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition ${
                      purchasePeriodFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Histórico
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasePeriodFilter('this_month')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition ${
                      purchasePeriodFilter === 'this_month'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Este Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasePeriodFilter('last_month')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition ${
                      purchasePeriodFilter === 'last_month'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Mes Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasePeriodFilter('this_year')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition ${
                      purchasePeriodFilter === 'this_year'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Este Año
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchasePeriodFilter('custom_month')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition ${
                      purchasePeriodFilter === 'custom_month'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Elegir Mes
                  </button>
                </div>
                {purchasePeriodFilter === 'custom_month' && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-semibold">Selecciona mes:</span>
                    <input
                      type="month"
                      value={customMonthValue}
                      onChange={(e) => setCustomMonthValue(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Filtro por Título de Proyecto */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  🏢 Filtrar por Título / Proyecto:
                </label>
                <select
                  value={purchaseTitleFilter}
                  onChange={(e) => setPurchaseTitleFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos los Proyectos ({uniqueProjectTitles.length})</option>
                  {uniqueProjectTitles.map((item) => (
                    <option key={item.title} value={item.title}>
                      {item.title} ({item.count} {item.count === 1 ? 'compra' : 'compras'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  * Títulos idénticos se agrupan en un solo proyecto.
                </span>
              </div>

              {/* Buscador de Texto */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  🔍 Búsqueda rápida:
                </label>
                <input
                  type="text"
                  placeholder="Buscar título, código..."
                  value={purchaseSearchTerm}
                  onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* KPI Cards de Compras */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
                <p className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>💰</span> Inversión en Compras
                </p>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                  ${totalPurchaseSpent.toLocaleString('es-CL')}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {purchasePeriodFilter === 'this_month' ? 'Gasto del mes actual' : purchasePeriodFilter === 'custom_month' ? `Gasto período ${customMonthValue}` : 'Total según filtros activos'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4">
                <p className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>🏗️</span> Proyectos Activos
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">
                  {totalProjectsCount}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Títulos únicos con compras
                </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-4">
                <p className="text-[10px] sm:text-xs text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>📦</span> Órdenes / Cotizaciones
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">
                  {totalOrdersCount}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Solicitudes generadas
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4">
                <p className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>📈</span> Promedio por Proyecto
                </p>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-amber-700 dark:text-amber-300 mt-1">
                  ${Math.round(avgPerProject).toLocaleString('es-CL')}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Inversión media por proyecto
                </p>
              </div>
            </div>

            {/* Listado Consolidado por Proyecto / Título */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📋</span> Desglose por Proyecto ({groupedProjects.length} proyectos encontrados)
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ordenado por mayor gasto acumulado
                </span>
              </div>

              {groupedProjects.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs sm:text-sm">
                  No se encontraron cotizaciones o compras que coincidan con los filtros seleccionados.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {groupedProjects.map((group) => {
                    const isExpanded = Boolean(expandedProjects[group.title])
                    const percentOfTotal = totalPurchaseSpent > 0 ? (group.totalSpent / totalPurchaseSpent) * 100 : 0

                    return (
                      <div
                        key={group.title}
                        className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 sm:p-4 transition hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>🏗️</span> {group.title}
                              </span>
                              {group.purchasesCount > 1 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {group.purchasesCount} compras acumuladas
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  1 compra
                                </span>
                              )}
                            </div>
                            {group.projectNames.size > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Destino / Proyecto: <span className="font-semibold text-slate-700 dark:text-slate-300">{Array.from(group.projectNames).join(', ')}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-semibold">Gasto Total Acumulado</span>
                              <span className="font-mono font-extrabold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                                ${group.totalSpent.toLocaleString('es-CL')}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                ({percentOfTotal.toFixed(1)}% del total)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleProjectExpand(group.title)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                isExpanded
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                                  : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              <span>{isExpanded ? '▲ Ocultar' : '▼ Ver Compras'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Barra de Progreso / Participación */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(2, percentOfTotal))}%` }}
                          />
                        </div>

                        {/* Desglose de Compras individuales si está expandido */}
                        {isExpanded && (
                          <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              📦 Compras individuales asociadas a este proyecto:
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {group.purchases.map((q) => (
                                <div
                                  key={q.id}
                                  className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                      {q.customCode ? `${q.code} (${q.customCode})` : q.code}
                                    </span>
                                    {getPurchaseStatusBadge(q.status)}
                                    <span className="text-slate-500 dark:text-slate-400">
                                      📅 {new Date(q.createdAt).toLocaleDateString('es-CL')}
                                    </span>
                                    {q.requestedBy?.name && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        👤 Solicitado por: <strong className="text-slate-700 dark:text-slate-300">{q.requestedBy.name}</strong>
                                      </span>
                                    )}
                                    {q.invoiceNumber && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        📄 Factura: <strong className="font-mono text-emerald-600">{q.invoiceNumber}</strong>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                        ${(q.totalEstimatedCost || 0).toLocaleString('es-CL')}
                                      </span>
                                    </div>
                                    <Link
                                      href="/cotizaciones"
                                      className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                    >
                                      <span>Ver flujo</span> <span>→</span>
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTOS */}
      {activeTab === 'products' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Barra de Acciones */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Catálogo de Productos</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total: {filteredProducts.length} de {products.length} productos registrados</p>
            </div>

            {canManage && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto max-w-full">
                <button
                  onClick={handleDownloadCsvTemplate}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center justify-center gap-1.5"
                  title="Descargar plantilla CSV vacía"
                >
                  <span>📥</span> Planilla Base
                </button>
                <button
                  onClick={handleExportCsvBackup}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center justify-center gap-1.5"
                  title="Exportar copia de respaldo CSV"
                >
                  <span>📤</span> Backup CSV
                </button>
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <span>📄</span> Importar CSV
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Nuevo Producto
                </button>
              </div>
            )}
          </div>

          {/* Barra de Filtros y Búsqueda Inteligente Multi-palabra */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Buscador inteligente */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <input
                  type="text"
                  placeholder="Buscar SKU, nombre (ej: modulo tx)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>

              {/* Filtro Categoría */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    setSubcategoryFilter('ALL')
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="RED">Redes y Cableado (RED)</option>
                  <option value="CANALIZACION">Canalización (EMT/PVC/BPC)</option>
                  <option value="FIBRA_OPTICA">Fibra Óptica (F.O)</option>
                  <option value="ELECTRICIDAD">Electricidad e Iluminación</option>
                  <option value="EQUIPOS">Equipos y Herramientas</option>
                  <option value="INSUMOS">Insumos y Varios</option>
                </select>
              </div>

              {/* Filtro Subcategoría */}
              <div>
                <select
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
                >
                  <option value="ALL">Todas las Subcategorías</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Estado Stock */}
              <div>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">📦 Todo el Inventario</option>
                  <option value="available">✅ Solo Disponibles (Stock &gt; 0)</option>
                  <option value="low-stock">⚠️ Solo Stock Bajo (&lt; mín)</option>
                  <option value="out-of-stock">❌ Agotados (Stock = 0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (For small screens) */}
          <div className="block md:hidden space-y-3">
            {paginatedProducts.map((product) => {
              const unitStr = product.unit || 'UN'
              const baseCost = product.unitCost ?? product.unitPrice ?? 0
              const totalCostVal = product.stock * baseCost

              return (
                <div key={product.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">
                        SKU: {product.sku} {product.supplierCode ? `| Cod: ${product.supplierCode}` : ''}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{product.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      product.stock < product.minStock
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300'
                    }`}>
                      {product.stock} {unitStr}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{product.description}</p>
                  )}

                  {product.location && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>📍 Ubicación:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{product.location}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Costo Base Unit:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">${baseCost.toLocaleString('es-CL')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Costo Total Bodega:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">${totalCostVal.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setEditingProduct(product)
                          setFormData({
                            sku: product.sku,
                            name: product.name,
                            description: product.description || '',
                            category: product.category,
                            subcategory: product.subcategory || '',
                            stock: product.stock,
                            minStock: product.minStock,
                            unitPrice: product.unitPrice ?? 0,
                            unit: product.unit || 'UN',
                            unitCost: product.unitCost ?? product.unitPrice ?? 0,
                            listPrice: product.listPrice ?? 0,
                            supplierCode: product.supplierCode || '',
                            serialNumber: product.serialNumber || '',
                            location: product.location || '',
                          })
                          setShowProductModal(true)
                        }}
                        className="text-blue-600 font-semibold text-xs flex items-center gap-1"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => {
                          setProductToDelete(product.id)
                          setShowConfirmDialog(true)
                        }}
                        className="text-red-600 font-semibold text-xs flex items-center gap-1"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Subcategoría</th>
                    <th className="px-4 py-3 font-semibold text-center">Stock</th>
                    <th className="px-4 py-3 font-semibold">Unidad</th>
                    <th className="px-4 py-3 font-semibold text-right">Costo Unit.</th>
                    <th className="px-4 py-3 font-semibold text-right">Valor Total</th>
                    <th className="px-4 py-3 font-semibold">Ubicación</th>
                    {canManage && <th className="px-4 py-3 font-semibold text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedProducts.map((product) => {
                    const unitStr = product.unit || 'UN'
                    const baseCost = product.unitCost ?? product.unitPrice ?? 0
                    const totalCostVal = product.stock * baseCost

                    return (
                      <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white font-mono">{product.sku}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{product.name}</p>
                          {product.supplierCode && <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">Prov: {product.supplierCode}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700 font-semibold">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {product.subcategory || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              product.stock < product.minStock
                                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                          {unitStr}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-right text-emerald-600 dark:text-emerald-400">
                          ${baseCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                          ${totalCostVal.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {product.location ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800">
                              📍 {product.location}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin asignar</span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product)
                                setFormData({
                                  sku: product.sku,
                                  name: product.name,
                                  description: product.description || '',
                                  category: product.category,
                                  subcategory: product.subcategory || '',
                                  stock: product.stock,
                                  minStock: product.minStock,
                                  unitPrice: product.unitPrice ?? 0,
                                  unit: product.unit || 'UN',
                                  unitCost: product.unitCost ?? product.unitPrice ?? 0,
                                  listPrice: product.listPrice ?? 0,
                                  supplierCode: product.supplierCode || '',
                                  serialNumber: product.serialNumber || '',
                                  location: product.location || '',
                                })
                                setShowProductModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline text-xs font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setProductToDelete(product.id)
                                setShowConfirmDialog(true)
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 hover:underline text-xs font-semibold"
                            >
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Controles de Paginación de Productos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{filteredProducts.length === 0 ? 0 : (productPage - 1) * productsPerPage + 1}</strong> a <strong className="text-slate-800 dark:text-slate-200">{Math.min(productPage * productsPerPage, filteredProducts.length)}</strong> de <strong className="text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> productos
              </span>
              <span className="hidden sm:inline">|</span>
              <div className="flex items-center gap-1">
                <span>Por página:</span>
                {[20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setProductsPerPage(size)
                      setProductPage(1)
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                      productsPerPage === size
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
                    setProductsPerPage(filteredProducts.length || 999)
                    setProductPage(1)
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                    productsPerPage >= filteredProducts.length && filteredProducts.length > 0
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={productPage <= 1}
                onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold transition"
              >
                ← Anterior
              </button>
              <div className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Página {productPage} de {totalProductPages}
              </div>
              <button
                type="button"
                disabled={productPage >= totalProductPages}
                onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold transition"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOVIMIENTOS */}
      {activeTab === 'movements' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Histórico de Entradas y Salidas</h2>
            {admin && (
              <button
                onClick={() => setShowMovementModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition active:scale-95 flex items-center gap-1.5"
              >
                <span>➕</span> Registrar Movimiento
              </button>
            )}
          </div>

          {/* MOBILE CARDS VIEW FOR MOVEMENTS */}
          <div className="block md:hidden space-y-3">
            {paginatedMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                No hay movimientos registrados
              </div>
            ) : (
              paginatedMovements.map((m) => (
                <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm text-xs">
                  <div className="flex justify-between items-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.type === 'ENTRY'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                      }`}
                    >
                      {m.type === 'ENTRY' ? 'ENTRADA' : 'SALIDA'} (x{m.quantity})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(m.createdAt).toLocaleDateString('es-CL')}
                    </span>
                  </div>

                  <p className="font-bold text-slate-900 dark:text-white text-sm">{m.product?.name || m.productId}</p>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Proyecto: <strong>{m.projectId || '-'}</strong></span>
                    <span>Por: {m.user?.name || m.userId}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW FOR MOVEMENTS */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Producto</th>
                    <th className="px-4 py-3 font-semibold">Cantidad</th>
                    <th className="px-4 py-3 font-semibold">Proyecto</th>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No hay movimientos registrados
                      </td>
                    </tr>
                  ) : (
                    paginatedMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {new Date(m.createdAt).toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              m.type === 'ENTRY'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {m.type === 'ENTRY' ? 'ENTRADA' : 'SALIDA'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {m.product?.name || m.productId}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono">{m.quantity}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-blue-600 dark:text-blue-400">{m.projectId || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{m.user?.name || m.user?.email || m.userId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación de Movimientos */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando <strong className="text-slate-800 dark:text-slate-200">{filteredMovements.length === 0 ? 0 : (movementPage - 1) * MOVEMENTS_PER_PAGE + 1}</strong> - <strong className="text-slate-800 dark:text-slate-200">{Math.min(movementPage * MOVEMENTS_PER_PAGE, filteredMovements.length)}</strong> de <strong className="text-slate-800 dark:text-slate-200">{filteredMovements.length}</strong> movimientos
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={movementPage <= 1}
                  onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:pointer-events-none rounded-lg font-semibold border border-slate-200 dark:border-slate-600 transition"
                >
                  ← Anterior
                </button>
                <span className="font-mono font-bold px-2 text-slate-700 dark:text-slate-300">
                  {movementPage} / {totalMovementPages}
                </span>
                <button
                  type="button"
                  disabled={movementPage >= totalMovementPages}
                  onClick={() => setMovementPage((p) => Math.min(totalMovementPages, p + 1))}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:pointer-events-none rounded-lg font-semibold border border-slate-200 dark:border-slate-600 transition"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO (CREAR / EDITAR MATERIAL) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📦</span> {editingProduct ? 'Editar Material / Equipo' : 'Crear Nuevo Material / Equipo'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs sm:text-sm overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Material *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Cable UTP Cat6 / Huincha Aisladora"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold"
                  >
                    <option value="EQUIPOS">EQUIPOS</option>
                    <option value="RED">RED</option>
                    <option value="FIBRA_OPTICA">FIBRA OPTICA</option>
                    <option value="ELECTRICIDAD">ELECTRICIDAD</option>
                    <option value="CANALIZACION">CANALIZACION</option>
                    <option value="INSUMOS">INSUMOS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subcategoría (Opcional)</label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="Ej: Ferretería, Cámaras, Herramientas"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex justify-between items-center">
                    <span>N° de Serie (Opcional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Equipos</span>
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Ej: SN-9028471092"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex justify-between items-center">
                    <span>Ubicación en Bodega (Opcional)</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">📍 Estante / Pasillo</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ej: Pasillo A, Estante 2, Nivel 3"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unidad de Medida *
                  </label>
                  <select
                    value={formData.unit || 'UN'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-blue-500/50 dark:border-blue-500/50 rounded-xl text-slate-900 dark:text-white text-xs font-extrabold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UN">UN (Unidades)</option>
                    <option value="MTS">MTS (Metros - Cables/Fibra)</option>
                    <option value="TIRA">TIRA (Tiras 3m)</option>
                    <option value="ROLLOS">ROLLOS (Rollos)</option>
                    <option value="CAJAS">CAJAS (Cajas)</option>
                    <option value="KG">KG (Kilos)</option>
                    <option value="PAR">PAR (Pares)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock === 0 ? '' : formData.stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock === 0 ? '' : formData.minStock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Sección Costos y Precios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Costo Unit. Base CLP ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitCost === 0 ? '' : formData.unitCost}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Precio Lista CLP ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.listPrice === 0 ? '' : formData.listPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, listPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código Proveedor
                  </label>
                  <input
                    type="text"
                    value={formData.supplierCode}
                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                    placeholder="Ej: PROV-998"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción / Notas</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles adicionales del producto o especificaciones..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow"
                >
                  Guardar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO MÚLTIPLE */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔄</span> Registrar Movimiento de Stock (Múltiples Materiales)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona la operación e ingresa uno o varios productos/herramientas
                </p>
              </div>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4 text-xs sm:text-sm overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Movimiento *
                  </label>
                  <select
                    value={movementBatchType}
                    onChange={(e) => setMovementBatchType(e.target.value as 'ENTRY' | 'EXIT')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-extrabold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ENTRY">📥 ENTRADA / Devolución a Bodega (+)</option>
                    <option value="EXIT">📤 SALIDA / Asignación (-) </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vehículo / Camioneta Asignada (Opcional)
                  </label>
                  <select
                    value={movementVanId}
                    onChange={(e) => setMovementVanId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="">-- Sin Vehículo Asignado --</option>
                    {vans.map((v) => (
                      <option key={v.id} value={v.id}>
                        🚚 {v.plate} - {v.name} ({v.driver || v.driverName || 'Sin Conductor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código Proyecto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={movementProjectId}
                    onChange={(e) => setMovementProjectId(e.target.value)}
                    placeholder="Ej: PROJ-102"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observaciones / Motivo
                  </label>
                  <input
                    type="text"
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    placeholder="Ej: Recepción compra u Orden de despacho"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Items List */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                      Materiales / Equipos a Incluir
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Busca por nombre, SKU o filtra por categoría en el selector
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {movementItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMovementItems([{ productId: '', quantity: 1 }])}
                        className="text-xs text-slate-500 hover:text-red-500 px-2 py-1 transition"
                      >
                        Limpiar Filas
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setMovementItems([
                          ...movementItems,
                          { productId: '', quantity: 1 },
                          { productId: '', quantity: 1 },
                          { productId: '', quantity: 1 },
                        ])
                      }
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-2.5 py-1.5 rounded-xl transition"
                    >
                      + 3 Filas
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementItems([...movementItems, { productId: '', quantity: 1 }])}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl transition shadow-sm"
                    >
                      + Agregar Material
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {movementItems.map((item, idx) => {
                    const selectedP = products.find((p) => p.id === item.productId)
                    const unitLabel = selectedP?.unit || 'UN'
                    const isExcessExit =
                      movementBatchType === 'EXIT' && selectedP && item.quantity > selectedP.stock

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition ${
                          isExcessExit
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                            : selectedP
                            ? 'bg-blue-50/40 dark:bg-slate-800/80 border-blue-200 dark:border-blue-900/50'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                          <div className="flex-1 min-w-0">
                            <SearchableProductSelect
                              products={products}
                              selectedProductId={item.productId}
                              onSelectProduct={(p) => {
                                const updated = [...movementItems]
                                updated[idx].productId = p ? p.id : ''
                                setMovementItems(updated)
                              }}
                              placeholder="🔍 Escribe para buscar por nombre, SKU o categoría..."
                            />
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-28 relative">
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.quantity === 0 ? '' : item.quantity}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const updated = [...movementItems]
                                  updated[idx].quantity = e.target.value === '' ? 0 : Number(e.target.value)
                                  setMovementItems(updated)
                                }}
                                placeholder="Cant."
                                className={`w-full px-3 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs text-center font-extrabold pr-8 ${
                                  isExcessExit
                                    ? 'border-rose-400 dark:border-rose-700 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                                }`}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                                {unitLabel}
                              </span>
                            </div>

                            {movementItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setMovementItems(movementItems.filter((_, i) => i !== idx))}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded-xl transition font-bold text-sm"
                                title="Eliminar fila"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Stock feedback line */}
                        {selectedP && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap justify-between items-center text-[11px] px-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 rounded">
                                {selectedP.sku}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                Categoría: <strong className="text-slate-700 dark:text-slate-200">{selectedP.category}</strong>
                                {selectedP.subcategory && ` / ${selectedP.subcategory}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <span className="text-slate-500 dark:text-slate-400">
                                Stock Actual en Bodega:
                              </span>
                              <span className="font-extrabold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                                {selectedP.stock} {unitLabel}
                              </span>
                              {isExcessExit && (
                                <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-lg border border-rose-300 dark:border-rose-800 animate-pulse">
                                  ⚠️ Cantidad supera el stock actual ({selectedP.stock} {unitLabel})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <span className="text-xs text-slate-400 font-medium">
                  {movementItems.filter((i) => i.productId).length} de {movementItems.length} materiales seleccionados
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMovementModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/20"
                  >
                    Guardar Movimiento ({movementItems.filter((i) => i.productId).length})
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* MODAL IMPORTAR CSV */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📄</span> Importar Inventario desde CSV
              </h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {csvMessage && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs border border-emerald-300 dark:border-emerald-800 shrink-0">
                {csvMessage}
              </div>
            )}

            <div className="space-y-3 text-xs sm:text-sm overflow-y-auto pr-1 flex-1">
              <p className="text-slate-500 dark:text-slate-400">
                Selecciona la planilla <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">inventario_con_costos_y_formulas.csv</code> (o <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">inventario_organizado.csv</code>) o pega el contenido del archivo CSV.
              </p>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Seleccionar archivo .csv</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-400 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">O pegar contenido CSV</label>
                <textarea
                  rows={6}
                  value={csvTextContent}
                  onChange={(e) => setCsvTextContent(e.target.value)}
                  placeholder=",PRODUCTOS,CANTIDAD,TIPO..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={csvUploading || !csvTextContent.trim()}
                onClick={handleImportCsvSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow disabled:opacity-50"
              >
                {csvUploading ? 'Procesando...' : 'Iniciar Importación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay isOpen={loadingOverlay.isOpen || csvUploading} message={loadingOverlay.message || "Procesando..."} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* CONFIRM DIALOG ELIMINAR */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Eliminar Producto"
        message="¿Está seguro de que desea eliminar este producto? Se eliminará de la base de datos."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={handleDeleteProduct}
        onCancel={() => {
          setShowConfirmDialog(false)
          setProductToDelete(null)
        }}
      />
    </div>
  )
}
