'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User, Product } from '@/types'

interface RequestItem {
  id: string
  productId: string
  product: Product
  requestedQuantity: number
  deliveredQuantity: number
  isChecked: boolean
}

interface MaterialRequest {
  id: string
  code: string
  projectName?: string
  status: 'PENDING' | 'DISPATCHED' | 'REJECTED'
  recipientName?: string
  photoUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
  requestedBy: User
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

export default function SolicitudesPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Create Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  
  // Product Search & Filter inside modal
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS')

  // Selected items: map of productId -> quantity
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({})

  // Dispatch Modal State (For Bodeguero)
  const [dispatchRequest, setDispatchRequest] = useState<MaterialRequest | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [itemChecks, setItemChecks] = useState<Record<string, { isChecked: boolean; quantity: number }>>({})

  // Proof Photo View Modal
  const [viewPhotoRequest, setViewPhotoRequest] = useState<MaterialRequest | null>(null)

  useEffect(() => {
    setCurrentUser(getUser())
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reqRes, prodRes] = await Promise.all([
        api.get('/requests'),
        api.get('/products'),
      ])
      if (Array.isArray(reqRes.data)) setRequests(reqRes.data)
      if (Array.isArray(prodRes.data)) setProducts(prodRes.data)
    } catch (err: any) {
      console.error('Error al obtener solicitudes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter products by search query and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = selectedCategoryFilter === 'TODOS' || p.category === selectedCategoryFilter
    return matchesSearch && matchesCategory
  })

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

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    const itemsPayload = Object.entries(selectedProductQuantities).map(([productId, quantity]) => ({
      productId,
      quantity,
    }))

    if (itemsPayload.length === 0) {
      alert('Debes agregar al menos un producto a la solicitud')
      return
    }

    try {
      await api.post('/requests', {
        projectName,
        notes: requestNotes,
        items: itemsPayload,
      })

      setShowCreateModal(false)
      setProjectName('')
      setRequestNotes('')
      setSelectedProductQuantities({})
      setProductSearch('')
      setSelectedCategoryFilter('TODOS')
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear la solicitud')
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
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Opening Dispatch Modal for Bodeguero
  const handleOpenDispatchModal = (req: MaterialRequest) => {
    setDispatchRequest(req)
    setRecipientName('')
    setDispatchNotes('')
    setPhotoUrl('')
    setPhotoPreview('')
    const initialChecks: Record<string, { isChecked: boolean; quantity: number }> = {}
    req.items.forEach(item => {
      initialChecks[item.id] = { isChecked: true, quantity: item.requestedQuantity }
    })
    setItemChecks(initialChecks)
  }

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchRequest) return

    if (!recipientName.trim()) {
      alert('Debes ingresar el nombre de la persona responsable que recibe los materiales')
      return
    }

    if (!photoUrl) {
      alert('Debes adjuntar una fotografía de los materiales entregados como comprobante de despacho')
      return
    }

    const itemsPayload = Object.entries(itemChecks).map(([itemId, val]) => ({
      itemId,
      isChecked: val.isChecked,
      deliveredQuantity: val.quantity,
    }))

