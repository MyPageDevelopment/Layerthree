'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import SearchableProductSelect from '@/components/SearchableProductSelect'
import ChileanDatePicker from '@/components/ChileanDatePicker'
import { downloadFile } from '@/lib/download'

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

interface AttachedImage {
  id: string
  name: string
  url: string
}

interface VanMaintenance {
  id: string
  vanId: string
  date: string
  mileage?: number | null
  type: string // PREVENTIVA, CORRECTIVA, CAMBIO_ACEITE, NEUMATICOS, FRENOS, BATERIA, SISTEMA_ELECTRICO, SUSPENSION, REVISION_TECNICA, OTRO
  title: string
  description: string
  cost: number
  workshop?: string | null
  invoiceNumber?: string | null
  imageUrl?: string | null
  imageName?: string | null
  imagesJson?: string | null
  performedBy?: string | null
  createdAt?: string
  van?: {
    id: string
    plate: string
    name: string
    driver?: string | null
  }
}

interface VanEppDelivery {
  id: string
  vanId: string
  recipientName: string
  deliveryDate: string
  eppItems: string
  documentUrl?: string | null
  documentName?: string | null
  notes?: string | null
  createdAt?: string
  van?: {
    id: string
    plate: string
    name: string
    driver?: string | null
  }
}

interface Van {
  id: string
  plate: string
  name: string
  driver?: string
  status: string
  notes?: string
  mileage?: number
  lastOilChangeKm?: number
  nextOilChangeKm?: number
  lastOilChangeDate?: string
  lastTireChangeDate?: string
  technicalReviewDate?: string
  insuranceExpiryDate?: string
  permisoCirculacionDate?: string
  totalItems?: number
  toolsCount?: number
  materialsCount?: number
  items?: VanItem[]
  maintenances?: VanMaintenance[]
  totalMaintenanceCost?: number
  maintenancesCount?: number
  eppDeliveries?: VanEppDelivery[]
  eppDeliveriesCount?: number
  lastEppDate?: string | Date | null
}

const COMMON_EPP_OPTIONS = [
  'Casco Dieléctrico con barbiquejo',
  'Lentes de Seguridad (Claro / Oscuro)',
  'Zapatos de Seguridad Dieléctricos',
  'Chaleco Reflectante Geólogo',
  'Guantes de Cabritilla / Antipatadas',
  'Guantes Dieléctricos Alta Tensión',
  'Arnés de Seguridad con Cabo de Vida',
  'Protector Auditivo Tipo Fono',
  'Respirador / Mascarilla con Filtro',
  'Ropa de Trabajo Térmica / Impermeable',
]

interface Product {
  id: string
  sku: string
  name: string
  category: string
  subcategory?: string
  stock: number
}

// Format date strictly as DD/MM/AAAA (Chilean format)
function formatChileanDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 's/r'
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString()
  const clean = str.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  return clean
}

// Convert date string/Date to YYYY-MM-DD for <input type="date">
function toDateInputValue(d?: string | Date | null): string {
  if (!d) return ''
  const str = typeof d === 'string' ? d : d.toISOString()
  const clean = str.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  return ''
}

