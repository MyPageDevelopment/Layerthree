'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { hasModuleAccess, isAuthenticated, isAdmin } from '@/lib/auth'
import type { Product, ProductCategory } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

type FilterType = 'all' | 'low-stock'

export default function ProductosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [pendingFormData, setPendingFormData] = useState<any>(null)
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
    loadProducts()
  }, [router])

  useEffect(() => {
    filterAndSearchProducts()
  }, [products, searchTerm, filter])

  const loadProducts = async () => {
    try {
      const { data } = await api.get<Product[]>('/products')
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSearchProducts = () => {
    let result = [...products]

    // Aplicar filtro
    if (filter === 'low-stock') {
      result = result.filter(p => p.stock <= p.minStock)
    }

    // Aplicar búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        p =>
          p.sku.toLowerCase().includes(term) ||
          p.name.toLowerCase().includes(term) ||
          (p.description?.toLowerCase().includes(term) || false) ||
          p.category.toLowerCase().includes(term) ||
          (p.subcategory?.toLowerCase().includes(term) || false)
      )
    }

    setFilteredProducts(result)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPendingFormData(formData)
    setShowSaveDialog(true)
  }

  const confirmSave = async () => {
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, pendingFormData)
      } else {
        await api.post('/products', pendingFormData)
      }
      setShowSaveDialog(false)
      setShowModal(false)
      setPendingFormData(null)
      resetForm()
      loadProducts()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar el producto')
      setShowSaveDialog(false)
    }
  }

  const handleEdit = (product: Product) => {
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
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    setProductToDelete(id)
    setShowConfirmDialog(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return
    try {
      await api.delete(`/products/${productToDelete}`)
      setShowConfirmDialog(false)
      setProductToDelete(null)
      loadProducts()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar el producto')
      setShowConfirmDialog(false)
    }
  }

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'EQUIPOS' as ProductCategory,
      subcategory: '',
      stock: 0,
      minStock: 0,
      unitPrice: 0,
    })
    setEditingProduct(null)
  }

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
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Productos</h1>
          </div>
          {adminUser && (
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="bg-primary-600 hover:bg-primary-700 text-white px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base w-full sm:w-auto"
            >
              + Agregar Producto
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:gap-4">
        {/* Buscador */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por SKU, nombre, descripción, categoría o subcategoría..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md font-medium text-sm flex-1 sm:flex-none ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setFilter('low-stock')}
            className={`px-4 py-2 rounded-md font-medium text-sm flex-1 sm:flex-none ${
              filter === 'low-stock'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Stock Bajo ({products.filter(p => p.stock <= p.minStock).length})
          </button>
        </div>
      </div>

      {/* Tabla Desktop */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subcategoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Mín.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio Unit.
              </th>
              {adminUser && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.sku}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    {product.description && (
                      <div className="text-gray-500 text-xs">{product.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {product.category.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.subcategory || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.stock <= product.minStock
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.minStock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${product.unitPrice.toLocaleString()}
                </td>
                {adminUser && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
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

      {/* Vista Móvil - Cards */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                <div className="text-xs text-gray-500 mt-1">SKU: {product.sku}</div>
                <div className="flex gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {product.category.replace(/_/g, ' ')}
                  </span>
                  {product.subcategory && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {product.subcategory}
                    </span>
                  )}
                </div>
                {product.description && (
                  <div className="text-xs text-gray-400 mt-1">{product.description}</div>
                )}
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  product.stock <= product.minStock
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {product.stock}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t">
              <div>
                <span className="text-gray-400">Stock Mín:</span> {product.minStock}
              </div>
              <div>
                <span className="text-gray-400">Precio:</span> ${product.unitPrice.toLocaleString()}
              </div>
            </div>

            {adminUser && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 bg-primary-600 text-white py-2 px-3 rounded text-xs font-medium hover:bg-primary-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-xs font-medium hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sin resultados */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <textarea
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Categoría *
                      </label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value as ProductCategory })
                        }
                      >
                        <option value="EQUIPOS">Equipos</option>
                        <option value="RED">Red</option>
                        <option value="FIBRA_OPTICA">Fibra Óptica</option>
                        <option value="ELECTRICIDAD">Electricidad</option>
                        <option value="CANALIZACION">Canalización</option>
                        <option value="INSUMOS">Insumos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Subcategoría
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                        value={formData.subcategory}
                        onChange={(e) =>
                          setFormData({ ...formData, subcategory: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            stock: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock Mín.
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                        value={formData.minStock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minStock: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Precio
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900"
                        value={formData.unitPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            unitPrice: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm"
                  >
                    Guardar
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
        title="Eliminar Producto"
        message="¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmDialog(false)
          setProductToDelete(null)
        }}
        type="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      <ConfirmDialog
        isOpen={showSaveDialog}
        title={editingProduct ? "Confirmar Edición" : "Confirmar Nuevo Producto"}
        message={pendingFormData ? `
          SKU: ${pendingFormData.sku}
          Nombre: ${pendingFormData.name}
          Categoría: ${pendingFormData.category}
          ${pendingFormData.subcategory ? `Subcategoría: ${pendingFormData.subcategory}` : ''}
          Stock: ${pendingFormData.stock}
          Stock Mínimo: ${pendingFormData.minStock}
          Precio: $${pendingFormData.unitPrice.toLocaleString()}
          
          ¿Desea ${editingProduct ? 'guardar los cambios' : 'crear este producto'}?
        ` : ''}
        onConfirm={confirmSave}
        onCancel={() => {
          setShowSaveDialog(false)
          setPendingFormData(null)
        }}
        type="warning"
        confirmText={editingProduct ? "Guardar Cambios" : "Crear Producto"}
        cancelText="Cancelar"
      />
    </div>
  )
}
