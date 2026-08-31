'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface ChileanDatePickerProps {
  value?: string | null
  onChange: (isoDate: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

// Converts YYYY-MM-DD or ISO string to DD/MM/AAAA display
function toDisplayFormat(val?: string | null): string {
  if (!val) return ''
  const clean = val.split('T')[0].trim()
  // If already DD/MM/YYYY
  if (/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.test(clean)) {
    const [, d, m, y] = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)!
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  // If YYYY-MM-DD
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(clean)) {
    const [, y, m, d] = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)!
    return `${d}/${m}/${y}`
  }
  return clean
}

// Converts DD/MM/AAAA or text to YYYY-MM-DD
function toIsoFormat(displayVal: string): string {
  const clean = displayVal.trim()
  if (/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.test(clean)) {
    const [, d, m, y] = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)!
    const dayNum = Number(d)
    const monthNum = Number(m)
    const yearNum = Number(y)
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(clean)) {
    return clean
  }
  return ''
}

export default function ChileanDatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  label,
  required = false,
  disabled = false,
  className = '',
  id,
  name,
}: ChileanDatePickerProps) {
  const [inputText, setInputText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  // Current view month & year in calendar popup
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState<number>(today.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()) // 0 - 11

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync internal display text when external value prop changes
  useEffect(() => {
    const formatted = toDisplayFormat(value)
    setInputText(formatted)

    if (value) {
      const iso = toIsoFormat(formatted)
      if (iso) {
        const [y, m] = iso.split('-').map(Number)
        setViewYear(y)
        setViewMonth(m - 1)
      }
    }
  }, [value])

  // Recalculate dropdown position
  const updatePosition = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const dropdownHeight = 330
    const spaceBelow = window.innerHeight - rect.bottom
    const shouldFlipUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight

    setDropdownCoords({
      top: shouldFlipUp ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
      left: Math.max(10, Math.min(rect.left, window.innerWidth - 300)),
      width: 290,
    })
  }

  const handleOpen = () => {
    if (disabled) return
    updatePosition()
    setIsOpen(true)
  }

  // Handle outside click & escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleScroll = () => {
      if (isOpen) updatePosition()
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  // Handle typing with smart auto-slashes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d/]/g, '')
    
    // Auto-insert slash when typing numbers consecutively (e.g. "27082026" -> "27/08/2026")
    const digitsOnly = raw.replace(/\D/g, '')
    if (!raw.includes('/') && digitsOnly.length >= 2) {
      if (digitsOnly.length <= 2) {
        raw = digitsOnly
      } else if (digitsOnly.length <= 4) {
        raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`
      } else {
        raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`
      }
    }

    // Limit to max 10 chars "DD/MM/AAAA"
    if (raw.length > 10) raw = raw.slice(0, 10)

    setInputText(raw)

    const iso = toIsoFormat(raw)
    if (iso) {
      onChange(iso)
      const [y, m] = iso.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m - 1)
    } else if (raw === '') {
      onChange('')
    }
  }

  const handleInputBlur = () => {
    if (inputText.trim() === '') {
      onChange('')
      return
    }
    const iso = toIsoFormat(inputText)
    if (iso) {
      setInputText(toDisplayFormat(iso))
      onChange(iso)
    } else {
      // If invalid, revert or clear
      if (value) {
        setInputText(toDisplayFormat(value))
      } else {
        setInputText('')
        onChange('')
      }
    }
  }

  // Calendar Day Click
  const handleSelectDay = (day: number, month: number, year: number) => {
    const yStr = String(year)
    const mStr = String(month + 1).padStart(2, '0')
    const dStr = String(day).padStart(2, '0')
    const iso = `${yStr}-${mStr}-${dStr}`

    setInputText(`${dStr}/${mStr}/${yStr}`)
    onChange(iso)
    setIsOpen(false)
  }

  const handleSelectToday = () => {
    const now = new Date()
    handleSelectDay(now.getDate(), now.getMonth(), now.getFullYear())
  }

  const handleClear = () => {
    setInputText('')
    onChange('')
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Generate calendar days for current viewMonth/viewYear
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    
    // Monday as first day: Sunday (0) becomes 6, Monday (1) becomes 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

    const days: Array<{
      day: number
      month: number
      year: number
      isCurrentMonth: boolean
      isToday: boolean
      isSelected: boolean
    }> = []

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      days.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      })
    }

    // Selected Date components
    let selY: number | null = null
    let selM: number | null = null
    let selD: number | null = null
    const isoVal = toIsoFormat(inputText)
    if (isoVal) {
      const parts = isoVal.split('-').map(Number)
      selY = parts[0]
      selM = parts[1] - 1
      selD = parts[2]
    }

    const todayY = today.getFullYear()
    const todayM = today.getMonth()
    const todayD = today.getDate()

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = todayY === viewYear && todayM === viewMonth && todayD === d
      const isSelected = selY === viewYear && selM === viewMonth && selD === d
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isToday,
        isSelected,
      })
    }

    // Next month padding to fill complete weeks (up to 35 or 42 cells)
    const remainingCells = 42 - days.length
    if (remainingCells > 0 && remainingCells < 7) {
      for (let d = 1; d <= remainingCells; d++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
        days.push({
          day: d,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false,
          isToday: false,
          isSelected: false,
        })
      }
    }

    return days
  }, [viewYear, viewMonth, inputText, today])

  // Generate Year Options for dropdown
  const yearOptions = useMemo(() => {
    const years: number[] = []
    const start = 2000
    const end = 2040
    for (let y = start; y <= end; y++) {
      years.push(y)
    }
    return years
  }, [])

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">DD/MM/AAAA</span>
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          required={required}
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={handleOpen}
          placeholder={placeholder}
          className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false)
            } else {
              handleOpen()
            }
          }}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 text-sm transition"
          title="Abrir calendario"
        >
          📅
        </button>
      </div>

      {/* DROPDOWN CALENDAR PORTAL */}
      {mounted &&
        isOpen &&
        dropdownCoords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
              zIndex: 9999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none text-slate-900 dark:text-slate-100"
          >
            {/* Header: Month & Year Selector + Prev/Next */}
            <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition text-sm"
                title="Mes anterior"
              >
                ‹
              </button>

              <div className="flex items-center gap-1.5">
                {/* Month Dropdown */}
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition text-sm"
                title="Mes siguiente"
              >
                ›
              </button>
            </div>

            {/* Day Names Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-slate-400 uppercase">
              {DAY_NAMES.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, idx) => {
                const isDiffMonth = !item.isCurrentMonth
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDay(item.day, item.month, item.year)}
                    className={`h-7 w-7 mx-auto rounded-lg text-xs font-mono transition flex items-center justify-center relative ${
                      item.isSelected
                        ? 'bg-blue-600 text-white font-bold shadow'
                        : item.isToday
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-300 dark:border-blue-700'
                        : isDiffMonth
                        ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    {item.day}
                  </button>
                )
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Hoy
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
