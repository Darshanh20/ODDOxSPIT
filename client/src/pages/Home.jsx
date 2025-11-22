import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, FileText, Truck, ArrowRightLeft, TrendingUp, TrendingDown, Filter, X } from 'lucide-react'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    pendingTransfers: 0,
  })
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [stockMovements, setStockMovements] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({
    warehouseId: '',
    categoryId: '',
  })

  useEffect(() => {
    fetchWarehouses()
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [filters])

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/warehouses?isActive=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/categories?isActive=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams()
      if (filters.warehouseId) queryParams.append('warehouseId', filters.warehouseId)
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId)

      // Fetch KPIs
      const kpisResponse = await fetch(`http://localhost:5000/api/dashboard/kpis?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Fetch stock overview for low stock products
      const stockResponse = await fetch(`http://localhost:5000/api/dashboard/stock-overview?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Fetch top products for movement chart
      const movementsResponse = await fetch(`http://localhost:5000/api/dashboard/top-products?${queryParams}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (kpisResponse.ok) {
        const kpisData = await kpisResponse.json()
        setKpis({
          totalProducts: kpisData.kpis?.totalProductsInStock || 0,
          lowStock: kpisData.kpis?.lowStockCount || 0,
          pendingReceipts: kpisData.kpis?.pendingReceipts || 0,
          pendingDeliveries: kpisData.kpis?.pendingDeliveries || 0,
          pendingTransfers: kpisData.kpis?.scheduledTransfers || 0,
        })
      }

      if (stockResponse.ok) {
        const stockData = await stockResponse.json()
        // Filter low stock products
        const lowStock = stockData.stockOverview
          ?.filter(item => {
            const totalAvailable = item.totalAvailable || 0
            const reorderPoint = item.product?.reorderPoint || 0
            return totalAvailable > 0 && totalAvailable <= reorderPoint
          })
          .sort((a, b) => (a.totalAvailable || 0) - (b.totalAvailable || 0))
          .slice(0, 10) || []
        setLowStockProducts(lowStock)
      }

      if (movementsResponse.ok) {
        const movementsData = await movementsResponse.json()
        setStockMovements(movementsData.topProducts || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      warehouseId: '',
      categoryId: '',
    })
  }

  const hasActiveFilters = filters.warehouseId || filters.categoryId

  // Calculate max movement for chart scaling
  const maxMovement = stockMovements.length > 0
    ? Math.max(...stockMovements.map(p => p.totalMovement || 0))
    : 1

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your inventory operations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <select
              value={filters.warehouseId}
              onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {loading ? '...' : kpis.totalProducts.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {loading ? '...' : kpis.lowStock.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Receipts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {loading ? '...' : kpis.pendingReceipts.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Deliveries</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {loading ? '...' : kpis.pendingDeliveries.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Transfers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {loading ? '...' : kpis.pendingTransfers.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Table and Stock Movement Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Table */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              Low Stock Products
            </h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No low stock products found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Reorder Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {lowStockProducts.map((item, index) => {
                    const product = item.product
                    const available = item.totalAvailable || 0
                    const reorderPoint = product?.reorderPoint || 0
                    const isOutOfStock = available === 0
                    const isLowStock = available > 0 && available <= reorderPoint

                    return (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {product?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {product?.sku || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {available.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {reorderPoint.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            isOutOfStock
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          }`}>
                            {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stock Movement Chart */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Stock Movement (Top 10)
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
            ) : stockMovements.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No movement data available
              </div>
            ) : (
              <div className="space-y-4">
                {stockMovements.map((product, index) => {
                  const movement = product.totalMovement || 0
                  const percentage = maxMovement > 0 ? (movement / maxMovement) * 100 : 0
                  const inbound = product.inbound || 0
                  const outbound = product.outbound || 0

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white truncate flex-1">
                          {product.product?.name || 'Unknown Product'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {movement.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          In: {inbound.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          Out: {outbound.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
