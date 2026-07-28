'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { hasModuleAccess, isAuthenticated, isAdmin } from '@/lib/auth'
import type { Product, Movement } from '@/types'

type DateFilter = 'day' | 'month' | 'year' | 'all'

export default function DashboardPage() {
  const router = useRouter()
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalMovements: 0,
    totalValue: 0,
  })
  const [recentMovements, setRecentMovements] = useState<Movement[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('📊 Dashboard - Verificando autenticación...');
    const authenticated = isAuthenticated();
    console.log('🔐 Autenticado:', authenticated);
    
    if (!authenticated) {
      console.log('❌ No autenticado, redirigiendo a login principal...');
      window.location.href = '/login.html'
      return
    }

    const canUseInventory = hasModuleAccess('inventory')
    if (!canUseInventory) {
      console.log('🚫 Usuario sin acceso a inventario, redirigiendo a dashboard principal...');
      window.location.href = '/dashboard.html'
      return
    }
    
    console.log('✅ Usuario autenticado, cargando dashboard...');
    loadDashboard()
  }, [router])

  useEffect(() => {
    // Recargar cuando cambien los filtros de fecha
    const authenticated = isAuthenticated()
    if (authenticated && !loading) {
      loadDashboard()
    }
  }, [dateFilter, selectedDate])

  const filterMovementsByDate = (movements: Movement[]) => {
    if (dateFilter === 'all') return movements

    const start = new Date(`${selectedDate}T00:00:00`)
    const end = new Date(`${selectedDate}T23:59:59.999`)

    return movements.filter((movement) => {
      const movementDate = new Date(movement.createdAt)

      switch (dateFilter) {
        case 'day':
          return movementDate >= start && movementDate <= end
        case 'month':
          return (
            movementDate.getMonth() === start.getMonth() &&
            movementDate.getFullYear() === start.getFullYear()
          )
        case 'year':
          return movementDate.getFullYear() === start.getFullYear()
        default:
          return true
      }
    })
  }

  const loadDashboard = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Movement[]>('/movements'),
      ])

      const products = productsRes.data
      const allMovements = movementsRes.data
      const filteredMovements = filterMovementsByDate(allMovements)

      const lowStock = products.filter((p) => p.stock <= p.minStock)
      const totalValue = products.reduce((sum, p) => sum + p.stock * p.unitPrice, 0)

      setStats({
        totalProducts: products.length,
        lowStock: lowStock.length,
        totalMovements: filteredMovements.length,
        totalValue,
      })

      setLowStockProducts(lowStock.slice(0, 5))
      setRecentMovements(filteredMovements.slice(0, 10))
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async (type: 'inventory' | 'movements') => {
    try {
      let url = `/reports/${type}`
      
      // Agregar parámetros de fecha si es reporte de movimientos
      if (type === 'movements' && dateFilter !== 'all') {
        const params = new URLSearchParams({
          filter: dateFilter,
          date: selectedDate,
        })
        url += `?${params.toString()}`
      }
      
      const response = await api.get(url, {
        responseType: 'blob',
      })
      
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = downloadUrl
      
      const filterSuffix = dateFilter !== 'all' ? `_${dateFilter}_${selectedDate}` : ''
      const filename = `${type}${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('download', filename)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Error al descargar el reporte')
    }
  }

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>
  }

  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6 pb-20 md:pb-6">
      <div className="mb-4 sm:mb-6 pt-20 md:pt-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Bodega Layerthree - Control de Inventario</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => downloadReport('inventory')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2"
              >
                📦 Exportar Inventario
              </button>
              <button
                onClick={() => downloadReport('movements')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2"
              >
                📊 Exportar Movimientos
              </button>
            </div>
          </div>

          {/* Filtros de Fecha */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label className="text-sm font-medium text-gray-700 min-w-fit">
                Filtrar por:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📅 Histórico
                </button>
                <button
                  onClick={() => setDateFilter('day')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'day'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📆 Día
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'month'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🗓️ Mes
                </button>
                <button
                  onClick={() => setDateFilter('year')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'year'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📊 Año
                </button>
              </div>
              {dateFilter !== 'all' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 mb-6 sm:mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl sm:text-3xl">📦</div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Total Productos
                  </dt>
                  <dd className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl sm:text-3xl">⚠️</div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Stock Bajo
                  </dt>
                  <dd className="text-xl sm:text-2xl font-bold text-red-600">
                    {stats.lowStock}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl sm:text-3xl">🔄</div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Movimientos
                  </dt>
                  <dd className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalMovements}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl sm:text-3xl">💰</div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Valor Total
                  </dt>
                  <dd className="text-base sm:text-2xl font-bold text-green-600">
                    ${stats.totalValue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Productos con Stock Bajo
          </h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No hay productos con stock bajo</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium truncate">{product.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">SKU: {product.sku}</p>
                    <div className="flex gap-1 mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category.replace(/_/g, ' ')}
                      </span>
                      {product.subcategory && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {product.subcategory}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm sm:text-base text-red-600 font-bold">{product.stock} uds</p>
                    <p className="text-xs text-gray-500">
                      Mín: {product.minStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center justify-between">
            <span>Resumen de Movimientos</span>
            <span className="text-sm text-gray-500">
              {dateFilter === 'all' ? 'Histórico' : dateFilter === 'day' ? 'Hoy' : dateFilter === 'month' ? 'Este mes' : 'Este año'}
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📥</span>
                <span className="text-xs font-medium text-green-700 uppercase">Entradas</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {recentMovements.filter(m => m.type === 'ENTRY').length}
              </p>
              <p className="text-xs text-green-600 mt-1">movimientos</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📤</span>
                <span className="text-xs font-medium text-red-700 uppercase">Salidas</span>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {recentMovements.filter(m => m.type === 'EXIT').length}
              </p>
              <p className="text-xs text-red-600 mt-1">movimientos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
