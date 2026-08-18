'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import SearchableProductSelect from '@/components/SearchableProductSelect'
import { useToast } from '@/components/ToastNotification'
import type { Product } from '@/types'

export interface ParsedItem {
  rawLineText: string;
  rawProductName: string;
  quantity: number;
  unitMeasure?: string;
  unitPrice: number;
  totalPrice: number;
  suggestedProductId?: string;
  suggestedProductName?: string;
  suggestedProductSku?: string;
  confidenceScore: number;
}

export interface ParsedInvoiceData {
  supplierRut?: string;
  supplierName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  items: ParsedItem[];
}

interface InvoiceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  quotationCode: string;
  parsedData: ParsedInvoiceData;
  products: Product[];
  onConfirmed: () => void;
}

export default function InvoiceConfirmationModal({
  isOpen,
  onClose,
  quotationId,
  quotationCode,
  parsedData,
  products,
  onConfirmed,
}: InvoiceConfirmationModalProps) {
  const { showToast } = useToast()
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [supplierRut, setSupplierRut] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmedItems, setConfirmedItems] = useState<
    {
      rawProductName: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      unitMeasure: string;
      confidenceScore: number;
    }[]
  >([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (parsedData) {
      setInvoiceNumber(parsedData.invoiceNumber || '')
      setSupplierRut(parsedData.supplierRut || '')
      setSupplierName(parsedData.supplierName || '')

      const mapped = (parsedData.items || []).map((item) => ({
        rawProductName: item.rawProductName,
        productId: item.suggestedProductId || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        unitMeasure: item.unitMeasure || 'UN',
        confidenceScore: item.confidenceScore || 0,
      }))
      setConfirmedItems(mapped)
    }
  }, [parsedData])

  if (!isOpen) return null

  const handleProductChange = (index: number, newProductId: string) => {
    setConfirmedItems((prev) => {
      const copy = [...prev]
      copy[index].productId = newProductId
      return copy
    })
  }

  const handleQuantityChange = (index: number, qty: number) => {
    setConfirmedItems((prev) => {
      const copy = [...prev]
      copy[index].quantity = qty
      return copy
    })
  }

  const handlePriceChange = (index: number, price: number) => {
    setConfirmedItems((prev) => {
      const copy = [...prev]
      copy[index].unitPrice = price
      return copy
    })
  }

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await api.post(`/quotations/${quotationId}/confirm-invoice`, {
        invoiceNumber,
        supplierRut,
        supplierName,
        notes,
        items: confirmedItems.map((ci) => ({
          productId: ci.productId || undefined,
          productName: ci.rawProductName,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          unitMeasure: ci.unitMeasure,
        })),
      })

      showToast('¡Recepción confirmada! El stock de materiales ha sido actualizado en la Bodega.', 'success', 'Inventario Actualizado')
      onConfirmed()
      onClose()
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error al confirmar la recepción de factura', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-bold text-xs rounded-lg">
                Lectura OCR Factura
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">{quotationCode}</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Confirmación e Ingreso de Materiales Facturados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifique la coincidencia inteligente entre los ítems detectados en la factura y los productos de Bodega
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmitReceipt} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Header Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                N° / Folio Factura *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej: 0000834224"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                RUT Emisor / Proveedor
              </label>
              <input
                type="text"
                value={supplierRut}
                onChange={(e) => setSupplierRut(e.target.value)}
                placeholder="Ej: 79.913.160-9"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Razón Social / Proveedor
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ej: ESTEC LTDA."
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Table of Extracted Items & Product Mapping */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Ítems Detectados ({confirmedItems.length}) - Coincidencia con Inventario
            </h4>

            {confirmedItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
                No se detectaron líneas de productos automáticamente. Puedes ingresar los datos manualmente.
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {confirmedItems.map((item, idx) => {
                  const score = item.confidenceScore
                  const badgeColor =
                    score >= 70
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                      : score >= 30
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300'

                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-2.5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {item.rawProductName}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Leído de Factura | Cant: {item.quantity} {item.unitMeasure}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor} shrink-0`}>
                          {score >= 70
                            ? `🟢 ${score}% Coincidencia`
                            : score >= 30
                            ? `🟡 ${score}% Sugerido`
                            : `⚪ Sin coincidencia`}
                        </span>
                      </div>

                      {/* Mapping row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Asignar a Producto de Bodega:
                          </label>
                          <SearchableProductSelect
                            products={products}
                            selectedProductId={item.productId}
                            onSelectProduct={(p) => handleProductChange(idx, p ? p.id : '')}
                            placeholder="🔍 Buscar producto en inventario..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-center text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Precio Unit ($)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold text-center text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Notas de Recepción / Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de recepción de la factura..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1"
            >
              {submitting ? 'Guardando e Ingresando...' : '✅ Confirmar e Ingresar a Inventario Bodega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