// Normalize date to noon UTC ISO string to prevent timezone offset rollback
function parseDateToNoonIso(dateStr?: string | null): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined
  const s = dateStr.trim()
  // DD/MM/YYYY or DD-MM-YYYY
  if (/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.test(s)) {
    const match = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00.000Z`
    }
  }
  // YYYY-MM-DD
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(s)) {
    return `${s}T12:00:00.000Z`
  }
  return s
}

const MAINTENANCE_TYPES = [
  { value: 'PREVENTIVA', label: '🔧 Mantención Preventiva', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'CORRECTIVA', label: '🛠️ Mantención Correctiva / Reparación', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { value: 'CAMBIO_ACEITE', label: '🛢️ Cambio de Aceite y Filtros', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { value: 'NEUMATICOS', label: '🛞 Cambio o Reparación de Neumáticos', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { value: 'FRENOS', label: '🛑 Frenos (Pastillas / Discos)', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { value: 'BATERIA', label: '🔋 Batería y Sistema de Carga', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { value: 'SISTEMA_ELECTRICO', label: '⚡ Sistema Eléctrico y Luces', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { value: 'SUSPENSION', label: '⚙️ Suspensión y Dirección', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { value: 'REVISION_TECNICA', label: '📋 Revisión Técnica / Certificación', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  { value: 'OTRO', label: '📦 Otro Servicio', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
]

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

  // Top Tabs
  const [activeMainTab, setActiveMainTab] = useState<'STOCK' | 'MANTENCIONES' | 'EPP'>('STOCK')

  // Modals state - Van Edit/Create
  const [showVanModal, setShowVanModal] = useState(false)
  const [editingVan, setEditingVan] = useState<Van | null>(null)
  const [plate, setPlate] = useState('')
  const [name, setName] = useState('')
  const [driver, setDriver] = useState('')
  const [status, setStatus] = useState('EN_TERRENO')
  const [notes, setNotes] = useState('')

  // Vehicle Maintenance & Technical Info states (Ficha)
  const [mileage, setMileage] = useState<number | ''>('')
  const [lastOilChangeKm, setLastOilChangeKm] = useState<number | ''>('')
  const [nextOilChangeKm, setNextOilChangeKm] = useState<number | ''>('')
  const [lastOilChangeDate, setLastOilChangeDate] = useState('')
  const [lastTireChangeDate, setLastTireChangeDate] = useState('')
  const [technicalReviewDate, setTechnicalReviewDate] = useState('')
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('')
  const [permisoCirculacionDate, setPermisoCirculacionDate] = useState('')

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

  // Removal modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [itemToRemove, setItemToRemove] = useState<VanItem | null>(null)
  const [removeQty, setRemoveQty] = useState<number>(1)
  const [returnToWarehouse, setReturnToWarehouse] = useState<boolean>(true)
  const [removeNotes, setRemoveNotes] = useState<string>('')
  const [isSubmittingRemove, setIsSubmittingRemove] = useState<boolean>(false)

  // Maintenance Management State
  const [selectedVanForMaintenance, setSelectedVanForMaintenance] = useState<Van | null>(null)
  const [vanMaintenances, setVanMaintenances] = useState<VanMaintenance[]>([])
  const [loadingMaintenances, setLoadingMaintenances] = useState(false)
  const [maintenanceFilterType, setMaintenanceFilterType] = useState<string>('TODOS')

  // Create / Edit Maintenance Modal
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<VanMaintenance | null>(null)
  const [maintVanId, setMaintVanId] = useState<string>('')
  const [maintDate, setMaintDate] = useState<string>(toDateInputValue(new Date()))
  const [maintType, setMaintType] = useState<string>('PREVENTIVA')
  const [maintTitle, setMaintTitle] = useState<string>('')
  const [maintDescription, setMaintDescription] = useState<string>('')
  const [maintCost, setMaintCost] = useState<number | ''>('')
  const [maintMileage, setMaintMileage] = useState<number | ''>('')
  const [maintWorkshop, setMaintWorkshop] = useState<string>('')
  const [maintInvoiceNumber, setMaintInvoiceNumber] = useState<string>('')
  const [maintImages, setMaintImages] = useState<AttachedImage[]>([])
  const [maintUpdateMileage, setMaintUpdateMileage] = useState<boolean>(true)
  const [maintUpdateOil, setMaintUpdateOil] = useState<boolean>(false)
  const [maintUpdateTires, setMaintUpdateTires] = useState<boolean>(false)
  const [maintNextOilKm, setMaintNextOilKm] = useState<number | ''>('')
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false)

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null)

  // EPP Management State
  const [eppDeliveries, setEppDeliveries] = useState<VanEppDelivery[]>([])
  const [loadingEpp, setLoadingEpp] = useState<boolean>(false)
  const [selectedVanForEpp, setSelectedVanForEpp] = useState<string>('TODAS')
  const [showEppModal, setShowEppModal] = useState<boolean>(false)
  const [eppVanId, setEppVanId] = useState<string>('')
  const [eppRecipientName, setEppRecipientName] = useState<string>('')
  const [eppDeliveryDate, setEppDeliveryDate] = useState<string>(toDateInputValue(new Date()))
  const [selectedEppItems, setSelectedEppItems] = useState<string[]>([])
  const [customEppText, setCustomEppText] = useState<string>('')
  const [eppDocumentUrl, setEppDocumentUrl] = useState<string>('')
  const [eppDocumentName, setEppDocumentName] = useState<string>('')
  const [eppNotes, setEppNotes] = useState<string>('')
  const [isSavingEpp, setIsSavingEpp] = useState<boolean>(false)
  const [zoomedEppDoc, setZoomedEppDoc] = useState<{ url: string; title: string; isPdf?: boolean } | null>(null)

  useEffect(() => {
    fetchVans()
    fetchProducts()
    fetchEppDeliveries()
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

  // Load Maintenances for a Van
  const handleOpenMaintenancePanel = async (van: Van) => {
    setSelectedVanForMaintenance(van)
    setMaintenanceFilterType('TODOS')
    try {
      setLoadingMaintenances(true)
      const res = await api.get(`/vans/${van.id}/maintenances`)
      if (Array.isArray(res.data)) {
        setVanMaintenances(res.data)
      }
    } catch (err) {
      console.error('Error al cargar mantenciones:', err)
    } finally {
      setLoadingMaintenances(false)
    }
  }

  const refreshSelectedVanMaintenances = async (vanId: string) => {
    try {
      setLoadingMaintenances(true)
      const res = await api.get(`/vans/${vanId}/maintenances`)
      if (Array.isArray(res.data)) {
        setVanMaintenances(res.data)
      }
      // Also refresh the van list to update badges and totals
      fetchVans()
    } catch (err) {
      console.error('Error al refrescar mantenciones:', err)
    } finally {
      setLoadingMaintenances(false)
    }
  }

  const getVanAlerts = (van: Van) => {
    const alerts: { type: 'EXPIRED' | 'WARNING'; title: string; detail: string; field: string }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkDateDoc = (dateStr: string | undefined, label: string, field: string) => {
      if (!dateStr) return
      const clean = dateStr.split('T')[0]
      const parts = clean.split('-').map(Number)
      if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return
      const [y, m, d] = parts

      const expDate = new Date(y, m - 1, d)
      expDate.setHours(0, 0, 0, 0)

      const diffTime = expDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`

      if (diffDays < 0) {
        alerts.push({
          type: 'EXPIRED',
          title: `🔴 Vencido: ${label}`,
          detail: `Venció el ${formattedDate} (${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'día' : 'días'} atrás)`,
          field,
        })
      } else if (diffDays === 0) {
        alerts.push({
          type: 'EXPIRED',
          title: `🚨 Vence HOY: ${label}`,
          detail: `Fecha de vencimiento: ${formattedDate}`,
          field,
        })
      } else if (diffDays <= 30) {
        alerts.push({
          type: 'WARNING',
          title: `⚠️ Por vencer: ${label}`,
          detail: `Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'} (${formattedDate})`,
          field,
        })
      }
    }

    checkDateDoc(van.technicalReviewDate, 'Rev. Técnica', 'technicalReviewDate')
    checkDateDoc(van.insuranceExpiryDate, 'Seguro SOAP', 'insuranceExpiryDate')
    checkDateDoc(van.permisoCirculacionDate, 'Permiso de Circulación', 'permisoCirculacionDate')

    if (
      van.mileage !== undefined &&
      van.mileage !== null &&
      van.nextOilChangeKm !== undefined &&
      van.nextOilChangeKm !== null &&
      van.nextOilChangeKm > 0
    ) {
      const diffKm = van.nextOilChangeKm - van.mileage
      if (diffKm <= 0) {
        alerts.push({
          type: 'EXPIRED',
          title: '🔴 Vencido: Cambio de Aceite',
          detail: `Excedido por ${Math.abs(diffKm).toLocaleString('es-CL')} KM (${van.mileage.toLocaleString('es-CL')} / ${van.nextOilChangeKm.toLocaleString('es-CL')} KM)`,
          field: 'nextOilChangeKm',
        })
      } else if (diffKm <= 1000) {
        alerts.push({
          type: 'WARNING',
          title: '⚠️ Por vencer: Cambio de Aceite',
          detail: `Faltan ${diffKm.toLocaleString('es-CL')} KM (${van.mileage.toLocaleString('es-CL')} / ${van.nextOilChangeKm.toLocaleString('es-CL')} KM)`,
          field: 'nextOilChangeKm',
        })
      }
    }

    return alerts
  }

  const handleOpenVanModal = (van?: Van) => {
    if (van) {
      setEditingVan(van)
      setPlate(van.plate)
      setName(van.name)
      setDriver(van.driver || '')
      setStatus(van.status)
      setNotes(van.notes || '')
      setMileage(van.mileage ?? '')
      setLastOilChangeKm(van.lastOilChangeKm ?? '')
      setNextOilChangeKm(van.nextOilChangeKm ?? '')
      setLastOilChangeDate(toDateInputValue(van.lastOilChangeDate))
      setLastTireChangeDate(toDateInputValue(van.lastTireChangeDate))
      setTechnicalReviewDate(toDateInputValue(van.technicalReviewDate))
      setInsuranceExpiryDate(toDateInputValue(van.insuranceExpiryDate))
      setPermisoCirculacionDate(toDateInputValue(van.permisoCirculacionDate))
    } else {
      setEditingVan(null)
      setPlate('')
      setName('')
      setDriver('')
      setStatus('EN_TERRENO')
      setNotes('')
      setMileage('')
      setLastOilChangeKm('')
      setNextOilChangeKm('')
      setLastOilChangeDate('')
      setLastTireChangeDate('')
      setTechnicalReviewDate('')
      setInsuranceExpiryDate('')
      setPermisoCirculacionDate('')
    }
    setShowVanModal(true)
  }

  const handleSaveVan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        plate,
        name,
        driver: driver || undefined,
        status,
        notes: notes || undefined,
        mileage: mileage !== '' ? Number(mileage) : undefined,
        lastOilChangeKm: lastOilChangeKm !== '' ? Number(lastOilChangeKm) : undefined,
        nextOilChangeKm: nextOilChangeKm !== '' ? Number(nextOilChangeKm) : undefined,
        lastOilChangeDate: parseDateToNoonIso(lastOilChangeDate),
        lastTireChangeDate: parseDateToNoonIso(lastTireChangeDate),
        technicalReviewDate: parseDateToNoonIso(technicalReviewDate),
        insuranceExpiryDate: parseDateToNoonIso(insuranceExpiryDate),
        permisoCirculacionDate: parseDateToNoonIso(permisoCirculacionDate),
      }

      if (editingVan) {
        await api.patch(`/vans/${editingVan.id}`, payload)
      } else {
        await api.post('/vans', payload)
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

  // Manage Items
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

  const handleSelectProduct = (prod: any) => {
    if (!prod) {
      setItemProductId('')
      return
    }
    setItemProductId(prod.id)
    setItemName(prod.name)
    setItemSku(prod.sku)
    setItemCategory(prod.category || 'EQUIPOS')
    setItemType(determineItemType(prod))
    setDeductFromWarehouse(true)
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

  const handleOpenRemoveModal = (item: VanItem, initialQty?: number) => {
    setItemToRemove(item)
    setRemoveQty(initialQty !== undefined ? Math.min(initialQty, item.quantity) : item.quantity)
    setReturnToWarehouse(true)
    setRemoveNotes('')
    setShowRemoveModal(true)
  }

  const handleConfirmRemoval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVan || !itemToRemove) return
    try {
      setIsSubmittingRemove(true)
      await api.post(`/vans/${selectedVan.id}/items/${itemToRemove.id}/remove`, {
        quantity: removeQty,
        returnToWarehouse,
        notes: removeNotes || undefined,
      })
      setShowRemoveModal(false)
      setItemToRemove(null)
      setRemoveNotes('')
      handleOpenManageItems(selectedVan)
      fetchVans()
      fetchProducts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al procesar el retiro del ítem')
    } finally {
      setIsSubmittingRemove(false)
    }
  }

  /* ============================================================
     MANAGE VEHICLE MAINTENANCES & IMAGES
     ============================================================ */

  const handleOpenAddMaintenanceModal = (vanId?: string, existing?: VanMaintenance) => {
    if (existing) {
      setEditingMaintenance(existing)
      setMaintVanId(existing.vanId)
      setMaintDate(toDateInputValue(existing.date))
      setMaintType(existing.type)
      setMaintTitle(existing.title)
      setMaintDescription(existing.description)
      setMaintCost(existing.cost ?? '')
      setMaintMileage(existing.mileage ?? '')
      setMaintWorkshop(existing.workshop || '')
      setMaintInvoiceNumber(existing.invoiceNumber || '')
      setMaintUpdateMileage(false)
      setMaintUpdateOil(existing.type === 'CAMBIO_ACEITE')
      setMaintUpdateTires(existing.type === 'NEUMATICOS')
      setMaintNextOilKm('')

      // Parse existing images
      let parsedImages: AttachedImage[] = []
      if (existing.imagesJson) {
        try {
          parsedImages = JSON.parse(existing.imagesJson)
        } catch {}
      } else if (existing.imageUrl) {
        parsedImages = [{ id: 'img-1', name: existing.imageName || 'Comprobante', url: existing.imageUrl }]
      }
      setMaintImages(parsedImages)
    } else {
      const targetVanId = vanId || selectedVanForMaintenance?.id || (vans.length > 0 ? vans[0].id : '')
      const currentVan = vans.find((v) => v.id === targetVanId)
      setEditingMaintenance(null)
      setMaintVanId(targetVanId)
      setMaintDate(toDateInputValue(new Date()))
      setMaintType('PREVENTIVA')
      setMaintTitle('')
      setMaintDescription('')
      setMaintCost('')
      setMaintMileage(currentVan?.mileage ?? '')
      setMaintWorkshop('')
      setMaintInvoiceNumber('')
      setMaintImages([])
      setMaintUpdateMileage(true)
      setMaintUpdateOil(false)
      setMaintUpdateTires(false)
      setMaintNextOilKm(currentVan?.mileage ? currentVan.mileage + 10000 : '')
    }
    setShowMaintenanceModal(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Url = event.target?.result as string
        if (base64Url) {
          const newImg: AttachedImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            url: base64Url,
          }
          setMaintImages((prev) => [...prev, newImg])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleRemoveImage = (imgId: string) => {
    setMaintImages((prev) => prev.filter((img) => img.id !== imgId))
  }

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintVanId) {
      alert('Debes seleccionar una camioneta')
      return
    }

    try {
      setIsSavingMaintenance(true)
      const payload: any = {
        date: parseDateToNoonIso(maintDate),
        type: maintType,
        title: maintTitle,
        description: maintDescription,
        cost: maintCost !== '' ? Number(maintCost) : 0,
        mileage: maintMileage !== '' ? Number(maintMileage) : undefined,
        workshop: maintWorkshop || undefined,
        invoiceNumber: maintInvoiceNumber || undefined,
        imagesJson: maintImages.length > 0 ? JSON.stringify(maintImages) : undefined,
        imageUrl: maintImages.length > 0 ? maintImages[0].url : undefined,
        imageName: maintImages.length > 0 ? maintImages[0].name : undefined,
        updateVanMileage: maintUpdateMileage,
        updateVanOil: maintUpdateOil || maintType === 'CAMBIO_ACEITE',
        updateVanTires: maintUpdateTires || maintType === 'NEUMATICOS',
        nextOilChangeKm: maintNextOilKm !== '' ? Number(maintNextOilKm) : undefined,
      }

      if (editingMaintenance) {
        await api.patch(`/vans/${maintVanId}/maintenances/${editingMaintenance.id}`, payload)
      } else {
        await api.post(`/vans/${maintVanId}/maintenances`, payload)
      }

      setShowMaintenanceModal(false)
      if (selectedVanForMaintenance && selectedVanForMaintenance.id === maintVanId) {
        refreshSelectedVanMaintenances(maintVanId)
      } else {
        fetchVans()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar mantención')
    } finally {
      setIsSavingMaintenance(false)
    }
  }

  const handleDeleteMaintenance = async (vanId: string, maintenanceId: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de mantención "${title}"?`)) return
    try {
      await api.delete(`/vans/${vanId}/maintenances/${maintenanceId}`)
      if (selectedVanForMaintenance) {
        refreshSelectedVanMaintenances(vanId)
      }
      fetchVans()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar mantención')
    }
  }

  // ==========================================
  // EPP MANAGEMENT HANDLERS & LOGIC
  // ==========================================
  const fetchEppDeliveries = async (targetVanId?: string) => {
    try {
      setLoadingEpp(true)
      const endpoint = targetVanId && targetVanId !== 'TODAS'
        ? `/vans/${targetVanId}/epp-deliveries`
        : '/vans/epp-deliveries/all'
      const res = await api.get(endpoint)
      if (Array.isArray(res.data)) {
        setEppDeliveries(res.data)
      }
    } catch (err) {
      console.error('Error al cargar entregas de EPP:', err)
    } finally {
      setLoadingEpp(false)
    }
  }

  const handleOpenAddEppModal = (vanId?: string) => {
    const defaultVanId = vanId || (selectedVanForEpp !== 'TODAS' ? selectedVanForEpp : vans[0]?.id || '')
    const currentVan = vans.find((v) => v.id === defaultVanId)
    setEppVanId(defaultVanId)
    setEppRecipientName(currentVan?.driver || '')
    setEppDeliveryDate(toDateInputValue(new Date()))
    setSelectedEppItems([])
    setCustomEppText('')
    setEppDocumentUrl('')
    setEppDocumentName('')
    setEppNotes('')
    setShowEppModal(true)
  }

  const handleToggleEppItem = (item: string) => {
    setSelectedEppItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  const handleUploadEppDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Url = event.target?.result as string
      if (base64Url) {
        setEppDocumentUrl(base64Url)
        setEppDocumentName(file.name)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveEppDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eppVanId) {
      alert('Debes seleccionar una camioneta')
      return
    }

    const itemsSummary = [
      ...selectedEppItems,
      ...(customEppText.trim() ? [customEppText.trim()] : []),
    ].join(', ')

    if (!itemsSummary) {
      alert('Debes seleccionar o escribir al menos un elemento de EPP entregado')
      return
    }

    setIsSavingEpp(true)
    try {
      await api.post(`/vans/${eppVanId}/epp-deliveries`, {
        recipientName: eppRecipientName || 'Trabajador / Cuadrilla',
        deliveryDate: parseDateToNoonIso(eppDeliveryDate) || new Date().toISOString(),
        eppItems: itemsSummary,
        documentUrl: eppDocumentUrl || undefined,
        documentName: eppDocumentName || undefined,
        notes: eppNotes || undefined,
      })

      setShowEppModal(false)
      fetchEppDeliveries(selectedVanForEpp)
      fetchVans()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar entrega de EPP')
    } finally {
      setIsSavingEpp(false)
    }
  }

  const handleDeleteEppDelivery = async (deliveryId: string, recipientName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el comprobante de entrega de EPP para "${recipientName}"?`)) return
    try {
      await api.delete(`/vans/epp-deliveries/${deliveryId}`)
      fetchEppDeliveries(selectedVanForEpp)
      fetchVans()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar entrega de EPP')
    }
  }

  // Filtered lists
  const filteredVans = vans.filter((v) => {
    const query = searchTerm.toLowerCase().trim()
    const activeItems = (v.items || []).filter((i) => i.quantity > 0)
    const matchesSearch =
      !query ||
      v.plate.toLowerCase().includes(query) ||
      v.name.toLowerCase().includes(query) ||
      (v.driver && v.driver.toLowerCase().includes(query)) ||
      activeItems.some((i) => i.name.toLowerCase().includes(query) || (i.sku && i.sku.toLowerCase().includes(query)))

    const alerts = getVanAlerts(v)
    const matchesStatus =
      filterStatus === 'TODOS'
        ? true
        : filterStatus === 'CON_ALERTAS'
        ? alerts.length > 0
        : v.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // All fleet maintenances
  const allFleetMaintenances = vans.flatMap((v) =>
    (v.maintenances || []).map((m) => ({
      ...m,
      van: { id: v.id, plate: v.plate, name: v.name, driver: v.driver },
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredFleetMaintenances = allFleetMaintenances.filter((m) => {
    const query = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !query ||
      m.title.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      (m.workshop && m.workshop.toLowerCase().includes(query)) ||
      (m.invoiceNumber && m.invoiceNumber.toLowerCase().includes(query)) ||
      (m.van && (m.van.plate.toLowerCase().includes(query) || m.van.name.toLowerCase().includes(query)))

    const matchesType = maintenanceFilterType === 'TODOS' || m.type === maintenanceFilterType
    return matchesSearch && matchesType
  })

  // All fleet EPP deliveries
  const allFleetEppDeliveries = vans.flatMap((v) =>
    (v.eppDeliveries || []).map((epp) => ({
      ...epp,
      van: { id: v.id, plate: v.plate, name: v.name, driver: v.driver },
    }))
  ).sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime())

  const effectiveEppList = eppDeliveries.length > 0 ? eppDeliveries : allFleetEppDeliveries

  const filteredFleetEpp = effectiveEppList.filter((epp) => {
    const matchesVan = selectedVanForEpp === 'TODAS' || epp.vanId === selectedVanForEpp
    if (!matchesVan) return false

    const query = searchTerm.toLowerCase().trim()
    if (!query) return true

    return (
      epp.recipientName.toLowerCase().includes(query) ||
      epp.eppItems.toLowerCase().includes(query) ||
      (epp.notes && epp.notes.toLowerCase().includes(query)) ||
      (epp.van && (epp.van.plate.toLowerCase().includes(query) || epp.van.name.toLowerCase().includes(query)))
    )
  })

  // Summary Metrics
  const totalVans = vans.length
  const activeVans = vans.filter((v) => v.status === 'EN_TERRENO').length
  const alertVans = vans.filter((v) => getVanAlerts(v).length > 0).length
  const totalTools = vans.reduce((sum, v) => sum + (v.toolsCount || 0), 0)
  const totalMaterials = vans.reduce((sum, v) => sum + (v.materialsCount || 0), 0)
  const totalFleetMaintenanceCost = vans.reduce((sum, v) => sum + (v.totalMaintenanceCost || 0), 0)
  const totalFleetMaintenancesCount = vans.reduce((sum, v) => sum + (v.maintenancesCount || 0), 0)
  const totalFleetEppCount = vans.reduce((sum, v) => sum + (v.eppDeliveriesCount || v.eppDeliveries?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛻</span> Control Terreno - Stock, Mantenciones & EPP
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Gestión de vehículos, inventario en terreno, historial de mantenciones y control documental de entrega de EPP
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenAddEppModal()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow flex items-center gap-2 text-sm"
          >
            <span>🦺</span> Registrar EPP
          </button>
          <button
            onClick={() => handleOpenAddMaintenanceModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow flex items-center gap-2 text-sm"
          >
            <span>🛠️</span> Registrar Mantención
          </button>
          <button
            onClick={() => handleOpenVanModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow flex items-center gap-2 text-sm"
          >
            <span>➕</span> Registrar Camioneta
          </button>
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-max overflow-x-auto">
        <button
          onClick={() => setActiveMainTab('STOCK')}
          className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeMainTab === 'STOCK'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>📦</span> Stock & Herramientas ({totalVans})
        </button>
        <button
          onClick={() => setActiveMainTab('MANTENCIONES')}
          className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeMainTab === 'MANTENCIONES'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>🛠️</span> Mantenciones & Costos ({totalFleetMaintenancesCount})
        </button>
        <button
          onClick={() => {
            setActiveMainTab('EPP')
            fetchEppDeliveries(selectedVanForEpp)
          }}
          className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeMainTab === 'EPP'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>🦺</span> Panel EPP y Actas ({totalFleetEppCount})
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0">
            🛻
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Vehículos</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{totalVans}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0">
            🟢
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">En Terreno</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{activeVans}</p>
          </div>
        </div>

        <button
          onClick={() => setFilterStatus(filterStatus === 'CON_ALERTAS' ? 'TODOS' : 'CON_ALERTAS')}
          className={`text-left border rounded-2xl p-4 shadow-sm flex items-center space-x-3 transition cursor-pointer ${
            filterStatus === 'CON_ALERTAS'
              ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30'
              : alertVans > 0
              ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/10'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0 ${
              alertVans > 0
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            ⚠️
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Con Alertas</p>
            <p className={`text-xl sm:text-2xl font-extrabold ${alertVans > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {alertVans}
            </p>
          </div>
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0">
            💰
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Inversión Mantenciones</p>
            <p className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              ${totalFleetMaintenanceCost.toLocaleString('es-CL')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0">
            🛠️
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Stock Items Terreno</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalTools + totalMaterials}
            </p>
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
            placeholder={
              activeMainTab === 'STOCK'
                ? 'Buscar por patente, nombre, conductor o herramientas...'
                : 'Buscar mantención por título, qué se le hizo, taller, factura o patente...'
            }
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {activeMainTab === 'STOCK' ? (
          <div className="w-full sm:w-56">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="CON_ALERTAS">⚠️ Solo con Alertas Críticas</option>
              <option value="EN_TERRENO">En Terreno</option>
              <option value="DISPONIBLE">Disponible en Base</option>
              <option value="MANTENCION">En Mantención</option>
            </select>
          </div>
        ) : (
          <div className="w-full sm:w-64">
            <select
              value={maintenanceFilterType}
              onChange={(e) => setMaintenanceFilterType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Todos los Tipos de Servicio</option>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ============================================================
          TAB 1: FLOTA & STOCK DE CAMIONETAS
          ============================================================ */}
      {activeMainTab === 'STOCK' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-500">Cargando flota de vehículos...</div>
          ) : filteredVans.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <span className="text-4xl block">🛻</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay camionetas encontradas</p>
              <p className="text-sm text-slate-500">Prueba ajustando los filtros o el término de búsqueda.</p>
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

                const alerts = getVanAlerts(van)
                const hasExpired = alerts.some((a) => a.type === 'EXPIRED')
                const vanMaintCount = van.maintenancesCount || (van.maintenances || []).length
                const vanMaintCost = van.totalMaintenanceCost || (van.maintenances || []).reduce((s, m) => s + (m.cost || 0), 0)

                return (
                  <div
                    key={van.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between ${
                      hasExpired
                        ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                        : alerts.length > 0
                        ? 'border-amber-300 dark:border-amber-900/60'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
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
                            title="Editar Ficha"
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

                      {/* Banner de Alertas Críticas de Vencimiento */}
                      {alerts.length > 0 && (
                        <div
                          className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                            hasExpired
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          <p className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                            <span>{hasExpired ? '🚨 Alerta de Vencimiento Crítico' : '⚠️ Alerta de Próximo Vencimiento'}</span>
                          </p>
                          <ul className="space-y-1 pl-1 text-[11px]">
                            {alerts.map((alt, idx) => (
                              <li key={idx} className="flex flex-col">
                                <span className="font-bold">{alt.title}</span>
                                <span className="text-[10.5px] opacity-90 pl-2">{alt.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400">👤 Conductor:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{van.driver || 'No asignado'}</span>
                        </p>
                        {van.notes && <p className="text-slate-400 italic text-[11px]">"{van.notes}"</p>}
                      </div>

                      {/* Ficha Vehicular y Mantenimiento */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-slate-500 font-semibold border-b border-slate-200/50 dark:border-slate-700/50 pb-1 mb-1">
                          <span>🛠️ Ficha del Vehículo</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                            {van.mileage ? `${van.mileage.toLocaleString('es-CL')} KM` : 'KM s/r'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[10.5px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">📋 Rev. Técnica:</span>
                            <span
                              className={`font-semibold ${
                                alerts.some((a) => a.field === 'technicalReviewDate')
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {formatChileanDate(van.technicalReviewDate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">🛡️ Seguro SOAP:</span>
                            <span
                              className={`font-semibold ${
                                alerts.some((a) => a.field === 'insuranceExpiryDate')
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {formatChileanDate(van.insuranceExpiryDate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">📑 Perm. Circulación:</span>
                            <span
                              className={`font-semibold ${
                                alerts.some((a) => a.field === 'permisoCirculacionDate')
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {formatChileanDate(van.permisoCirculacionDate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">🛢️ Próx. Aceite:</span>
                            <span
                              className={`font-semibold ${
                                alerts.some((a) => a.field === 'nextOilChangeKm')
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {van.nextOilChangeKm ? `${van.nextOilChangeKm.toLocaleString('es-CL')} KM` : 's/r'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">🛞 Últ. Neumáticos:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {formatChileanDate(van.lastTireChangeDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Summary Metrics */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-center text-xs">
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

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenMaintenancePanel(van)}
                          className="flex-1 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/30 dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800/50"
                        >
                          <span>🛠️</span> Mantenciones ({vanMaintCount})
                        </button>
                        <button
                          onClick={() => handleOpenAddMaintenanceModal(van.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-xs flex items-center justify-center"
                          title="Registrar Mantención"
                        >
                          ➕
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenManageItems(van)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2"
                      >
                        <span>📦</span> Ver / Gestionar Stock ({van.totalItems || 0} ítems)
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================
          TAB 2: HISTORIAL GENERAL DE MANTENCIONES DE FLOTA
          ============================================================ */}
      {activeMainTab === 'MANTENCIONES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span> Historial Global de Mantenciones de la Flota
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registro detallado de trabajos, talleres, precios, kilometrajes y fotografías de comprobantes
              </p>
            </div>
            <button
              onClick={() => handleOpenAddMaintenanceModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
            >
              <span>➕</span> Nueva Mantención
            </button>
          </div>

          {filteredFleetMaintenances.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <span className="text-4xl block">🛠️</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay mantenciones registradas</p>
              <p className="text-sm text-slate-500">
                Haz clic en "Registrar Mantención" para ingresar los trabajos y adjuntar comprobantes o fotografías.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFleetMaintenances.map((maint) => {
                const typeObj = MAINTENANCE_TYPES.find((t) => t.value === maint.type) || {
                  label: maint.type,
                  color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
                }

                let imagesList: AttachedImage[] = []
                if (maint.imagesJson) {
                  try {
                    imagesList = JSON.parse(maint.imagesJson)
                  } catch {}
                } else if (maint.imageUrl) {
                  imagesList = [{ id: 'img-1', name: maint.imageName || 'Comprobante', url: maint.imageUrl }]
                }

                return (
                  <div
                    key={maint.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Top Header */}
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {maint.van && (
                            <span className="px-2.5 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono font-bold rounded text-xs">
                              {maint.van.plate}
                            </span>
                          )}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${typeObj.color}`}>
                            {typeObj.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            📅 {formatChileanDate(maint.date)}
                          </span>
                          <button
                            onClick={() => handleOpenAddMaintenanceModal(maint.vanId, maint)}
                            className="p-1 text-slate-400 hover:text-blue-500 transition text-xs"
                            title="Editar Mantención"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteMaintenance(maint.vanId, maint.id, maint.title)}
                            className="p-1 text-slate-400 hover:text-red-500 transition text-xs"
                            title="Eliminar Mantención"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Title & Cost */}
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{maint.title}</h3>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                          ${(maint.cost || 0).toLocaleString('es-CL')} CLP
                        </span>
                      </div>

                      {/* Description ("Qué se le hizo") */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                        <p className="font-semibold text-[11px] text-slate-400 uppercase mb-1">🔧 Trabajos Realizados:</p>
                        <p className="whitespace-pre-line leading-relaxed">{maint.description}</p>
                      </div>

                      {/* Extra Details (Workshop, KM, Invoice) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {maint.mileage ? (
                          <div>
                            <span className="font-semibold text-slate-400">Kilometraje: </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {maint.mileage.toLocaleString('es-CL')} KM
                            </span>
                          </div>
                        ) : null}
                        {maint.workshop ? (
                          <div>
                            <span className="font-semibold text-slate-400">Taller/Mecánico: </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{maint.workshop}</span>
                          </div>
                        ) : null}
                        {maint.invoiceNumber ? (
                          <div>
                            <span className="font-semibold text-slate-400">N° Factura/OT: </span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{maint.invoiceNumber}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Attached Images Gallery */}
                      {imagesList.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <span>📷</span> Fotografías / Comprobantes ({imagesList.length}):
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {imagesList.map((img) => (
                              <button
                                key={img.id}
                                onClick={() => setZoomedImage({ url: img.url, title: `${maint.title} - ${img.name}` })}
                                className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-emerald-500 transition shadow-sm shrink-0"
                              >
                                <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition">
                                  🔍
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB: PANEL DE EPP (ELEMENTOS DE PROTECCIÓN PERSONAL)
          ============================================================ */}
      {activeMainTab === 'EPP' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Toolbar: Filter by Van, Search, and Action Button */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Filtrar Camioneta:</span>
                <select
                  value={selectedVanForEpp}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedVanForEpp(val)
                    fetchEppDeliveries(val)
                  }}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="TODAS">🚐 Todas las Camionetas ({vans.length})</option>
                  {vans.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} - {v.name} ({v.driver || 'Sin Conductor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar por trabajador, elemento EPP o patente..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            </div>

            <button
              onClick={() => handleOpenAddEppModal(selectedVanForEpp !== 'TODAS' ? selectedVanForEpp : undefined)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>➕</span> Registrar Entrega de EPP
            </button>
          </div>

          {/* Cards Grid: Entregas de EPP */}
          {loadingEpp ? (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              Cargando registros de EPP...
            </div>
          ) : filteredFleetEpp.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <span className="text-4xl block">🦺</span>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">No hay entregas de EPP registradas</p>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Registra aquí la entrega de elementos de protección personal (Cascos, Zapatos, Chalecos, Guantes) y sube las actas firmadas o fotografías de respaldo.
              </p>
              <button
                onClick={() => handleOpenAddEppModal(selectedVanForEpp !== 'TODAS' ? selectedVanForEpp : undefined)}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow transition inline-flex items-center gap-1.5"
              >
                <span>➕</span> Registrar Primera Entrega
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFleetEpp.map((epp) => {
                const vanInfo = epp.van || vans.find((v) => v.id === epp.vanId)
                const itemsList = (epp.eppItems || '')
                  .split(',')
                  .map((i) => i.trim())
                  .filter(Boolean)

                const isPdf = epp.documentName?.toLowerCase().endsWith('.pdf') || (epp.documentUrl || '').startsWith('data:application/pdf')

                return (
                  <div
                    key={epp.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Card Header: Van Plate, Recipient and Actions */}
                      <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            {vanInfo && (
                              <span className="px-2.5 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono font-bold rounded text-xs">
                                {vanInfo.plate}
                              </span>
                            )}
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              🦺 Entrega EPP
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
                            <span>👤</span> {epp.recipientName}
                          </h4>
                          {vanInfo && (
                            <p className="text-[11px] text-slate-400">
                              Camioneta: {vanInfo.name} {vanInfo.driver ? `(Cond: ${vanInfo.driver})` : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            📅 {formatChileanDate(epp.deliveryDate)}
                          </span>
                          <button
                            onClick={() => handleDeleteEppDelivery(epp.id, epp.recipientName)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition text-xs"
                            title="Eliminar registro"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* EPP Items Delivered (Chips) */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Elementos Entregados ({itemsList.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {itemsList.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700"
                            >
                              ✓ {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Notes / Observaciones */}
                      {epp.notes && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 italic">
                          "{epp.notes}"
                        </div>
                      )}
                    </div>

                    {/* Document / Acta Attachment */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {epp.documentUrl ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isPdf ? (
                              <span className="text-lg">📄</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomedImage({
                                    url: epp.documentUrl!,
                                    title: `Acta EPP: ${epp.recipientName} - ${vanInfo?.plate || ''}`,
                                  })
                                }
                                className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-purple-500 transition"
                              >
                                <img src={epp.documentUrl} alt="Comprobante" className="w-full h-full object-cover" />
                              </button>
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                {epp.documentName || 'Acta de Entrega'}
                              </span>
                              <span className="text-[10px] text-slate-400 block">Comprobante de respaldo</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isPdf ? (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadFile(
                                    epp.documentUrl!,
                                    epp.documentName || `Acta_EPP_${epp.recipientName}.pdf`,
                                    'application/pdf'
                                  )
                                }
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition"
                              >
                                <span>📥</span> Descargar PDF
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomedImage({
                                    url: epp.documentUrl!,
                                    title: `Acta EPP: ${epp.recipientName} - ${vanInfo?.plate || ''}`,
                                  })
                                }
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition"
                              >
                                <span>👁️</span> Ver Acta
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span>Sin acta adjunta</span>
                          <span className="text-[10px] italic">Firma pendiente</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL: HISTORIAL DE MANTENCIONES DE VEHÍCULO ESPECÍFICO
          ============================================================ */}
      {selectedVanForMaintenance && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono font-bold rounded-lg text-sm">
                    {selectedVanForMaintenance.plate}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedVanForMaintenance.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Conductor:{' '}
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">
                    {selectedVanForMaintenance.driver || 'No asignado'}
                  </span>{' '}
                  | Kilometraje actual:{' '}
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                    {selectedVanForMaintenance.mileage ? `${selectedVanForMaintenance.mileage.toLocaleString('es-CL')} KM` : 's/r'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedVanForMaintenance(null)}
                className="text-slate-400 hover:text-white text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Actions & Summary Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">TOTAL MANTENCIONES</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    {vanMaintenances.length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">INVERSIÓN TOTAL</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    ${vanMaintenances.reduce((s, m) => s + (m.cost || 0), 0).toLocaleString('es-CL')} CLP
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleOpenAddMaintenanceModal(selectedVanForMaintenance.id)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
              >
                <span>➕</span> Registrar Mantención
              </button>
            </div>

            {/* Maintenances List */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {loadingMaintenances ? (
                <div className="p-12 text-center text-slate-400 text-xs">Cargando historial de mantenciones...</div>
              ) : vanMaintenances.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <span className="text-3xl block">🛠️</span>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    No hay mantenciones registradas para este vehículo
                  </p>
                  <p className="text-xs text-slate-400">
                    Haz clic en "Registrar Mantención" para añadir detalles de servicios, costos e imágenes.
                  </p>
                </div>
              ) : (
                vanMaintenances.map((maint) => {
                  const typeObj = MAINTENANCE_TYPES.find((t) => t.value === maint.type) || {
                    label: maint.type,
                    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
                  }

                  let imagesList: AttachedImage[] = []
                  if (maint.imagesJson) {
                    try {
                      imagesList = JSON.parse(maint.imagesJson)
                    } catch {}
                  } else if (maint.imageUrl) {
                    imagesList = [{ id: 'img-1', name: maint.imageName || 'Comprobante', url: maint.imageUrl }]
                  }

                  return (
                    <div
                      key={maint.id}
                      className="bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2.5 text-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${typeObj.color}`}>
                            {typeObj.label}
                          </span>
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                            📅 {formatChileanDate(maint.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono">
                            ${(maint.cost || 0).toLocaleString('es-CL')} CLP
                          </span>
                          <button
                            onClick={() => handleOpenAddMaintenanceModal(maint.vanId, maint)}
                            className="p-1 text-slate-400 hover:text-blue-500 transition"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteMaintenance(maint.vanId, maint.id, maint.title)}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{maint.title}</h4>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                          {maint.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
                        {maint.mileage ? (
                          <div>
                            <span className="font-semibold text-slate-400">Kilometraje: </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {maint.mileage.toLocaleString('es-CL')} KM
                            </span>
                          </div>
                        ) : null}
                        {maint.workshop ? (
                          <div>
                            <span className="font-semibold text-slate-400">Taller: </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{maint.workshop}</span>
                          </div>
                        ) : null}
                        {maint.invoiceNumber ? (
                          <div>
                            <span className="font-semibold text-slate-400">N° Factura/OT: </span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{maint.invoiceNumber}</span>
                          </div>
                        ) : null}
                      </div>

                      {imagesList.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-[10.5px] font-semibold text-slate-400">📷 Comprobantes / Fotografías ({imagesList.length}):</p>
                          <div className="flex gap-2 flex-wrap">
                            {imagesList.map((img) => (
                              <button
                                key={img.id}
                                onClick={() => setZoomedImage({ url: img.url, title: `${maint.title} - ${img.name}` })}
                                className="group relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-emerald-500 transition shadow-sm shrink-0"
                              >
                                <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition">
                                  🔍
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: REGISTRAR / EDITAR MANTENCIÓN
          ============================================================ */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🛠️</span> {editingMaintenance ? 'Editar Mantención' : 'Registrar Nueva Mantención'}
              </h3>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
              {/* Van Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehículo / Camioneta *
                </label>
                <select
                  required
                  value={maintVanId}
                  onChange={(e) => setMaintVanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                >
                  <option value="">Selecciona una camioneta...</option>
                  {vans.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.plate}] {v.name} {v.driver ? `(${v.driver})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Mantención (DD/MM/AAAA) *
                  </label>
                  <ChileanDatePicker
                    required
                    value={maintDate}
                    onChange={(iso) => setMaintDate(iso)}
                    placeholder="DD/MM/AAAA (ej: 27/08/2026)"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Servicio *
                  </label>
                  <select
                    required
                    value={maintType}
                    onChange={(e) => {
                      setMaintType(e.target.value)
                      if (e.target.value === 'CAMBIO_ACEITE') setMaintUpdateOil(true)
                      if (e.target.value === 'NEUMATICOS') setMaintUpdateTires(true)
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title / Summary */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título / Resumen del Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  placeholder="Ej: Cambio de pastillas de frenos y rectificado de discos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Description ("Qué se le hizo") */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detalle de Trabajos Realizados y Repuestos (¿Qué se le hizo?) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={maintDescription}
                  onChange={(e) => setMaintDescription(e.target.value)}
                  placeholder="Detallar minuciosamente qué repuestos se cambiaron, diagnósticos, observaciones mecánicas o estado del vehículo..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Cost & Mileage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Precio / Costo ($ CLP) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej: 145000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kilometraje al Servicio (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maintMileage}
                    onChange={(e) => setMaintMileage(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej: 154000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Workshop & Invoice Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taller / Mecánico / Proveedor
                  </label>
                  <input
                    type="text"
                    value={maintWorkshop}
                    onChange={(e) => setMaintWorkshop(e.target.value)}
                    placeholder="Ej: Taller Hernández / Concesionario"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    N° Factura / Boleta / OT
                  </label>
                  <input
                    type="text"
                    value={maintInvoiceNumber}
                    onChange={(e) => setMaintInvoiceNumber(e.target.value)}
                    placeholder="Ej: FAC-84920"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* ATTACH IMAGES SECTION */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>📷</span> Adjuntar Fotografías / Facturas
                  </label>
                  <span className="text-[11px] text-slate-400">{maintImages.length} foto(s)</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-dashed border-emerald-500/60 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition flex items-center gap-1.5">
                    <span>📁</span> Seleccionar Imágenes / Tomar Foto
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {maintImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {maintImages.map((img) => (
                      <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 group shrink-0">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow opacity-90 hover:opacity-100"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync Options */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-900/40 space-y-2 text-xs">
                <p className="font-bold text-[11px] text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  ⚙️ Actualización Automática de Ficha
                </p>
                <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintUpdateMileage}
                      onChange={(e) => setMaintUpdateMileage(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Actualizar kilometraje actual del vehículo con este valor ({maintMileage || 0} KM)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintUpdateOil}
                      onChange={(e) => setMaintUpdateOil(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Actualizar fecha de último cambio de aceite a esta fecha</span>
                  </label>

                  {maintUpdateOil && (
                    <div className="pl-5 pt-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                        Próximo cambio de aceite (KM estimado):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={maintNextOilKm}
                        onChange={(e) => setMaintNextOilKm(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej: 165000"
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintUpdateTires}
                      onChange={(e) => setMaintUpdateTires(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Actualizar fecha de cambio de neumáticos a esta fecha</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingMaintenance}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
              >
                {isSavingMaintenance ? 'Guardando...' : editingMaintenance ? 'Actualizar Mantención' : 'Guardar Registro de Mantención'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: ZOOM DE IMAGEN / COMPROBANTE
          ============================================================ */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setZoomedImage(null)}
        >
          <div className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center text-white pb-3">
              <span className="font-bold text-sm truncate">{zoomedImage.title}</span>
              <button
                onClick={() => setZoomedImage(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-sm transition"
              >
                Cerrar ✕
              </button>
            </div>
            <img
              src={zoomedImage.url}
              alt={zoomedImage.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CREAR / EDITAR CAMIONETA Y FICHA TÉCNICA
          ============================================================ */}
      {showVanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingVan ? 'Editar Camioneta y Ficha Técnica' : 'Registrar Nueva Camioneta'}
              </h3>
              <button onClick={() => setShowVanModal(false)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVan} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Patente (Ej: AB-123-CD) *
                  </label>
                  <input
                    type="text"
                    required
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="Patente del vehículo"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre / Alias *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Camioneta 1 - Redes"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Conductor Responsable
                  </label>
                  <input
                    type="text"
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    placeholder="Nombre del técnico"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="EN_TERRENO">EN TERRENO</option>
                    <option value="DISPONIBLE">DISPONIBLE EN BASE</option>
                    <option value="MANTENCION">EN MANTENCIÓN</option>
                  </select>
                </div>
              </div>

              {/* MANTENIMIENTO Y FICHA DE VEHÍCULO */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span>🛠️</span> Ficha de Mantenimiento y Documentación (DD/MM/AAAA)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Kilometraje (KM)</label>
                    <input
                      type="number"
                      min="0"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 145000"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">KM Último Aceite</label>
                    <input
                      type="number"
                      min="0"
                      value={lastOilChangeKm}
                      onChange={(e) => setLastOilChangeKm(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 140000"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">KM Próx. Aceite</label>
                    <input
                      type="number"
                      min="0"
                      value={nextOilChangeKm}
                      onChange={(e) => setNextOilChangeKm(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej. 150000"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Fecha Últ. Aceite
                    </label>
                    <ChileanDatePicker
                      value={lastOilChangeDate}
                      onChange={(iso) => setLastOilChangeDate(iso)}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Fecha Neumáticos
                    </label>
                    <ChileanDatePicker
                      value={lastTireChangeDate}
                      onChange={(iso) => setLastTireChangeDate(iso)}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Venc. Rev. Técnica
                    </label>
                    <ChileanDatePicker
                      value={technicalReviewDate}
                      onChange={(iso) => setTechnicalReviewDate(iso)}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Venc. Seguro SOAP
                    </label>
                    <ChileanDatePicker
                      value={insuranceExpiryDate}
                      onChange={(iso) => setInsuranceExpiryDate(iso)}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Venc. Perm. Circulación
                    </label>
                    <ChileanDatePicker
                      value={permisoCirculacionDate}
                      onChange={(iso) => setPermisoCirculacionDate(iso)}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales sobre estado del vehículo..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow"
              >
                Guardar Camioneta y Ficha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: GESTIONAR STOCK DE ÍTEMS EN LA CAMIONETA
          ============================================================ */}
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
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
              >
                <span>➕</span> Cargar Ítem a Camioneta
              </button>
            </div>

            {/* Sub-Filters */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                placeholder="Filtrar ítems cargados..."
                className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <select
                value={itemFilterType}
                onChange={(e: any) => setItemFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="HERRAMIENTA">🛠️ Solo Herramientas</option>
                <option value="MATERIAL">📦 Solo Materiales</option>
              </select>
            </div>

            {/* Table / List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Ítem / Producto</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-center">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {((selectedVan.items || []).filter((i) => {
                    const matchQ =
                      !itemSearchTerm ||
                      i.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                      (i.sku && i.sku.toLowerCase().includes(itemSearchTerm.toLowerCase()))
                    const matchT = itemFilterType === 'TODOS' || i.type === itemFilterType
                    return matchQ && matchT
                  })).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.type === 'HERRAMIENTA'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.name}
                        {item.sku && <span className="block font-mono text-[10px] text-slate-400">{item.sku}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{item.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white font-mono text-sm">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateItemQty(item.id, item.quantity + 1)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold"
                            title="Aumentar +1"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleOpenRemoveModal(item, 1)}
                            className="px-2 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded text-[11px] font-bold transition"
                            title="Retirar cantidad"
                          >
                            Retirar
                          </button>
                          <button
                            onClick={() => handleOpenRemoveModal(item, item.quantity)}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
                            title="Dar de baja o devolver todo"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(selectedVan.items || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No hay ítems cargados en esta camioneta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CARGAR NUEVO ÍTEM A CAMIONETA
          ============================================================ */}
      {showItemModal && selectedVan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Cargar Ítem a [{selectedVan.plate}]
              </h4>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Seleccionar desde Catálogo Bodega (Opcional)
                </label>
                <SearchableProductSelect
                  products={products}
                  selectedProductId={itemProductId}
                  onSelectProduct={handleSelectProduct}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Ítem / Herramienta *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ej: Multímetro Digital Fluke"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Ítem</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="HERRAMIENTA">🛠️ HERRAMIENTA</option>
                    <option value="MATERIAL">📦 MATERIAL / INSUMO</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cantidad a Asignar *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {itemProductId && (
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={deductFromWarehouse}
                    onChange={(e) => setDeductFromWarehouse(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Descontar automáticamente del stock de Bodega</span>
                </label>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow text-xs mt-2"
              >
                Cargar a la Camioneta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: RETIRAR / DEVOLVER ÍTEM DE CAMIONETA
          ============================================================ */}
      {showRemoveModal && itemToRemove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Retirar Ítem: {itemToRemove.name}
              </h4>
              <button onClick={() => setShowRemoveModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRemoval} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad a Retirar (Disponible en vehículo: {itemToRemove.quantity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={itemToRemove.quantity}
                  required
                  value={removeQty}
                  onChange={(e) => setRemoveQty(Math.min(itemToRemove.quantity, Math.max(1, Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destino del Ítem
                </label>
                <select
                  value={returnToWarehouse ? 'WAREHOUSE' : 'CONSUMED'}
                  onChange={(e) => setReturnToWarehouse(e.target.value === 'WAREHOUSE')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="WAREHOUSE">📥 Devolver a Stock de Bodega</option>
                  <option value="CONSUMED">🔥 Consumido / Utilizado en terreno (Baja definitiva)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo / Observación
                </label>
                <input
                  type="text"
                  value={removeNotes}
                  onChange={(e) => setRemoveNotes(e.target.value)}
                  placeholder="Ej: Devolución de herramienta o consumido en OT-104"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingRemove}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow text-xs mt-2"
              >
                {isSubmittingRemove ? 'Procesando...' : 'Confirmar Retiro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: REGISTRAR ENTREGA DE EPP A CAMIONETA
          ============================================================ */}
      {showEppModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🦺</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registrar Entrega de EPP</h3>
                  <p className="text-xs text-slate-400">Asigna elementos de protección y sube el acta de entrega</p>
                </div>
              </div>
              <button
                onClick={() => setShowEppModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEppDelivery} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Van & Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Camioneta Destino *</label>
                  <select
                    value={eppVanId}
                    onChange={(e) => {
                      const vId = e.target.value
                      setEppVanId(vId)
                      const targetV = vans.find((v) => v.id === vId)
                      if (targetV?.driver && !eppRecipientName) {
                        setEppRecipientName(targetV.driver)
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="">Selecciona una camioneta...</option>
                    {vans.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} - {v.name} {v.driver ? `(${v.driver})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Trabajador / Receptor *</label>
                  <input
                    type="text"
                    required
                    value={eppRecipientName}
                    onChange={(e) => setEppRecipientName(e.target.value)}
                    placeholder="Ej: Juan Pérez / Cuadrilla Fibra"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha de Entrega *</label>
                <input
                  type="date"
                  required
                  value={eppDeliveryDate}
                  onChange={(e) => setEppDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Quick Select Common EPP Items */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Selecciona los EPP entregados (clic para marcar):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_EPP_OPTIONS.map((item) => {
                    const isSelected = selectedEppItems.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleEppItem(item)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-purple-400'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{item}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Otros EPP o Tallas Específicas (opcional):
                  </label>
                  <input
                    type="text"
                    value={customEppText}
                    onChange={(e) => setCustomEppText(e.target.value)}
                    placeholder="Ej: Calzado Talla 42, Casco Blanco con logo Layerthree..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload Acta / Comprobante */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    📎 Subir Acta de Entrega o Comprobante Firmado (PDF o Imagen)
                  </label>
                  {eppDocumentName && (
                    <button
                      type="button"
                      onClick={() => {
                        setEppDocumentUrl('')
                        setEppDocumentName('')
                      }}
                      className="text-xs text-rose-500 hover:underline font-semibold"
                    >
                      Remover archivo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-xs shadow transition active:scale-95 flex items-center gap-1.5 shrink-0">
                    <span>📁 Seleccionar Documento</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleUploadEppDocument}
                      className="hidden"
                    />
                  </label>

                  {eppDocumentName ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold truncate">
                        📄 {eppDocumentName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">PDF o foto de documento firmado</span>
                  )}
                </div>

                {eppDocumentUrl && !eppDocumentName.toLowerCase().endsWith('.pdf') && (
                  <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={eppDocumentUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observaciones / Notas</label>
                <textarea
                  value={eppNotes}
                  onChange={(e) => setEppNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej: Entrega por inicio de faena proyecto datacenter, trabajador firma conforme..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEppModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEpp}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingEpp ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Guardar Acta de EPP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
