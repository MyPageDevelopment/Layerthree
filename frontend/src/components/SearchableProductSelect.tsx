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

  // Filter products by search query (multi-word tokenized search)
  const filteredProducts = products.filter((p) => {
    if (!query.trim()) return true
    const searchTokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const searchableText = `${p.sku} ${p.name} ${p.category || ''} ${p.subcategory || ''}`.toLowerCase()

    return searchTokens.every((token) => searchableText.includes(token))
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
        <div className="absolute z-[9999] left-0 right-0 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-56 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-fade-in">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No se encontraron materiales que coincidan con &quot;{query}&quot;
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = product.id === selectedProductId
              const isLowStock = product.stock < (product.minStock || 0)
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className={`w-full text-left px-3.5 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition flex justify-between items-center gap-2 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 font-semibold' : ''
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {product.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">
                        {product.sku}
                      </span>
                      <span>•</span>
                      <span className="truncate">{product.category || 'General'}</span>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap shrink-0 ml-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg inline-block ${
                        isLowStock
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
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
