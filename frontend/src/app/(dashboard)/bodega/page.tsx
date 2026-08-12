'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { isAdmin, canManageInventory } from '@/lib/auth'
import type { Product, Movement, ProductCategory } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import LoadingOverlay from '@/components/LoadingOverlay'
import SearchableProductSelect from '@/components/SearchableProductSelect'

type TabType = 'dashboard' | 'products' | 'movements'
type DateFilter = 'day' | 'month' | 'year' | 'all'

export default function BodegaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros Dashboard
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))

  // Búsqueda y Filtro Productos
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low-stock'>('all')

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
  })

  // Modal Edición Rápida de Montos (Bodeguero)
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null)
  const [quickUnitCost, setQuickUnitCost] = useState<number>(0)
  const [quickStock, setQuickStock] = useState<number>(0)
  const [quickUnit, setQuickUnit] = useState<string>('UN')
  const [quickListPrice, setQuickListPrice] = useState<number>(0)

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
      const [productsRes, movementsRes, vansRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Movement[]>('/movements'),
        api.get('/vans').catch(() => ({ data: [] })),
      ])
      setProducts(productsRes.data)
      setMovements(movementsRes.data)
      if (Array.isArray(vansRes.data)) setVans(vansRes.data)
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
  const lowStockList = products.filter((p) => p.stock <= p.minStock)
  const totalValue = products.reduce((sum, p) => {
    const cost = (p.unitCost && p.unitCost > 0) ? p.unitCost : (p.unitPrice || 0)
    return sum + (p.stock || 0) * cost
  }, 0)

  // Quick edit de costos por bodeguero
  const handleOpenQuickEdit = (p: Product) => {
    setQuickEditProduct(p)
    setQuickUnitCost(p.unitCost || p.unitPrice || 0)
    setQuickStock(p.stock || 0)
    const isUtp = p.name.toUpperCase().includes('UTP') || p.sku.toUpperCase().includes('UTP')
    setQuickUnit(isUtp ? 'MTS' : (p.unit || 'UN'))
    setQuickListPrice(p.listPrice || 0)
  }

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickEditProduct) return
    try {
      await api.patch(`/products/${quickEditProduct.id}`, {
        unitCost: quickUnitCost,
        unitPrice: quickUnitCost > 0 ? quickUnitCost : quickEditProduct.unitPrice,
        stock: quickStock,
        unit: quickUnit,
        listPrice: quickListPrice,
      })
      setQuickEditProduct(null)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar producto')
    }
  }

  // Filtrado Productos
  const filteredProducts = products.filter((p) => {
    if (stockFilter === 'low-stock' && p.stock > p.minStock) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      return (
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.description?.toLowerCase().includes(term) || false) ||
        p.category.toLowerCase().includes(term) ||
        (p.subcategory?.toLowerCase().includes(term) || false) ||
        (p.supplierCode?.toLowerCase().includes(term) || false)
      )
    }
    return true
  })

  // Handlers Productos
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, formData)
      } else {
        await api.post('/products', formData)
      }
      setShowProductModal(false)
      resetProductForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar producto')
    }
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await api.delete(`/products/${productToDelete}`)
      setShowConfirmDialog(false)
      setProductToDelete(null)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar producto')
      setShowConfirmDialog(false)
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
      minStock: 0,
      unitPrice: 0,
      unit: 'UN',
      unitCost: 0,
      listPrice: 0,
      supplierCode: '',
    })
    setEditingProduct(null)
  }

  // Handlers Movimientos
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = movementItems.filter(item => item.productId && item.quantity > 0)
    if (validItems.length === 0) {
      alert('Debes seleccionar al menos un producto con cantidad mayor a 0')
      return
    }

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

      setShowMovementModal(false)
      setMovementItems([{ productId: '', quantity: 1 }])
      setMovementNotes('')
      setMovementProjectId('')
      setMovementVanId('')
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al registrar movimientos de inventario')
    }
  }

  // Reportes
  const downloadReport = async (type: 'inventory' | 'movements') => {
    try {
      let url = `/reports/${type}`
      if (type === 'movements' && dateFilter !== 'all') {
        url += `?filter=${dateFilter}&date=${selectedDate}`
      }
      const response = await api.get(url, { responseType: 'blob' })
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Error al descargar el reporte')
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
          // If UTF-8 fails due to single-byte non-ASCII chars (Macintosh or Windows-1252)
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
      alert('Por favor selecciona o pega el contenido de un archivo CSV')
      return
    }
    setCsvUploading(true)
    setCsvMessage('')
    try {
      const res = await api.post('/products/import-csv', { csvText: csvTextContent })
      setCsvMessage(res.data.message || 'Importación realizada con éxito')
      loadData()
      setTimeout(() => {
        setShowCsvModal(false)
        setCsvTextContent('')
        setCsvMessage('')
      }, 2000)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al importar archivo CSV')
    } finally {
      setCsvUploading(false)
    }
  }

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'SKU,Nombre Producto,Categoria,Subcategoria,Cantidad Bodega,Unidad,Costo Unitario CLP,Costo Total Bodega CLP,Precio Lista CLP,Estado,Codigo Proveedor,Observaciones\n' +
      'LT-EMT-001,EMT 20MM X 3 MTS,Canalización Metálica (EMT/Conduit),Tuberías y Conductos,10,TIRA,2251.0,=E2*G2,3127.0,Disponible,P07872,Carga inicial\n' +
      'LT-RED-043,CABLE UTP CAT 3,Cableado Estructurado y Redes,Cables de Red y Conductores,100,MTS,1404.0,=E3*G3,2070.0,Disponible,P01928,UTP por metros'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'inventario_con_costos_y_formulas.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportCsvBackup = () => {
    if (!products || products.length === 0) {
      alert('No hay productos registrados en el inventario actual para exportar.')
      return
    }

    const headers = 'SKU,Nombre Producto,Categoria,Subcategoria,Cantidad Bodega,Unidad,Costo Unitario CLP,Costo Total Bodega CLP,Precio Lista CLP,Estado,Codigo Proveedor,Observaciones'
    const rows = products.map((p, idx) => {
      const lineNum = idx + 2
      const isUtp = (p.name || '').toUpperCase().includes('UTP') || (p.sku || '').toUpperCase().includes('UTP')
      const cleanSku = (p.sku || '').replace(/"/g, '""')
      const cleanName = (p.name || '').replace(/"/g, '""')
      const cleanCat = (p.category || '').replace(/"/g, '""')
      const cleanSubcat = (p.subcategory || '').replace(/"/g, '""')
      const qty = p.stock || 0
      const unit = isUtp ? 'MTS' : (p.unit || 'UN')
      const unitCost = p.unitCost || p.unitPrice || 0
      const formulaTotal = `=E${lineNum}*G${lineNum}`
      const listPrice = p.listPrice || 0
      const estado = qty > 0 ? 'Disponible' : 'Sin Stock'
      const provCode = (p.supplierCode || '').replace(/"/g, '""')
      const cleanObs = (p.description || '').replace(/"/g, '""')

      return `"${cleanSku}","${cleanName}","${cleanCat}","${cleanSubcat}",${qty},"${unit}",${unitCost},"${formulaTotal}",${listPrice},"${estado}","${provCode}","${cleanObs}"`
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const dateStr = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `inventario_con_costos_y_formulas_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none"
                />
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
        </div>
      )}

      {/* TAB 2: PRODUCTOS */}
      {activeTab === 'products' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <input
                type="text"
                placeholder="Buscar por SKU, nombre, categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setStockFilter(stockFilter === 'all' ? 'low-stock' : 'all')}
                className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  stockFilter === 'low-stock'
                    ? 'bg-red-100 dark:bg-red-900/60 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {stockFilter === 'low-stock' ? 'Filtro: Solo Stock Bajo' : 'Ver Solo Stock Bajo'}
              </button>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownloadCsvTemplate}
                  className="w-full sm:w-auto px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition whitespace-nowrap flex items-center justify-center gap-1.5"
                  title="Descargar plantilla CSV vacía para carga masiva"
                >
                  <span>📥</span> Descargar Planilla Base
                </button>
                <button
                  onClick={handleExportCsvBackup}
                  className="w-full sm:w-auto px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition whitespace-nowrap flex items-center justify-center gap-1.5"
                  title="Exportar inventario actual en formato CSV re-importable"
                >
                  <span>📤</span> Exportar CSV (Backup)
                </button>
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <span>📄</span> Importar CSV
                </button>
                <button
                  onClick={() => {
                    resetProductForm()
                    setShowProductModal(true)
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition whitespace-nowrap"
                >
                  + Nuevo Producto
                </button>
              </div>
            )}
          </div>

          {/* MOBILE CARDS VIEW (For small screens) */}
          <div className="block md:hidden space-y-3">
            {filteredProducts.map((product) => {
              const isUtp = product.name.toUpperCase().includes('UTP') || product.sku.toUpperCase().includes('UTP')
              const unitStr = isUtp ? 'MTS' : (product.unit || 'UN')
              const baseCost = (product.unitCost && product.unitCost > 0) ? product.unitCost : product.unitPrice
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
                      product.stock <= product.minStock
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300'
                    }`}>
                      {product.stock} {unitStr}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{product.description}</p>
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
                        onClick={() => handleOpenQuickEdit(product)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1"
                      >
                        💰 Ajustar Monto
                      </button>
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
                            unitPrice: product.unitPrice,
                            unit: isUtp ? 'MTS' : (product.unit || 'UN'),
                            unitCost: product.unitCost || product.unitPrice || 0,
                            listPrice: product.listPrice || 0,
                            supplierCode: product.supplierCode || '',
                          })
                          setShowProductModal(true)
                        }}
                        className="text-blue-600 font-semibold text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setProductToDelete(product.id)
                          setShowConfirmDialog(true)
                        }}
                        className="text-red-600 font-semibold text-xs"
                      >
                        Eliminar
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
                    <th className="px-4 py-3 font-semibold">Nombre / Código Prov.</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Stock / Unidad</th>
                    <th className="px-4 py-3 font-semibold">Costo Unit. Base</th>
                    <th className="px-4 py-3 font-semibold">Costo Total Bodega</th>
                    <th className="px-4 py-3 font-semibold">Precio Lista</th>
                    {canManage && <th className="px-4 py-3 text-right font-semibold">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredProducts.map((product) => {
                    const isUtp = product.name.toUpperCase().includes('UTP') || product.sku.toUpperCase().includes('UTP')
                    const unitStr = isUtp ? 'MTS' : (product.unit || 'UN')
                    const baseCost = (product.unitCost && product.unitCost > 0) ? product.unitCost : product.unitPrice
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
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              product.stock <= product.minStock
                                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {product.stock} {unitStr}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ${baseCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          ${totalCostVal.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          ${(product.listPrice || 0).toLocaleString('es-CL')}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenQuickEdit(product)}
                              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:underline inline-flex items-center gap-1"
                              title="Ajustar monto de costo unitario base a mano"
                            >
                              💰 Ajustar Monto
                            </button>
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
                                  unitPrice: product.unitPrice,
                                  unit: isUtp ? 'MTS' : (product.unit || 'UN'),
                                  unitCost: product.unitCost || product.unitPrice || 0,
                                  listPrice: product.listPrice || 0,
                                  supplierCode: product.supplierCode || '',
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
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition"
              >
                + Registrar Movimiento
              </button>
            )}
          </div>

          {/* MOBILE CARDS VIEW FOR MOVEMENTS */}
          <div className="block md:hidden space-y-3">
            {movements.map((m) => (
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
                  <span>Proyecto: {m.projectId || '-'}</span>
                  <span>Por: {m.user?.name || m.userId}</span>
                </div>
              </div>
            ))}
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
                  {movements.map((m) => (
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
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{m.projectId || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{m.user?.name || m.user?.email || m.userId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                >
                  <option value="EQUIPOS">EQUIPOS</option>
                  <option value="RED">RED</option>
                  <option value="FIBRA_OPTICA">FIBRA OPTICA</option>
                  <option value="ELECTRICIDAD">ELECTRICIDAD</option>
                  <option value="CANALIZACION">CANALIZACION</option>
                  <option value="INSUMOS">INSUMOS</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock === 0 ? '' : formData.stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stock Mín.</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock === 0 ? '' : formData.minStock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Precio Unit. ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPrice === 0 ? '' : formData.unitPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO MÚLTIPLE */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔄</span> Registrar Movimiento de Stock (Múltiples Materiales)
              </h3>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Movimiento</label>
                  <select
                    value={movementBatchType}
                    onChange={(e) => setMovementBatchType(e.target.value as 'ENTRY' | 'EXIT')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold"
                  >
                    <option value="ENTRY">📥 ENTRADA / Devolución a Bodega (+)</option>
                    <option value="EXIT">📤 SALIDA / Asignación (-) </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehículo / Camioneta Asignada (Opcional)</label>
                  <select
                    value={movementVanId}
                    onChange={(e) => setMovementVanId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="">-- Sin Vehículo Asignado --</option>
                    {vans.map((v) => (
                      <option key={v.id} value={v.id}>
                        🚚 {v.plate} - {v.name} ({v.driverName || 'Sin Conductor'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Código Proyecto (Opcional)</label>
                  <input
                    type="text"
                    value={movementProjectId}
                    onChange={(e) => setMovementProjectId(e.target.value)}
                    placeholder="Ej: PROJ-102"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Observaciones / Motivo</label>
                  <input
                    type="text"
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    placeholder="Ej: Recepción compra u Orden de despacho"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Items List */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Materiales a Incluir en Movimiento</h4>
                  <button
                    type="button"
                    onClick={() => setMovementItems([...movementItems, { productId: '', quantity: 1 }])}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-lg transition"
                  >
                    + Agregar Otro Material
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {movementItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex-1">
                        <SearchableProductSelect
                          products={products}
                          selectedProductId={item.productId}
                          onSelectProduct={(p) => {
                            const updated = [...movementItems]
                            updated[idx].productId = p ? p.id : ''
                            setMovementItems(updated)
                          }}
                          placeholder="🔍 Escribe para buscar por nombre, SKU..."
                        />
                      </div>

                      <div className="w-24">
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
                          className="w-full px-2.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-center font-bold"
                        />
                      </div>

                      {movementItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMovementItems(movementItems.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold px-1 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow"
                >
                  Guardar Movimiento ({movementItems.filter(i => i.productId).length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE RÁPIDO DE MONTO / COSTO (BODEGUERO) */}
      {quickEditProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>💰</span> Ajustar Monto y Costos a Mano
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{quickEditProduct.sku} - {quickEditProduct.name}</p>
              </div>
              <button
                onClick={() => setQuickEditProduct(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Costo Unitario Base CLP ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={quickUnitCost}
                  onChange={(e) => setQuickUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">Este monto calcula el Costo Total en Bodega.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickStock}
                    onChange={(e) => setQuickStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="UN">UN (Unidades)</option>
                    <option value="MTS">MTS (Metros - Cables UTP)</option>
                    <option value="TIRA">TIRA (Tiras 3m)</option>
                    <option value="ROLLOS">ROLLOS (Rollos)</option>
                    <option value="CAJAS">CAJAS (Cajas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Precio Lista CLP ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickListPrice}
                  onChange={(e) => setQuickListPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nuevo Costo Total Bodega:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ${(quickStock * quickUnitCost).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickEditProduct(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR CSV */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
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
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs border border-emerald-300 dark:border-emerald-800">
                {csvMessage}
              </div>
            )}

            <div className="space-y-3 text-xs sm:text-sm">
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

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
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

      <LoadingOverlay isOpen={csvUploading} message="Procesando e importando catálogo CSV..." />

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
