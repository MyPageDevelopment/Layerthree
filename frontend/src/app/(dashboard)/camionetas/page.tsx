'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import SearchableProductSelect from '@/components/SearchableProductSelect'

interface VanItem {
  id: string
  vanId: string
  productId?: string
  name: string
  sku?: string
  category: string
  type: string // MATERIAL, HERRAMIENTA
  quantity: number
  minQuantity: number
  assignedTo?: string
}

interface Van {
  id: string
  plate: string
  name: string
  driver?: string
  status: string
  notes?: string
  totalItems?: number
  toolsCount?: number
  materialsCount?: number
  items?: VanItem[]
}

interface Product {
  id: string
  sku: string
  name: string
  category: string
  subcategory?: string
  stock: number
}

function determineItemType(prod?: Product | null): 'HERRAMIENTA' | 'MATERIAL' {
  if (!prod) return 'MATERIAL'
  const subcat = (prod.subcategory || '').toLowerCase().trim()
  const name = (prod.name || '').toLowerCase().trim()

  if (subcat.includes('herramienta')) {
    return 'HERRAMIENTA'
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
    if (!subcat.includes('insumo') && !subcat.includes('material')) {
      return 'HERRAMIENTA'
    }
  }

  return 'MATERIAL'
}

export default function CamionetasPage() {
  const [vans, setVans] = useState<Van[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')

  // Modals state
  const [showVanModal, setShowVanModal] = useState(false)
  const [editingVan, setEditingVan] = useState<Van | null>(null)
  const [plate, setPlate] = useState('')
  const [name, setName] = useState('')
  const [driver, setDriver] = useState('')
  const [status, setStatus] = useState('EN_TERRENO')
  const [notes, setNotes] = useState('')

  // Manage items drawer / modal state
  const [selectedVan, setSelectedVan] = useState<Van | null>(null)
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [itemFilterType, setItemFilterType] = useState<'TODOS' | 'HERRAMIENTA' | 'MATERIAL'>('TODOS')
  const [showItemModal, setShowItemModal] = useState(false)
  const [itemProductId, setItemProductId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemSku, setItemSku] = useState('')
  const [itemCategory, setItemCategory] = useState('EQUIPOS')
  const [itemType, setItemType] = useState('HERRAMIENTA')
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [deductFromWarehouse, setDeductFromWarehouse] = useState(true)

  useEffect(() => {
    fetchVans()
    fetchProducts()
  }, [])

  const fetchVans = async () => {
    try {
      setLoading(true)
      const res = await api.get('/vans')
      if (Array.isArray(res.data)) {
        setVans(res.data)
      }
    } catch (err) {
      console.error('Error al cargar camionetas:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products')
      if (Array.isArray(res.data)) {
        setProducts(res.data)
      }
    } catch (err) {
      console.error('Error al cargar productos:', err)
    }
  }

  const handleOpenVanModal = (van?: Van) => {
    if (van) {
      setEditingVan(van)
      setPlate(van.plate)
      setName(van.name)
      setDriver(van.driver || '')
      setStatus(van.status)
      setNotes(van.notes || '')
    } else {
      setEditingVan(null)
      setPlate('')
      setName('')
      setDriver('')
      setStatus('EN_TERRENO')
      setNotes('')
    }
    setShowVanModal(true)
  }

  const handleSaveVan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingVan) {
        await api.patch(`/vans/${editingVan.id}`, { plate, name, driver, status, notes })
      } else {
        await api.post('/vans', { plate, name, driver, status, notes })
      }
      setShowVanModal(false)
      fetchVans()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar camioneta')
    }
  }

  const handleDeleteVan = async (id: string, plateName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la camioneta [${plateName}]?`)) return
    try {
      await api.delete(`/vans/${id}`)
      fetchVans()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar camioneta')
    }
  }

  const handleOpenManageItems = async (van: Van) => {
    try {
      setItemSearchTerm('')
      setItemFilterType('TODOS')
      const res = await api.get(`/vans/${van.id}`)
      setSelectedVan(res.data)
    } catch (err) {
      console.error('Error al cargar detalle de camioneta:', err)
    }
  }

  const handleSelectProduct = (prodId: string) => {
    setItemProductId(prodId)
    const prod = products.find((p) => p.id === prodId)
    if (prod) {
      setItemName(prod.name)
      setItemSku(prod.sku)
      setItemCategory(prod.category)
      setItemType(determineItemType(prod))
      setDeductFromWarehouse(true)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVan) return
    try {
      await api.post(`/vans/${selectedVan.id}/items`, {
        productId: itemProductId || undefined,
        name: itemName,
        sku: itemSku || undefined,
        category: itemCategory,
        type: itemType,
        quantity: itemQuantity,
        deductFromWarehouse,
      })
      setShowItemModal(false)
      setItemProductId('')
      setItemName('')
      setItemSku('')
      setItemQuantity(1)
      setDeductFromWarehouse(true)
      // Refresh selected van detail, full list and products list
      handleOpenManageItems(selectedVan)
      fetchVans()
      fetchProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al agregar ítem a la camioneta')
    }
  }

  const handleUpdateItemQty = async (itemId: string, newQty: number) => {
    if (!selectedVan) return
    try {
      await api.patch(`/vans/${selectedVan.id}/items/${itemId}`, { quantity: newQty })
      if (selectedVan) {
        const updatedItems = (selectedVan.items || [])
          .map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
          .filter((i) => i.quantity > 0)
        setSelectedVan({ ...selectedVan, items: updatedItems })
      }
      fetchVans()
      fetchProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar cantidad')
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedVan || !confirm('¿Deseas quitar este ítem de la camioneta?')) return
    try {
      await api.delete(`/vans/${selectedVan.id}/items/${itemId}`)
      if (selectedVan) {
        const updatedItems = (selectedVan.items || []).filter((i) => i.id !== itemId)
        setSelectedVan({ ...selectedVan, items: updatedItems })
      }
      fetchVans()
      fetchProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al quitar ítem')
    }
  }

  const filteredVans = vans.filter((v) => {
    const query = searchTerm.toLowerCase().trim()
    const activeItems = (v.items || []).filter((i) => i.quantity > 0)
    const matchesSearch =
      !query ||
      v.plate.toLowerCase().includes(query) ||
      v.name.toLowerCase().includes(query) ||
      (v.driver && v.driver.toLowerCase().includes(query)) ||
      activeItems.some((i) => i.name.toLowerCase().includes(query) || (i.sku && i.sku.toLowerCase().includes(query)))
    const matchesStatus = filterStatus === 'TODOS' || v.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Summary Metrics
  const totalVans = vans.length
  const activeVans = vans.filter((v) => v.status === 'EN_TERRENO').length
  const totalTools = vans.reduce((sum, v) => sum + (v.toolsCount || 0), 0)
  const totalMaterials = vans.reduce((sum, v) => sum + (v.materialsCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛻</span> Control Terreno - Stock por Camioneta
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Gestión y seguimiento de materiales y herramientas asignados a vehículos en terreno
          </p>
        </div>
        <button
          onClick={() => handleOpenVanModal()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg flex items-center gap-2 text-sm"
        >
          <span>➕</span> Registrar Camioneta
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-bold">
            🛻
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Vehículos</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalVans}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
            🟢
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">En Terreno</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{activeVans}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold">
            🛠️
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Herramientas</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalTools}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-bold">
            📦
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Materiales Cargados</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalMaterials}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por patente, nombre o conductor..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="EN_TERRENO">En Terreno</option>
            <option value="DISPONIBLE">Disponible en Base</option>
            <option value="MANTENCION">En Mantención</option>
          </select>
        </div>
      </div>

      {/* Vans Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Cargando flota de vehículos...</div>
      ) : filteredVans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <span className="text-4xl block">🛻</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay camionetas registradas</p>
          <p className="text-sm text-slate-500">Haz clic en "Registrar Camioneta" para dar de alta un vehículo en terreno.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVans.map((van) => {
            const statusBg =
              van.status === 'EN_TERRENO'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : van.status === 'DISPONIBLE'
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'

            return (
              <div
                key={van.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono font-bold rounded-lg text-sm tracking-wider">
                          {van.plate}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBg}`}>
                          {van.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1.5">{van.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenVanModal(van)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 transition text-sm"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteVan(van.id, van.plate)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition text-sm"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-400">👤 Conductor:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{van.driver || 'No asignado'}</span>
                    </p>
                    {van.notes && <p className="text-slate-400 italic text-[11px]">"{van.notes}"</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-center text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="block text-slate-400 font-semibold text-[10px]">HERRAMIENTAS</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">
                        {van.toolsCount || 0}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="block text-slate-400 font-semibold text-[10px]">MATERIALES</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-base">
                        {van.materialsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenManageItems(van)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <span>📦</span> Ver / Gestionar Stock ({van.totalItems || 0} ítems)
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear / Editar Camioneta */}
      {showVanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingVan ? 'Editar Camioneta' : 'Registrar Nueva Camioneta'}
              </h3>
              <button onClick={() => setShowVanModal(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVan} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Patente (Ej: AB-123-CD) *
                </label>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="Patente del vehículo"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre / Alias (Ej: Camioneta 1 - Redes) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre o modelo de la camioneta"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Conductor / Responsable habitual
                </label>
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="Nombre del técnico responsable"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                >
                  <option value="EN_TERRENO">EN TERRENO</option>
                  <option value="DISPONIBLE">DISPONIBLE EN BASE</option>
                  <option value="MANTENCION">EN MANTENCIÓN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas / Obs.</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition"
              >
                Guardar Camioneta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer para Gestionar Ítems en la Camioneta */}
      {selectedVan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded">
                    {selectedVan.plate}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedVan.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conductor: <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedVan.driver || 'No asignado'}</span>
                </p>
              </div>
              <button onClick={() => setSelectedVan(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            {/* Actions & Add Item Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>📦</span> Herramientas y Materiales Cargados
              </h4>
              <button
                onClick={() => setShowItemModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1"
              >
                <span>➕</span> Asignar Herramienta / Material
              </button>
            </div>

            {/* Inner Filter and Search in Van Modal */}
            <div className="flex flex-col sm:flex-row gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar por nombre, SKU o categoría..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-1">
                {(['TODOS', 'HERRAMIENTA', 'MATERIAL'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemFilterType(t)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                      itemFilterType === t
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Items List */}
            {(() => {
              const activeVanItems = (selectedVan.items || []).filter((item) => item.quantity > 0)
              const displayItems = activeVanItems.filter((item) => {
                const query = itemSearchTerm.toLowerCase().trim()
                const matchesText =
                  !query ||
                  item.name.toLowerCase().includes(query) ||
                  (item.sku && item.sku.toLowerCase().includes(query)) ||
                  item.category.toLowerCase().includes(query)
                const matchesType = itemFilterType === 'TODOS' || item.type === itemFilterType
                return matchesText && matchesType
              })

              if (activeVanItems.length === 0) {
                return (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
                    No hay ítems asignados a esta camioneta actualmente.
                  </div>
                )
              }

              if (displayItems.length === 0) {
                return (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
                    No se encontraron ítems que coincidan con la búsqueda o filtro seleccionados.
                  </div>
                )
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  {displayItems.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'HERRAMIENTA'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.type}
                          </span>
                          {item.sku && <span className="font-mono text-slate-400 text-[11px]">{item.sku}</span>}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white mt-1">{item.name}</p>
                        <p className="text-[10px] text-slate-400">Categoría: {item.category}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateItemQty(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center hover:bg-slate-300"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-slate-900 dark:text-white w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateItemQty(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center hover:bg-slate-300"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition"
                        title="Quitar ítem"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Sub-modal: Agregar ítem a la camioneta */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Asignar Ítem a la Camioneta</h4>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buscar y Seleccionar desde el Inventario
                </label>
                <SearchableProductSelect
                  products={products}
                  selectedProductId={itemProductId}
                  onSelectProduct={(p) => handleSelectProduct(p ? p.id : '')}
                  placeholder="🔍 Escribe para buscar por nombre, SKU o categoría..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Ítem / Herramienta *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ej: Taladro Percutor / Patch Cord Cat6"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  >
                    <option value="HERRAMIENTA">HERRAMIENTA</option>
                    <option value="MATERIAL">MATERIAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    placeholder="EQUIPOS / RED"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={itemQuantity === 0 ? '' : itemQuantity}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setItemQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold text-center"
                />
              </div>

              {itemProductId && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-blue-900 dark:text-blue-200 font-semibold">
                    <input
                      type="checkbox"
                      checked={deductFromWarehouse}
                      onChange={(e) => setDeductFromWarehouse(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Descontar {itemQuantity} del stock central de la Bodega</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition"
              >
                Confirmar Asignación
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
