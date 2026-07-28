'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { hasModuleAccess, isAuthenticated, isAdmin } from '@/lib/auth'
import { format } from 'date-fns'
import type { Movement, Product } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

type SelectedProduct = {
  productId: string
  quantity: number
}

export default function MovimientosPage() {
  const router = useRouter()
  const [movements, setMovements] = useState<Movement[]>([])
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [formData, setFormData] = useState({
    projectId: '',
    type: 'ENTRY' as 'ENTRY' | 'EXIT',
    notes: '',
  })

  const handleGoBack = () => {
    router.push('/dashboard')
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login.html'
      return
    }
    if (!hasModuleAccess('inventory')) {
      window.location.href = '/dashboard.html'
      return
    }
    loadData()
  }, [router])

  useEffect(() => {
    filterMovements()
  }, [movements, searchTerm])

  useEffect(() => {
    filterProducts()
  }, [products, productSearchTerm])

  const filterMovements = () => {
    if (!searchTerm.trim()) {
      setFilteredMovements(movements)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = movements.filter(
      m =>
        m.product?.name?.toLowerCase().includes(term) ||
        m.product?.sku?.toLowerCase().includes(term) ||
        m.projectId?.toLowerCase().includes(term) ||
        m.notes?.toLowerCase().includes(term)
    )
    setFilteredMovements(filtered)
  }

  const filterProducts = () => {
    if (!productSearchTerm.trim()) {
      setFilteredProducts(products)
      return
    }

    const term = productSearchTerm.toLowerCase()
    const filtered = products.filter(
      p =>
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.subcategory?.toLowerCase().includes(term) || false)
    )
    setFilteredProducts(filtered)
  }

  const loadData = async () => {
    try {
      const [movementsRes, productsRes] = await Promise.all([
        api.get<Movement[]>('/movements'),
        api.get<Product[]>('/products'),
      ])
      setMovements(movementsRes.data)
      setProducts(productsRes.data)
      setFilteredProducts(productsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = (productId: string) => {
    if (selectedProducts.find(p => p.productId === productId)) {
      return // Ya está agregado
    }
    setSelectedProducts([...selectedProducts, { productId, quantity: 1 }])
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId))
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.productId === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedProducts.length === 0) {
      alert('Debe seleccionar al menos un producto')
      return
    }

    const bulkData = {
      ...formData,
      items: selectedProducts,
    }
    
    setPendingFormData(bulkData)
    setShowConfirmDialog(true)
  }

  const confirmMovement = async () => {
    try {
      await api.post('/movements/bulk', pendingFormData)
      setShowConfirmDialog(false)
      setShowModal(false)
      setPendingFormData(null)
      resetForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al crear el movimiento')
      setShowConfirmDialog(false)
    }
  }

  const resetForm = () => {
    setFormData({
      projectId: '',
      type: 'ENTRY',
      notes: '',
    })
    setSelectedProducts([])
    setProductSearchTerm('')
  }

  const getProductById = (id: string) => products.find(p => p.id === id)

  const adminUser = isAdmin()

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>
  }

  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 pt-20 md:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleGoBack}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Volver</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Movimientos</h1>
          </div>
          {adminUser && (
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base w-full sm:w-auto"
            >
              + Registrar Movimiento
            </button>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por producto, SKU, proyecto o notas..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla Desktop */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proyecto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMovements.map((movement) => (
              <tr key={movement.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      movement.type === 'ENTRY'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {movement.type === 'ENTRY' ? '📥 Entrada' : '📤 Salida'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <div className="font-medium">{movement.product?.name || 'N/A'}</div>
                    {movement.product?.sku && (
                      <div className="text-xs text-gray-500">SKU: {movement.product.sku}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <span
                    className={
                      movement.type === 'ENTRY'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {movement.type === 'ENTRY' ? '+' : '-'}
                    {movement.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {movement.projectId || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {movement.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil - Cards */}
      <div className="md:hidden space-y-3">
        {filteredMovements.map((movement) => (
          <div key={movement.id} className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">
                  {movement.product?.name || 'N/A'}
                </div>
                {movement.product?.sku && (
                  <div className="text-xs text-gray-500 mt-1">SKU: {movement.product.sku}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    movement.type === 'ENTRY'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {movement.type === 'ENTRY' ? '📥 Entrada' : '📤 Salida'}
                </span>
                <span
                  className={`text-sm font-bold ${
                    movement.type === 'ENTRY' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {movement.type === 'ENTRY' ? '+' : '-'}
                  {movement.quantity}
                </span>
              </div>
            </div>
            
            {(movement.projectId || movement.notes) && (
              <div className="mt-3 pt-3 border-t space-y-1 text-xs">
                {movement.projectId && (
                  <div>
                    <span className="text-gray-400">Proyecto:</span>{' '}
                    <span className="text-gray-600">{movement.projectId}</span>
                  </div>
                )}
                {movement.notes && (
                  <div>
                    <span className="text-gray-400">Notas:</span>{' '}
                    <span className="text-gray-600">{movement.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sin resultados */}
      {filteredMovements.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-gray-500">No se encontraron movimientos</p>
        </div>
      )}

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Registrar Movimiento Múltiple
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de Movimiento
                    </label>
                    <select
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as 'ENTRY' | 'EXIT',
                        })
                      }
                    >
                      <option value="ENTRY">📥 Entrada</option>
                      <option value="EXIT">📤 Salida</option>
                    </select>
                  </div>

                  {/* Búsqueda y selección de productos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar y Agregar Productos
                    </label>
                    <div className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar por SKU, nombre, categoría..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No se encontraron productos
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer flex justify-between items-center"
                            onClick={() => handleAddProduct(product.id)}
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-xs text-gray-500">
                                SKU: {product.sku} | Stock: {product.stock}
                              </div>
                            </div>
                            {selectedProducts.find(p => p.productId === product.id) ? (
                              <span className="text-green-600 text-xs font-medium">✓ Agregado</span>
                            ) : (
                              <button
                                type="button"
                                className="text-primary-600 text-xs font-medium hover:text-primary-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddProduct(product.id)
                                }}
                              >
                                + Agregar
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Productos seleccionados */}
                  {selectedProducts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Productos Seleccionados ({selectedProducts.length})
                      </label>
                      <div className="border border-gray-300 rounded-md divide-y max-h-64 overflow-y-auto">
                        {selectedProducts.map((item) => {
                          const product = getProductById(item.productId)
                          return (
                            <div key={item.productId} className="p-3 flex items-center gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{product?.name}</div>
                                <div className="text-xs text-gray-500">SKU: {product?.sku}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.productId, parseInt(e.target.value) || 1)
                                  }
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(item.productId)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ID Proyecto *
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                      placeholder="Ej: PROJ-2024-001"
                      value={formData.projectId}
                      onChange={(e) =>
                        setFormData({ ...formData, projectId: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notas
                    </label>
                    <textarea
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                      rows={3}
                      placeholder="Observaciones adicionales..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={selectedProducts.length === 0}
                  >
                    Guardar ({selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirmar Movimiento Múltiple"
        message={pendingFormData && selectedProducts.length > 0 ? `
          Tipo: ${pendingFormData.type === 'ENTRY' ? '📥 Entrada' : '📤 Salida'}
          Productos: ${selectedProducts.length}
          ${selectedProducts.map(item => {
            const product = getProductById(item.productId)
            return `  • ${product?.name} - Cantidad: ${item.quantity}`
          }).join('\n')}
          ID Proyecto: ${pendingFormData.projectId}
          ${pendingFormData.notes ? `Notas: ${pendingFormData.notes}` : ''}
          
          ¿Desea registrar este movimiento?
        ` : ''}
        onConfirm={confirmMovement}
        onCancel={() => {
          setShowConfirmDialog(false)
          setPendingFormData(null)
        }}
        type="info"
        confirmText="Registrar Movimiento"
        cancelText="Cancelar"
      />
    </div>
  )
}
