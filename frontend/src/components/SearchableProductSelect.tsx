'use client'

import React, { useState, useEffect, useRef } from 'react'

export interface SearchableProductItem {
  id: string
  sku: string
  name: string
  category?: string
  subcategory?: string
  stock: number
  minStock?: number
}

interface SearchableProductSelectProps {
  products: SearchableProductItem[]
  selectedProductId: string
  onSelectProduct: (product: SearchableProductItem | null) => void
  placeholder?: string
  disabled?: boolean
}

export default function SearchableProductSelect({
  products,
  selectedProductId,
  onSelectProduct,
  placeholder = '🔍 Buscar material o herramienta por nombre, SKU o categoría...',
  disabled = false,
}: SearchableProductSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Find currently selected product
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Update input text when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setQuery(`${selectedProduct.sku} - ${selectedProduct.name}`)
    } else if (!isOpen) {
      setQuery('')
    }
  }, [selectedProductId, selectedProduct, isOpen])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (selectedProduct) {
          setQuery(`${selectedProduct.sku} - ${selectedProduct.name}`)
        } else {
          setQuery('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedProduct])

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q))
    )
  })

  const handleSelect = (product: SearchableProductItem) => {
    onSelectProduct(product)
    setQuery(`${product.sku} - ${product.name}`)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectProduct(null)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            if (selectedProductId && e.target.value === '') {
              onSelectProduct(null)
            }
          }}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9 transition shadow-sm placeholder:text-slate-400"
        />
        {selectedProductId ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition text-sm p-1"
            title="Limpiar selección"
          >
            ✕
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
            🔍
          </span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No se encontraron materiales que coincidan con &quot;{query}&quot;
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = product.id === selectedProductId
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex justify-between items-center gap-2 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 font-semibold' : ''
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {product.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700 dark:text-slate-300">
                        {product.sku}
                      </span>
                      <span>•</span>
                      <span>{product.category || 'General'}</span>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        product.stock < (product.minStock || 0)
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      }`}
                    >
                      Stock: {product.stock}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
