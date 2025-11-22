/**
 * DashboardSnapshot.jsx
 * 
 * A preview component showcasing the inventory management dashboard features
 * for new users on the landing page. Uses mock data only (no API calls).
 * 
 * Design Reference: /mnt/data/IronVault.pdf
 * 
 * Integration:
 * - Import this component in your Landing.jsx or App.jsx
 * - Place it after the hero section for best visual flow
 * - Wrap in a feature flag comment for easy toggling
 * 
 * Features:
 * - KPI cards (5 metrics)
 * - Dynamic filters (document type, status, warehouse, category)
 * - Recent documents table
 * - Chart placeholders (stock by category, movements)
 * - Quick action buttons
 * - Alert notifications
 * 
 * @component
 */

import React, { useState } from 'react'
import { Package, AlertTriangle, FileText, Truck, ArrowRightLeft, Filter, TrendingUp } from 'lucide-react'

export default function DashboardSnapshot() {
  // Mock data for demonstration
  const kpis = [
    { label: 'Total Products', value: '2', icon: Package, color: 'blue' },
    { label: 'Low Stock', value: '0', icon: AlertTriangle, color: 'red' },
    { label: 'Pending Receipts', value: '0', icon: FileText, color: 'green' },
    { label: 'Pending Deliveries', value: '0', icon: Truck, color: 'purple' },
    { label: 'Pending Transfers', value: '0', icon: ArrowRightLeft, color: 'yellow' }
  ]

  // Stock movement mock data
  const stockMovement = [
    { product: 'Cotton', inQty: 50, outQty: 0, total: 50 }
  ]



  return (
    <section id="dashboard-snapshot" className="bg-gray-50 dark:bg-gray-900 py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Dashboard Snapshot
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get a glimpse of your inventory operations at a glance. Real-time insights, quick actions, and intelligent alerts.
          </p>
        </div>

        <div className='p-10 bg-gray-300 border rounded-3xl shadow-lg'>
          {/* Dashboard Container */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900  p-8 shadow-2xl border border-slate-700">
          {/* Dashboard Header */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Dashboard</h3>
            <p className="text-gray-400 text-sm">Overview of your inventory operations</p>
          </div>

          {/* Filters Section */}
          <div className="bg-slate-700/50 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Filters:</span>
            </div>
            <select className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm border border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Warehouses</option>
            </select>
            <select className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm border border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Categories</option>
            </select>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {kpis.map((kpi, index) => {
              const Icon = kpi.icon
              const iconColorClasses = {
                blue: 'text-blue-400',
                red: 'text-red-400',
                yellow: 'text-yellow-400',
                green: 'text-green-400',
                purple: 'text-purple-400'
              }
              const bgColorClasses = {
                blue: 'bg-blue-500/10',
                red: 'bg-red-500/10',
                yellow: 'bg-yellow-500/10',
                green: 'bg-green-500/10',
                purple: 'bg-purple-500/10'
              }
              return (
                <div 
                  key={index}
                  className="bg-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-xl p-5 hover:bg-slate-700/70 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${bgColorClasses[kpi.color]}`}>
                      <Icon className={`w-6 h-6 ${iconColorClasses[kpi.color]}`} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{kpi.value}</div>
                  <div className="text-sm text-gray-400">{kpi.label}</div>
                </div>
              )
            })}
          </div>

          {/* Content Grid: Low Stock + Stock Movement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Products */}
            <div className="bg-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h4 className="text-lg font-semibold text-white">Low Stock Products</h4>
              </div>
              <div className="p-8">
                <p className="text-gray-400 text-center">No low stock products found</p>
              </div>
            </div>

            {/* Stock Movement (Top 10) */}
            <div className="bg-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-600 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h4 className="text-lg font-semibold text-white">Stock Movement (Top 10)</h4>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {stockMovement.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 font-medium">{item.product}</span>
                        <span className="text-white font-bold">{item.total}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                          <span className="text-gray-400">In: {item.inQty}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                          <span className="text-gray-400">Out: {item.outQty}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </section>
  )
}