    try {
      await api.patch(`/requests/${dispatchRequest.id}/dispatch`, {
        recipientName,
        photoUrl,
        notes: dispatchNotes,
        items: itemsPayload,
      })

      setDispatchRequest(null)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al procesar el despacho')
    }
  }

  const canCreateRequest = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'JEFE_PROYECTO' || currentUser?.role === 'GERENTE' || currentUser?.role === 'JEFE'
  const canDispatch = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'BODEGUERO'

  const categories: string[] = ['TODOS', 'EQUIPOS', 'RED', 'FIBRA_OPTICA', 'ELECTRICIDAD', 'CANALIZACION', 'INSUMOS']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span>📑</span> Solicitudes y Pedidos de Materiales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Flujo de pedido por proyecto, comprobante fotográfico de entrega y trazabilidad.
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

      {/* Requests Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <span className="text-4xl block mb-2">📑</span>
            <p className="font-semibold text-lg">No hay solicitudes registradas</p>
            <p className="text-sm">Las solicitudes de materiales creadas por los Jefes de Proyecto aparecerán aquí.</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (For small screens) */}
            <div className="block md:hidden space-y-3">
              {requests.map((r) => {
                const isHighlighted = highlightId === r.id
                return (
                  <div
                    key={r.id}
                    className={`p-4 rounded-2xl border space-y-3 shadow-sm transition-all ${
                      isHighlighted
                        ? 'bg-blue-100/90 dark:bg-blue-950/90 border-blue-500 ring-2 ring-blue-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        {r.code}
                      </span>
                      {r.status === 'PENDING' ? (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300">
                          ⏳ Pendiente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300">
                          ✅ Despachado
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{r.projectName || 'Proyecto General'}</p>
                      <p className="text-[11px] text-slate-400">Solicitante: {r.requestedBy?.name || r.requestedBy?.email}</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                      <p className="font-semibold text-[11px] text-slate-500 uppercase">Ítems Requeridos:</p>
                      {r.items.map((item) => (
                        <p key={item.id} className="text-slate-700 dark:text-slate-300">
                          • {item.product?.name} (x{item.requestedQuantity})
                        </p>
                      ))}
                    </div>

                    {r.recipientName && (
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        👤 Receptor: {r.recipientName}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                      {r.status === 'PENDING' && canDispatch && (
                        <button
                          onClick={() => handleOpenDispatchModal(r)}
                          className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow"
                        >
                          Check & Despachar
                        </button>
                      )}
                      {r.status === 'DISPATCHED' && r.photoUrl && (
                        <button
                          onClick={() => setViewPhotoRequest(r)}
                          className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1"
                        >
                          <span>📷</span> Ver Comprobante Foto
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4 font-semibold">Código</th>
                      <th className="p-4 font-semibold">Proyecto</th>
                      <th className="p-4 font-semibold">Solicitado Por</th>
                      <th className="p-4 font-semibold">Ítems Requeridos</th>
                      <th className="p-4 font-semibold">Estado</th>
                      <th className="p-4 font-semibold">Receptor</th>
                      <th className="p-4 font-semibold text-right">Acciones & Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {requests.map((r) => {
                      const isHighlighted = highlightId === r.id
                      return (
                        <tr
                          key={r.id}
                          id={`request-row-${r.id}`}
                          className={`transition-all duration-500 ${
                            isHighlighted
                              ? 'bg-blue-100/80 dark:bg-blue-950/80 ring-2 ring-blue-500 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {r.code}
                            {isHighlighted && (
                              <span className="ml-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-sans uppercase animate-pulse">
                                Destacado
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-medium">{r.projectName || 'Proyecto General'}</td>
                          <td className="p-4 text-xs">
                            <p className="font-semibold">{r.requestedBy?.name || 'Usuario'}</p>
                            <p className="text-slate-400">{r.requestedBy?.email}</p>
                          </td>
                          <td className="p-4 text-xs space-y-1">
                            {r.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <span className={item.isChecked ? 'line-through text-slate-400' : ''}>
                                  • {item.product?.name || 'Producto'} (x{item.requestedQuantity})
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className="p-4">
                            {r.status === 'PENDING' ? (
                              <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1 w-fit">
                                <span>⏳</span> Pendiente
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1 w-fit">
                                <span>✅</span> Despachado
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {r.recipientName ? (
                              <div className="flex items-center gap-1">
                                <span>👤</span> {r.recipientName}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">Sin entregar</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {r.status === 'PENDING' && canDispatch && (
                              <button
                                onClick={() => handleOpenDispatchModal(r)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
                              >
                                Check & Despachar
                              </button>
                            )}
                            {r.status === 'DISPATCHED' && r.photoUrl && (
                              <button
                                onClick={() => setViewPhotoRequest(r)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95 flex items-center gap-1.5 ml-auto"
                              >
                                <span>📷</span> Ver Foto
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Crear Solicitud */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
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

            <form onSubmit={handleCreateRequest} className="space-y-4 text-sm">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
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

            <form onSubmit={handleConfirmDispatch} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold mb-2">Checklist de Materiales a Retirar de Bodega</label>
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {dispatchRequest.items.map((item) => {
                    const check = itemChecks[item.id] || { isChecked: true, quantity: item.requestedQuantity }
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-xs border-b border-slate-200 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
                        <label className="flex items-center space-x-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={check.isChecked}
                            onChange={(e) =>
                              setItemChecks(prev => ({
                                ...prev,
                                [item.id]: { ...check, isChecked: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 dark:border-slate-700 text-emerald-600"
                          />
                          <span className="font-medium">{item.product?.name}</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Cant:</span>
                          <input
                            type="number"
                            min="1"
                            max={item.requestedQuantity}
                            value={check.quantity}
                            onChange={(e) =>
                              setItemChecks(prev => ({
                                ...prev,
                                [item.id]: { ...check, quantity: parseInt(e.target.value) || 1 },
                              }))
                            }
                            className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center text-xs"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Persona Responsable que Recibe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Juan Pérez - Técnico Contratista"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Photo Upload Options for Bodeguero */}
              <div>
                <label className="block font-semibold mb-1">
                  📷 Fotografía de Comprobante de Entrega <span className="text-red-500">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <label className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer text-xs font-semibold transition text-center">
                    <span>📸 Sacar Foto con Cámara</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-xs font-semibold transition text-center">
                    <span>📁 Elegir de Galería / Archivos</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {photoPreview && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-emerald-500/50 max-h-48 flex justify-center bg-black">
                    <img src={photoPreview} alt="Comprobante entrega" className="max-h-48 object-contain" />
                    <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Foto Lista
                    </span>
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
                  Confirmar Entrega, Subir Foto & Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Foto de Entrega */}
      {viewPhotoRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>📷</span> Comprobante de Entrega - {viewPhotoRequest.code}
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

            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex justify-center p-2 shadow-inner">
                <img
                  src={viewPhotoRequest.photoUrl}
                  alt={`Comprobante ${viewPhotoRequest.code}`}
                  className="max-h-80 w-auto object-contain rounded-xl"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-400">Persona Responsable Receptor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">👤 {viewPhotoRequest.recipientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-400">Solicitado Por:</span>
                  <span className="font-semibold">{viewPhotoRequest.requestedBy?.name} ({viewPhotoRequest.requestedBy?.email})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="text-slate-400">Fecha Despacho:</span>
                  <span className="font-mono">{new Date(viewPhotoRequest.updatedAt).toLocaleString('es-CL')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Ítems Entregados:</span>
                  <div className="space-y-1 pl-2">
                    {viewPhotoRequest.items.map(i => (
                      <p key={i.id} className="font-semibold">• {i.product?.name} (x{i.deliveredQuantity})</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewPhotoRequest(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow"
              >
                Cerrar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
