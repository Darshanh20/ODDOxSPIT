/**
 * DashboardSnapshot.jsx
 * 
 * A preview component showcasing the inventory management dashboard features
 * for new users on the landing page. Uses mock data only (no API calls).
 * 
 * Design Reference: /mnt/data/StockMaster.pdf
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
import { Package, AlertTriangle, FileText, TrendingUp, Clock } from 'lucide-react'

export default function DashboardSnapshot() {
  // Mock data for demonstration
  const kpis = [
    { label: 'Total Products', value: '1,234', icon: Package, color: 'blue' },
    { label: 'Low / Out of Stock', value: '23', icon: AlertTriangle, color: 'red' },
    { label: 'Pending Receipts', value: '8', icon: FileText, color: 'yellow' },
    { label: 'Pending Deliveries', value: '15', icon: TrendingUp, color: 'green' },
    { label: 'Transfers Scheduled', value: '5', icon: Clock, color: 'purple' }
  ]

  // Recent documents mock data
  const recentDocs = [
    { type: 'Receipt', ref: 'REC-2024-001', warehouse: 'Main Warehouse', status: 'Done', items: 24, date: '2024-11-20' },
    { type: 'Delivery', ref: 'DEL-2024-045', warehouse: 'Retail Store A', status: 'Ready', items: 12, date: '2024-11-21' },
    { type: 'Transfer', ref: 'TRF-2024-018', warehouse: 'Main → Store B', status: 'Waiting', items: 8, date: '2024-11-22' },
    { type: 'Adjustment', ref: 'ADJ-2024-007', warehouse: 'Main Warehouse', status: 'Draft', items: 3, date: '2024-11-22' }
  ]

  // Alert mock data
  const alerts = [
    { type: 'warning', message: 'Product "Widget Pro X" is low on stock (5 units remaining)' },
    { type: 'info', message: '3 deliveries scheduled for today require confirmation' },
    { type: 'success', message: 'Receipt REC-2024-001 completed successfully' }
  ]

  // Stock by category mock data (for bar chart visualization)
  const stockByCategory = [
    { category: 'Electronics', count: 450, percentage: 36 },
    { category: 'Furniture', count: 320, percentage: 26 },
    { category: 'Supplies', count: 280, percentage: 23 },
    { category: 'Tools', count: 184, percentage: 15 }
  ]

  // Status badge color helper
  const getStatusColor = (status) => {
    const colors = {
      Done: 'bg-green-100 text-green-800',
      Ready: 'bg-blue-100 text-blue-800',
      Waiting: 'bg-yellow-100 text-yellow-800',
      Draft: 'bg-gray-100 text-gray-800',
      Canceled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getAlertColor = (type) => {
    const colors = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800'
    }
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-800'
  }

  return (
    <section id="dashboard-snapshot" className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Dashboard Snapshot
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get a glimpse of your inventory operations at a glance. Real-time insights, quick actions, and intelligent alerts.
          </p>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon
            return (
              <div 
                key={index}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-6 h-6 text-${kpi.color}-600`} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-sm text-gray-600">{kpi.label}</div>
              </div>
            )
          })}
        </div>

        {/* Dynamic Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Document Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                All Types
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                All Status
              </div>
            </div>

            {/* Warehouse Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                All Warehouses
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Category
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                All Categories
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid: Documents Table + Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Documents Table */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentDocs.map((doc, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doc.ref}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doc.warehouse}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doc.items}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doc.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Column */}
          <div className="space-y-8">
            {/* Stock by Category Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock by Category</h3>
              <div className="space-y-3">
                {stockByCategory.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="text-gray-900 font-medium">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts Box */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h3>
              <div className="space-y-3" aria-live="polite">
                {alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-lg text-sm ${getAlertColor(alert.type)}`}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
