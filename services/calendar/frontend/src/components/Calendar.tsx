'use client'

import { useState, useEffect } from 'react'
import Button from './ui/Button'

interface Task {
  id: string
  code?: string
  title: string
  startDate?: string
  endDate?: string
  status: string
  priority: string
  shiftType?: {
    id: string
    name: string
    color: string
  }
  project?: {
    id: string
    code: string
    name: string
  }
}

interface CalendarProps {
  tasks: Task[]
  onDayClick: (date: Date) => void
  onTaskClick: (task: Task) => void
  viewMode?: 'month' | 'week' | 'day'
}

export default function Calendar({ tasks, onDayClick, onTaskClick, viewMode: externalViewMode }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  // Sincronizar con viewMode externo si está presente
  useEffect(() => {
    if (externalViewMode) {
      setViewMode(externalViewMode)
    }
  }, [externalViewMode])

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday
    
    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getWeekDays = (date: Date) => {
    const days: Date[] = []
    const dayOfWeek = date.getDay() // 0 = Sunday
    const firstDayOfWeek = new Date(date)
    firstDayOfWeek.setDate(date.getDate() - dayOfWeek)
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek)
      day.setDate(firstDayOfWeek.getDate() + i)
      days.push(day)
    }
    
    return days
  }

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      if (!task.startDate) return false
      
      const taskStart = new Date(task.startDate)
      const taskEnd = task.endDate ? new Date(task.endDate) : taskStart
      
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const taskStartOnly = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate())
      const taskEndOnly = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate())
      
      return dateOnly >= taskStartOnly && dateOnly <= taskEndOnly
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (viewMode === 'day') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1))
      } else if (viewMode === 'week') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7))
      } else {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      }
      return newDate
    })
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setFullYear(prev.getFullYear() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    return date.getDate() === currentDate.getDate() &&
           date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear()
  }

  const monthDays = getMonthDays(currentDate)
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long' })
  const year = currentDate.getFullYear()

  /**
   * Obtiene las clases de color para una tarea
   * Prioridad: 1. Shift Type color, 2. Priority color
   */
  const getTaskColor = (task: Task) => {
    // Si tiene shift type, usar ese color
    if (task.shiftType?.color) {
      const hexColor = task.shiftType.color
      // Convertir hex a clases de Tailwind inline usando style
      return `border-l-4` // Usaremos inline styles
    }
    
    // Si no, usar color por prioridad
    const colors = {
      'LOW': 'bg-gray-200 border-gray-400',
      'MEDIUM': 'bg-blue-200 border-blue-500',
      'HIGH': 'bg-orange-200 border-orange-500',
      'CRITICAL': 'bg-red-200 border-red-500'
    }
    return colors[task.priority as keyof typeof colors] || 'bg-gray-200 border-gray-400'
  }

  /**
   * Obtiene el estilo inline para el color de borde basado en shift type
   */
  const getTaskBorderStyle = (task: Task): React.CSSProperties => {
    if (task.shiftType?.color) {
      return {
        borderLeftColor: task.shiftType.color,
        borderLeftWidth: '4px',
        backgroundColor: `${task.shiftType.color}20`, // 20 = transparencia en hex
      }
    }
    return {}
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {monthName} {year}
            </h2>
            <Button onClick={goToToday} variant="secondary" size="sm">
              Hoy
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Year navigation */}
            <div className="flex items-center gap-1 mr-4">
              <button
                onClick={() => navigateYear('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Año anterior"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 min-w-[60px] text-center">{year}</span>
              <button
                onClick={() => navigateYear('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Año siguiente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Month navigation */}
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Mes anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Mes siguiente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Los botones de vista Día/Semana/Mes están en la página principal */}
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Vista Día */}
        {viewMode === 'day' && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {getTasksForDay(currentDate).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No hay tareas para este día
                </div>
              ) : (
                getTasksForDay(currentDate).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={getTaskBorderStyle(task)}
                    className={`
                      p-3 rounded border-l-4 cursor-pointer hover:shadow-md transition-all
                      ${task.shiftType ? '' : getTaskColor(task)}
                    `}
                  >
                    <div className="font-semibold text-gray-900">{task.title}</div>
                    {task.project && (
                      <div className="text-xs text-gray-600 mt-1">
                        {task.project.code} - {task.project.name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Vista Semana */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {getWeekDays(currentDate).map((date, index) => {
              const dayTasks = getTasksForDay(date)
              const isCurrentDay = isToday(date)

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => onDayClick(date)}
                  className={`
                    border rounded-lg p-2 cursor-pointer transition-all min-h-[120px]
                    ${isCurrentDay ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    hover:shadow-md hover:border-blue-400
                  `}
                >
                  <div className={`
                    text-sm font-semibold mb-2 text-center
                    ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}
                  `}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayTasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onTaskClick(task)
                        }}
                        style={getTaskBorderStyle(task)}
                        className={`
                          text-xs px-1 py-0.5 rounded border-l-2 truncate
                          ${task.shiftType ? '' : getTaskColor(task)}
                          hover:shadow-sm transition-shadow
                        `}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayTasks.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Vista Mes */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-2">
          {monthDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const dayTasks = getTasksForDay(date)
            const isCurrentDay = isToday(date)
            const isSelectedDay = isSelected(date)

            return (
              <div
                key={date.toISOString()}
                onClick={() => onDayClick(date)}
                className={`
                  aspect-square border rounded-lg p-2 cursor-pointer transition-all
                  ${isCurrentDay ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  ${isSelectedDay ? 'ring-2 ring-blue-500' : ''}
                  hover:shadow-md hover:border-blue-400
                `}
              >
                <div className={`
                  text-sm font-semibold mb-1
                  ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}
                `}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1 overflow-hidden">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTaskClick(task)
                      }}
                      style={getTaskBorderStyle(task)}
                      className={`
                        text-xs px-1 py-0.5 rounded border-l-2 truncate
                        ${task.shiftType ? '' : getTaskColor(task)}
                        hover:shadow-sm transition-shadow
                      `}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayTasks.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-gray-700">Prioridad:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-200 border-l-2 border-gray-400"></div>
            <span className="text-gray-600">Baja</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-200 border-l-2 border-blue-500"></div>
            <span className="text-gray-600">Media</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-200 border-l-2 border-orange-500"></div>
            <span className="text-gray-600">Alta</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-200 border-l-2 border-red-500"></div>
            <span className="text-gray-600">Crítica</span>
          </div>
        </div>
      </div>
    </div>
  )
}
