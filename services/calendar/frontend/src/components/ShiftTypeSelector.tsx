import React from 'react'
import { ShiftType } from '@/types'

interface ShiftTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  shiftTypes: ShiftType[]
  required?: boolean
  disabled?: boolean
  label?: string
}

export default function ShiftTypeSelector({
  value,
  onChange,
  shiftTypes,
  required = false,
  disabled = false,
  label = 'Tipo de Jornada'
}: ShiftTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {/* Opción "Ninguno" */}
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={disabled}
          className={`
            relative p-3 rounded-lg border-2 transition-all
            ${value === '' 
              ? 'border-blue-500 bg-blue-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded border-2 border-gray-400 bg-gray-100" />
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 text-sm">Sin jornada</div>
              <div className="text-xs text-gray-500">No asignar tipo</div>
            </div>
          </div>
        </button>

        {/* Tipos de jornada disponibles */}
        {shiftTypes.filter(st => st.isActive).map((shiftType) => (
          <button
            key={shiftType.id}
            type="button"
            onClick={() => onChange(shiftType.id)}
            disabled={disabled}
            className={`
              relative p-3 rounded-lg border-2 transition-all
              ${value === shiftType.id 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-300 bg-white hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center space-x-3">
              {/* Color preview */}
              <div 
                className="w-6 h-6 rounded border-2 border-gray-300 flex-shrink-0"
                style={{ backgroundColor: shiftType.color }}
                title={shiftType.color}
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900 text-sm">{shiftType.name}</div>
                <div className="text-xs text-gray-500 truncate">{shiftType.code}</div>
              </div>
            </div>
            {value === shiftType.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      {value && shiftTypes.find(st => st.id === value)?.description && (
        <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
          ℹ️ {shiftTypes.find(st => st.id === value)?.description}
        </p>
      )}
    </div>
  )
}
