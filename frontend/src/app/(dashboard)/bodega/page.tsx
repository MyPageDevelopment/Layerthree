'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { isAdmin } from '@/lib/auth'
import type { Product, Movement, ProductCategory } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

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
  })

  // Formulario Movimiento
  const [movementForm, setMovementForm] = useState({
    productId: '',
    projectId: '',
    type: 'ENTRY' as 'ENTRY' | 'EXIT',
    quantity: 1,
    notes: '',
  })
  const [showMovementModal, setShowMovementModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsRes, movementsRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Movement[]>('/movements'),
      ])
      setProducts(productsRes.data)
      setMovements(movementsRes.data)
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
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.unitPrice, 0)

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
        (p.subcategory?.toLowerCase().includes(term) || false)
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
    })
    setEditingProduct(null)
  }

  // Handlers Movimientos
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/movements', movementForm)
      setShowMovementModal(false)
      setMovementForm({ productId: '', projectId: '', type: 'ENTRY', quantity: 1, notes: '' })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al registrar movimiento')
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

  const admin = isAdmin()

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
            {admin && (
              <button
                onClick={() => {
                  resetProductForm()
                  setShowProductModal(true)
                }}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition whitespace-nowrap"
              >
                + Nuevo Producto
              </button>
            )}
          </div>

          {/* MOBILE CARDS VIEW (For small screens) */}
          <div className="block md:hidden space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">
                      SKU: {product.sku}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{product.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    product.stock <= product.minStock
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  }`}>
                    Stock: {product.stock}
                  </span>
                </div>

                {product.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{product.description}</p>
                )}

                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px]">
                    {product.category}
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    ${product.unitPrice.toLocaleString('es-CL')}
                  </span>
                </div>

                {admin && (
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
                          unitPrice: product.unitPrice,
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
            ))}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Categoría</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Precio Unit.</th>
                    {admin && <th className="px-4 py-3 text-right font-semibold">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white font-mono">{product.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{product.name}</p>
                        {product.description && <p className="text-xs text-slate-500 dark:text-slate-400">{product.description}</p>}
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
                          {product.stock} (Mín: {product.minStock})
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">${product.unitPrice.toLocaleString('es-CL')}</td>
                      {admin && (
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
                                unitPrice: product.unitPrice,
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
                  ))}
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stock Mín.</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Precio Unit.</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
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

      {/* MODAL MOVIMIENTO */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Registrar Movimiento de Stock</h3>
            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Producto</label>
                <select
                  required
                  value={movementForm.productId}
                  onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                >
                  <option value="">Seleccione un producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo Movimiento</label>
                  <select
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as 'ENTRY' | 'EXIT' })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  >
                    <option value="ENTRY">ENTRADA (Stock +)</option>
                    <option value="EXIT">SALIDA (Stock -)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ID Proyecto (Opcional)</label>
                <input
                  type="text"
                  value={movementForm.projectId}
                  onChange={(e) => setMovementForm({ ...movementForm, projectId: e.target.value })}
                  placeholder="Ej: PROJ-102"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
