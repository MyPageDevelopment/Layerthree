'use client'

import React from 'react'

export default function ActividadesPage() {
  const handleContactUpsell = () => {
    window.location.href = 'mailto:mypage.development@gmail.com?subject=Solicitud%20Cotización%20Módulo%20Actividades%20y%20Campo%20-%20Layerthree'
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              📋 Módulo de Actividades, Tareas y Órdenes de Campo
            </h1>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Adicional
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Control de órdenes de trabajo en terreno, firmas digitales de recepción y reporte fotográfico de avance de obras.
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
      <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-6 sm:p-10 shadow-2xl overflow-hidden border border-emerald-800/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold text-xs rounded-full">
            📍 Trazabilidad Total en Terreno
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Supervisa el Avance de tus Cuadrillas de Fibra y Electricidad en Vivo
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Transforma la gestión de campo eliminando el papeleo. Recibe reportes con geolocalización, bitácoras de instalación y aprobaciones del cliente firmadas directamente en dispositivos móviles.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={handleContactUpsell}
              className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition shadow-xl text-xs sm:text-sm"
            >
              🚀 Activar Módulo Adicional
            </button>
            <span className="text-xs text-slate-400">Desarrollado con ❤️ por mypage.cl</span>
          </div>
        </div>
      </div>

      {/* Simulated Kanban Board Mockup Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>🗂️</span> Vista Previa Tablero Kanban de Tareas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Flujo de trabajo para cuadrillas técnicas de terreno</p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-800">
            Vista Kanban Operativa
          </span>
        </div>

        {/* Kanban Columns Demo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>⏳ Pendientes de Asignar</span>
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">2</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">PROJ-RED-NOC</span>
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Fusión de empalmes FO en armarios N° 3 y 4</h5>
              <p className="text-[11px] text-slate-400">Requiere OT con prueba OTDR previa.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">ALTA PRIORIDAD</span>
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Certificación Fluke Cat6a - Edificio Central</h5>
            </div>
          </div>

          {/* Column 2 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <span>⚡ En Ejecución (Terreno)</span>
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">1</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-500/50 shadow-md space-y-2">
              <div className="flex justify-between items-center">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Cuadrilla A</span>
                <span className="text-[10px] text-slate-400 font-mono">📍 GPS Activo</span>
              </div>
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Tendido de Cable UTP 23AWG en Piso 4</h5>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full w-[65%]"></div>
              </div>
              <p className="text-[10px] text-slate-400 text-right">65% Avanzado</p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span>✅ Completadas & Firmadas</span>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">3</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 opacity-90">
              <div className="flex justify-between items-center">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">OT-2026-09</span>
                <span className="text-[10px] text-emerald-600 font-bold">✍️ Firmada</span>
              </div>
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Montaje de Rack de Comunicaciones 42U</h5>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xl">
            ✍️
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Firma Digital del Cliente</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Permite a los supervisores de obra firmar la conformidad del trabajo realizado directamente en la pantalla de la tablet o celular.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xl">
            📷
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">Registro Fotográfico Georreferenciado</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Los técnicos suben fotos del antes y después de la canalización o peinado de cables con marca de agua de fecha y ubicación GPS.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xl">
            📈
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">KPIs de Rendimiento por Técnico</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Métricas automatizadas sobre el tiempo de respuesta promedio, volumen de puntos de red instalados por día y nivel de satisfacción.
          </p>
        </div>
      </div>
    </div>
  )
}
