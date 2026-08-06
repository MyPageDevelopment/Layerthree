'use client'

import React from 'react'

export default function CalendarioPage() {
  const handleContactUpsell = () => {
    window.location.href = 'mailto:mypage.development@gmail.com?subject=Solicitud%20Cotización%20Módulo%20Calendario%20y%20Recursos%20-%20Layerthree'
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              📅 Módulo de Calendario y Reserva de Recursos
            </h1>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Adicional
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión temporal de hitos, diagrama Gantt, asignación de turnos y reserva de vehículos/maquinaria.
          </p>
        </div>

        <button
          onClick={handleContactUpsell}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 self-start sm:self-auto"
        >
          <span>✉️</span> Solicitar Cotización de Módulo
        </button>
      </div>

      {/* Hero Banner Feature Showcase */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white p-6 sm:p-10 shadow-2xl overflow-hidden border border-indigo-800/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 font-semibold text-xs rounded-full">
            💡 Potencia la Productividad de tu Empresa
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Control Total de Tiempos, Cuadrillas y Maquinaria en Terreno
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Optimiza el rendimiento de tus proyectos corporativos mediante la automatización de calendarios integrados. Evita traslapes de personal y asegura que el equipamiento crítico esté reservado a tiempo.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={handleContactUpsell}
              className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition shadow-xl text-xs sm:text-sm"
            >
              🚀 Activar Módulo Adicional
            </button>
            <span className="text-xs text-slate-400">Soporte directo en mypage.development@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Simulated Interactive Calendar Mockup Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>🖥️</span> Vista Previa Interactiva del Módulo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Simulación del planificador mensual de proyectos y asignaciones</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">Julio 2026</span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-300 dark:border-blue-800">Vista Gantt</span>
          </div>
        </div>

        {/* Calendar Grid Demo */}
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-2 text-center text-xs min-w-[640px]">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="font-bold text-slate-400 uppercase py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">{d}</div>
            ))}
            {Array.from({ length: 14 }).map((_, i) => {
              const dayNum = i + 14
              return (
                <div
                  key={i}
                  className="min-h-24 p-2 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-start text-left space-y-1 hover:border-blue-500 transition cursor-pointer"
                >
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{dayNum}</span>
                  {i === 2 && (
                    <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] p-1 rounded font-semibold truncate">
                      🚗 Camioneta #04 - Proyecto NOC
                    </span>
                  )}
                  {i === 5 && (
                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] p-1 rounded font-semibold truncate">
                      ⚡ Turno Noche FO - Cuadrilla B
                    </span>
                  )}
                  {i === 9 && (
                    <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] p-1 rounded font-semibold truncate">
                      📦 Retiro Fusionadora Bodega
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xl">
            📊
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Carta Gantt Dinámica</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Visualiza el avance temporal de cada obra en tiempo real. Ajusta fechas límite de entrega arrastrando bloques de actividades.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xl">
            🚙
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Reserva de Vehículos y Equipos</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Control de disponibilidad de la flota de vehículos, fusionadoras, certificadores Fluke y salas de reunión técnicas.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xl">
            🔔
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Alertas Anti-Conflictos</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Notificaciones inteligentes antes de asignar un técnico que ya tiene un turno programado o una herramienta en uso.
          </p>
        </div>
      </div>
    </div>
  )
}
