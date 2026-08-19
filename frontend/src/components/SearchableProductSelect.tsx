'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface SearchableProductItem {
  id: string
  sku: string
  name: string
  category?: string
  subcategory?: string
  stock: number
  minStock?: number
  unit?: string
}

interface SearchableProductSelectProps {
  products: SearchableProductItem[]
  selectedProductId: string
  onSelectProduct: (product: SearchableProductItem | null) => void
  placeholder?: string
  disabled?: boolean
}

// Strip accents and normalize for flexible search
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function SearchableProductSelect({
  products,
  selectedProductId,
  onSelectProduct,
  placeholder = '🔍 Buscar material por nombre, SKU o categoría...',
  disabled = false,
}: SearchableProductSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [mounted, setMounted] = useState(false)
  const [portalCoords, setPortalCoords] = useState<{ top: number; left: number; width: number; flipUp: boolean } | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Find currently selected product
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  // Extract unique categories for filter chips
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim())
    })
    return Array.from(cats).sort()
  }, [products])

  // Synchronize text when selected item changes
  useEffect(() => {
    if (selectedProduct) {
      setQuery(`${selectedProduct.sku} - ${selectedProduct.name}`)
    } else if (!isOpen) {
      setQuery('')
    }
  }, [selectedProductId, selectedProduct, isOpen])

  // Recalculate fixed portal coordinates with viewport clamping
  const updatePortalCoords = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const dropdownEstHeight = 320
    const minWidth = Math.min(viewportWidth - 24, 340)
    const preferredWidth = Math.max(rect.width, minWidth)
    const width = Math.min(preferredWidth, viewportWidth - 24)

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top

    // Flip up only if space below is too small AND space above offers enough room
    const flipUp = spaceBelow < dropdownEstHeight && spaceAbove > dropdownEstHeight

    // Horizontal clamping (keep 12px margin from screen edges)
    let left = rect.left
    if (left + width > viewportWidth - 12) {
      left = viewportWidth - width - 12
    }
    if (left < 12) {
      left = 12
    }

    // Vertical positioning
    let top: number
    if (flipUp) {
      top = Math.max(12, rect.top - dropdownEstHeight - 6)
    } else {
      top = rect.bottom + 6
      // Make sure it doesn't run off bottom of viewport
      if (top + dropdownEstHeight > viewportHeight - 12) {
        top = Math.max(12, viewportHeight - dropdownEstHeight - 12)
      }
    }

    setPortalCoords({
      top,
      left,
      width,
      flipUp,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePortalCoords()

    window.addEventListener('resize', updatePortalCoords)
    window.addEventListener('scroll', updatePortalCoords, true)
    return () => {
      window.removeEventListener('resize', updatePortalCoords)
      window.removeEventListener('scroll', updatePortalCoords, true)
    }
  }, [isOpen, updatePortalCoords])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const isInsideWrapper = wrapperRef.current && wrapperRef.current.contains(target)
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target)

      if (!isInsideWrapper && !isInsideDropdown) {
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

  // Filter products by search query, category filter and stock availability
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Stock availability filter
      if (onlyAvailable && p.stock <= 0) {
        return false
      }

      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false
      }

      // Query filter
      if (!query.trim()) return true
      const queryNorm = normalizeText(query.trim())
      const searchTokens = queryNorm.split(/\s+/).filter(Boolean)
      const searchableText = normalizeText(
        `${p.sku} ${p.name} ${p.category || ''} ${p.subcategory || ''}`
      )

      return searchTokens.every((token) => searchableText.includes(token))
    })
  }, [products, query, selectedCategory, onlyAvailable])

  // Reset keyboard highlight on filter change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredProducts.length, selectedCategory, onlyAvailable])

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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        updatePortalCoords()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        handleSelect(filteredProducts[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Dropdown element content
  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={
        mounted && portalCoords
          ? {
              position: 'fixed',
              top: `${portalCoords.top}px`,
              left: `${portalCoords.left}px`,
              width: `${portalCoords.width}px`,
              maxHeight: '340px',
              zIndex: 999999,
            }
          : undefined
      }
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md transition-all ${
        !portalCoords ? 'absolute z-[9999] left-0 right-0 w-full mt-1.5' : ''
      }`}
    >
      {/* Header with Category & Stock Filter Chips */}
      <div className="p-2 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 shrink-0 mr-1">
            Filtros:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todas ({products.length})
          </button>
          {availableCategories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setOnlyAvailable(!onlyAvailable)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap shrink-0 flex items-center gap-1 ${
            onlyAvailable
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800'
          }`}
        >
          {onlyAvailable ? '✅ Solo Disponibles' : '📦 Incluir Agotados'}
        </button>
      </div>

      {/* Results List */}
      <div className="max-h-64 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
        {filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">No se encontraron materiales</p>
            <p className="text-[11px]">
              {selectedCategory !== 'ALL'
                ? `No hay resultados en la categoría "${selectedCategory}" con "${query}"`
                : `No coincide ningún producto con "${query}"`}
            </p>
          </div>
        ) : (
          filteredProducts.map((product, idx) => {
            const isSelected = product.id === selectedProductId
            const isHighlighted = idx === highlightedIndex
            const isLowStock = product.stock <= (product.minStock || 0)
            const unitLabel = product.unit ? product.unit : 'UN'

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-3.5 py-2.5 transition flex justify-between items-center gap-3 ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 font-semibold'
                    : isHighlighted
                    ? 'bg-slate-100 dark:bg-slate-800/80'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {product.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">
                      {product.sku}
                    </span>
                    <span>•</span>
                    <span className="truncate font-medium">{product.category || 'General'}</span>
                    {product.subcategory && (
                      <>
                        <span>/</span>
                        <span className="truncate text-slate-400">{product.subcategory}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right whitespace-nowrap shrink-0 ml-2">
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                      isLowStock
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <span>Stock: {product.stock}</span>
                    <span className="text-[9px] opacity-80 uppercase">{unitLabel}</span>
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
        <span>Mostrando {filteredProducts.length} de {products.length} productos</span>
        <span>Usa ↑↓ para navegar y Enter para seleccionar</span>
      </div>
    </div>
  )

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => {
            setIsOpen(true)
            updatePortalCoords()
          }}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            updatePortalCoords()
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

      {isOpen &&
        (mounted && portalCoords
          ? createPortal(dropdownContent, document.body)
          : dropdownContent)}
    </div>
  )
}

