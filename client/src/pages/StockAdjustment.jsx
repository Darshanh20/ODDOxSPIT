import React, { useState, useEffect } from 'react'
import { 
  RefreshCw, Plus, Save, X, Filter, AlertCircle, Check, 
  Package, MapPin, Calendar, TrendingUp, TrendingDown, Minus
} from 'lucide-react'

export default function StockAdjustment() {
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [locations, setLocations] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    locationId: '',
    recordedStock: 0,
    physicalCount: '',
    difference: 0,
    adjustmentType: '',
    reason: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })
  
  const [filters, setFilters] = useState({
    productId: '',
    warehouseId: '',
    locationId: '',
    reason: '',
    adjustmentType: '',
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchWarehouses()
    fetchAdjustments()
  }, [filters])

  useEffect(() => {
    if (formData.productId && formData.warehouseId) {
      fetchCurrentStock()
    }
  }, [formData.productId, formData.warehouseId, formData.locationId])

  useEffect(() => {
    calculateDifference()
  }, [formData.physicalCount, formData.recordedStock])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/products?isActive=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || data || [])
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/warehouses?isActive=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }

  const fetchLocations = async (warehouseId) => {
    if (!warehouseId) {
      setLocations([])
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `http://localhost:5000/api/warehouses/${warehouseId}/locations?isActive=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (err) {
      console.error('Error fetching locations:', err)
      setLocations([])
    }
  }

  const fetchCurrentStock = async () => {
    if (!formData.productId || !formData.warehouseId) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `http://localhost:5000/api/products/${formData.productId}/stock/warehouse?warehouseId=${formData.warehouseId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.ok) {
        const stock = await response.json()
        const stockData = Array.isArray(stock) 
          ? stock.find(s => {
              if (formData.locationId) {
                return s.locationId === formData.locationId
              }
              return !s.locationId || s.locationId === null
            }) || stock[0]
          : stock

        if (stockData) {
          setFormData(prev => ({
            ...prev,
            recordedStock: stockData.quantity || 0
          }))
        } else {
          setFormData(prev => ({ ...prev, recordedStock: 0 }))
        }
      } else {
        setFormData(prev => ({ ...prev, recordedStock: 0 }))
      }
    } catch (err) {
      console.error('Error fetching stock:', err)
      setFormData(prev => ({ ...prev, recordedStock: 0 }))
    }
  }

  const calculateDifference = () => {
    const physical = parseFloat(formData.physicalCount) || 0
    const recorded = formData.recordedStock || 0
    const difference = physical - recorded

    let adjustmentType = ''
    if (difference > 0) {
      adjustmentType = 'Stock In'
    } else if (difference < 0) {
      adjustmentType = 'Stock Out'
    } else {
      adjustmentType = 'No Change'
    }

    setFormData(prev => ({
      ...prev,
      difference,
      adjustmentType
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      if (name === 'warehouseId') {
        fetchLocations(value)
        updated.locationId = '' // Reset location when warehouse changes
      }
      
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.productId) {
      setError('Product is required')
      return
    }
    if (!formData.warehouseId) {
      setError('Warehouse is required')
      return
    }
    if (formData.physicalCount === '' || formData.physicalCount < 0) {
      setError('Physical count must be >= 0')
      return
    }
    if (!formData.reason) {
      setError('Reason is required')
      return
    }
    if (formData.difference === 0) {
      setError('No adjustment needed. Physical count matches recorded stock.')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      // Create adjustment with single item
      const payload = {
        warehouseId: formData.warehouseId,
        reason: formData.reason,
        notes: formData.notes || null,
        adjustmentDate: formData.date ? new Date(formData.date) : new Date(),
        items: [{
          productId: formData.productId,
          systemQuantity: formData.recordedStock,
          countedQuantity: parseFloat(formData.physicalCount),
          difference: formData.difference,
          notes: formData.notes || null
        }]
      }

      const response = await fetch('http://localhost:5000/api/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to create adjustment')
      }

      // Validate the adjustment immediately to apply stock changes
      const createdAdjustment = await response.json()
      
      // Validate the adjustment
      const validateResponse = await fetch(
        `http://localhost:5000/api/adjustments/${createdAdjustment.id}/validate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!validateResponse.ok) {
        const data = await validateResponse.json()
        throw new Error(data.message || 'Failed to validate adjustment')
      }

      setSuccess('Stock adjustment applied successfully!')
      resetForm()
      fetchAdjustments()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error creating adjustment:', err)
      setError(err.message || 'Failed to create adjustment')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      productId: '',
      warehouseId: '',
      locationId: '',
      recordedStock: 0,
      physicalCount: '',
      difference: 0,
      adjustmentType: '',
      reason: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    })
    setLocations([])
    setError('')
  }

  const fetchAdjustments = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams()
      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters.reason) params.append('reason', filters.reason)

      const response = await fetch(
        `http://localhost:5000/api/adjustments?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        let adjustmentsList = data.adjustments || data || []
        
        // Apply additional filters
        if (filters.productId) {
          adjustmentsList = adjustmentsList.filter(adj => 
            adj.items?.some(item => item.productId === filters.productId)
          )
        }
        
        if (filters.dateFrom) {
          adjustmentsList = adjustmentsList.filter(adj => {
            if (!adj.adjustmentDate) return false
            return new Date(adj.adjustmentDate) >= new Date(filters.dateFrom)
          })
        }
        
        if (filters.dateTo) {
          adjustmentsList = adjustmentsList.filter(adj => {
            if (!adj.adjustmentDate) return false
            return new Date(adj.adjustmentDate) <= new Date(filters.dateTo)
          })
        }
        
        setAdjustments(adjustmentsList)
      }
    } catch (err) {
      console.error('Error fetching adjustments:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDifferenceColor = (difference) => {
    if (difference > 0) return 'text-green-600 dark:text-green-400'
    if (difference < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getDifferenceIcon = (difference) => {
    if (difference > 0) return <TrendingUp className="w-4 h-4" />
    if (difference < 0) return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="w-8 h-8" />
          Stock Adjustment
        </h1>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Adjustment Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Adjustment Form
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                name="productId"
                value={formData.productId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                required
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    [{product.sku}] {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                name="warehouseId"
                value={formData.warehouseId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location (Optional)
            </label>
            <select
              name="locationId"
              value={formData.locationId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              disabled={!formData.warehouseId}
            >
              <option value="">All Locations (Warehouse Level)</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recorded Stock
              </label>
              <input
                type="number"
                value={formData.recordedStock}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Physical Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="physicalCount"
                value={formData.physicalCount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difference
              </label>
              <div className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2 ${getDifferenceColor(formData.difference)}`}>
                {getDifferenceIcon(formData.difference)}
                <span className="font-medium">
                  {formData.difference > 0 ? '+' : ''}{formData.difference}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adjustment Type
              </label>
              <input
                type="text"
                value={formData.adjustmentType}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                required
              >
                <option value="">Select Reason</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Theft/Loss</option>
                <option value="EXPIRED">Expired</option>
                <option value="FOUND">Found/Discovered</option>
                <option value="PHYSICAL_COUNT">Counting Error</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              placeholder="Additional details about this adjustment..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Applying...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>

      {/* Adjustment History */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Adjustment History
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <select
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              >
                <option value="">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>

              <select
                value={filters.reason}
                onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              >
                <option value="">All Reasons</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Theft/Loss</option>
                <option value="EXPIRED">Expired</option>
                <option value="FOUND">Found/Discovered</option>
                <option value="PHYSICAL_COUNT">Counting Error</option>
                <option value="OTHER">Other</option>
              </select>

              <input
                type="date"
                placeholder="From Date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              />

              <input
                type="date"
                placeholder="To Date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
          </div>
        )}

        {/* History Table */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading adjustments...</p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No adjustments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Previous
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    New
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Difference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Adjusted By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {adjustments.map((adjustment) => 
                  adjustment.items?.map((item, itemIndex) => (
                    <tr key={`${adjustment.id}-${itemIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {adjustment.adjustmentDate 
                            ? new Date(adjustment.adjustmentDate).toLocaleDateString()
                            : new Date(adjustment.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {adjustment.adjustmentNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          [{item.product?.sku}] {item.product?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {adjustment.warehouse?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {item.systemQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {item.countedQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium flex items-center gap-1 ${getDifferenceColor(item.difference)}`}>
                          {getDifferenceIcon(item.difference)}
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {adjustment.reason?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {adjustment.createdBy?.name || adjustment.createdBy?.email || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

