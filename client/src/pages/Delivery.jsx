import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Truck, Plus, Search, List, LayoutGrid, X, Save, Edit2, Trash2, 
  Calendar, Filter, AlertCircle, Check, Warehouse as WarehouseIcon, User
} from 'lucide-react'

export default function Delivery() {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    warehouseId: '',
    vendorName: '',
    dateFrom: '',
    dateTo: ''
  })
  const [formData, setFormData] = useState({
    reference: '',
    fromWarehouseId: '',
    toVendor: '',
    scheduleDate: '',
    status: 'DRAFT'
  })

  useEffect(() => {
    fetchWarehouses()
    fetchDeliveries()
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
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }


  const generateReference = async (warehouseCode) => {
    if (!warehouseCode) return ''
    
    // Extract warehouse prefix (e.g., "WH" from "WH/PA/564")
    const warehousePrefix = warehouseCode.includes('/') 
      ? warehouseCode.split('/')[0] 
      : warehouseCode.split('-')[0] || 'WH'
    
    try {
      const token = localStorage.getItem('token')
      // Fetch all deliveries to find the last sequence number
      const response = await fetch('http://localhost:5000/api/deliveries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const deliveries = data.deliveries || data
        
        // Filter deliveries with same warehouse prefix and find max sequence
        const matchingDeliveries = deliveries.filter(d => {
          if (!d.deliveryNumber) return false
          const parts = d.deliveryNumber.split('/')
          return parts.length === 3 && parts[0] === warehousePrefix && parts[1] === 'OUT'
        })
        
        let sequence = 1
        if (matchingDeliveries.length > 0) {
          const sequences = matchingDeliveries.map(d => {
            const seq = parseInt(d.deliveryNumber.split('/')[2])
            return isNaN(seq) ? 0 : seq
          })
          const maxSeq = Math.max(...sequences)
          sequence = maxSeq + 1
        }
        
        return `${warehousePrefix}/OUT/${String(sequence).padStart(4, '0')}`
      }
    } catch (err) {
      console.error('Error generating reference:', err)
    }
    
    // Fallback: generate with sequence 1
    return `${warehousePrefix}/OUT/0001`
  }

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Build query params
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters.customerId) params.append('customerId', filters.customerId)
      
      const response = await fetch(`http://localhost:5000/api/deliveries?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        let deliveries = data.deliveries || data
        
        // Apply additional filters (vendor name, date range)
        if (filters.vendorName) {
          deliveries = deliveries.filter(d => {
            const vendorName = d.customer?.name || d.shippingAddress?.replace('Vendor: ', '') || ''
            return vendorName.toLowerCase().includes(filters.vendorName.toLowerCase())
          })
        }
        
        if (filters.dateFrom) {
          deliveries = deliveries.filter(d => {
            if (!d.scheduledDate) return false
            return new Date(d.scheduledDate) >= new Date(filters.dateFrom)
          })
        }
        
        if (filters.dateTo) {
          deliveries = deliveries.filter(d => {
            if (!d.scheduledDate) return false
            return new Date(d.scheduledDate) <= new Date(filters.dateTo)
          })
        }
        
        // Apply search query
        if (searchQuery) {
          deliveries = deliveries.filter(d => {
            const vendorName = d.customer?.name || d.shippingAddress?.replace('Vendor: ', '') || ''
            return d.deliveryNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              vendorName.toLowerCase().includes(searchQuery.toLowerCase())
          })
        }
        
        setDeliveries(deliveries)
      } else {
        throw new Error('Failed to fetch deliveries')
      }
      
      setError('')
    } catch (err) {
      console.error('Error fetching deliveries:', err)
      setError(err.message || 'Failed to load deliveries')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Auto-generate reference when warehouse changes
      if (name === 'fromWarehouseId' && !isEditing) {
        const warehouse = warehouses.find(w => w.id === value)
        if (warehouse) {
          generateReference(warehouse.code).then(ref => {
            setFormData(prev => ({ ...prev, reference: ref }))
          })
        }
      }
      
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.fromWarehouseId || !formData.toVendor) {
      setError('Warehouse and Vendor are required')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = isEditing
        ? `http://localhost:5000/api/deliveries/${editingId}`
        : 'http://localhost:5000/api/deliveries'
      
      const method = isEditing ? 'PUT' : 'POST'

      const payload = {
        warehouseId: formData.fromWarehouseId,
        customerId: null, // Will be handled separately if needed
        scheduledDate: formData.scheduleDate || null,
        shippingAddress: formData.toVendor ? `Vendor: ${formData.toVendor}` : null,
        notes: formData.toVendor ? `Vendor: ${formData.toVendor}` : null,
        status: 'DRAFT', // Always create as DRAFT
        items: [] // Empty items array for now
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to save delivery')
      }

      setSuccess(isEditing ? 'Delivery updated successfully!' : 'Delivery created successfully!')
      resetForm()
      fetchDeliveries()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving delivery:', err)
      setError(err.message || 'Failed to save delivery')
    }
  }

  const handleEdit = (delivery) => {
    setFormData({
      reference: delivery.deliveryNumber || '',
      fromWarehouseId: delivery.warehouseId || '',
      toVendor: delivery.customer?.name || delivery.shippingAddress?.replace('Vendor: ', '') || '',
      scheduleDate: delivery.scheduledDate ? new Date(delivery.scheduledDate).toISOString().split('T')[0] : '',
      status: delivery.status || 'DRAFT'
    })
    setIsEditing(true)
    setEditingId(delivery.id)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery order?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/deliveries/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to cancel delivery')
      }

      setSuccess('Delivery canceled successfully!')
      fetchDeliveries()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error canceling delivery:', err)
      setError(err.message || 'Failed to cancel delivery')
    }
  }

  const resetForm = () => {
    setFormData({
      reference: '',
      fromWarehouseId: '',
      toVendor: '',
      scheduleDate: '',
      status: 'DRAFT'
    })
    setIsEditing(false)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      WAITING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      READY: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      DONE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      CANCELED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    }
    return colors[status] || colors.DRAFT
  }

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Draft',
      WAITING: 'Waiting',
      READY: 'Ready',
      DONE: 'Done',
      CANCELED: 'Canceled'
    }
    return labels[status] || status
  }

  const groupedByStatus = {
    DRAFT: deliveries.filter(d => d.status === 'DRAFT'),
    WAITING: deliveries.filter(d => d.status === 'WAITING'),
    READY: deliveries.filter(d => d.status === 'READY'),
    DONE: deliveries.filter(d => d.status === 'DONE'),
    CANCELED: deliveries.filter(d => d.status === 'CANCELED')
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/deliveries/new')}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            NEW
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Delivery
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by reference or vendor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setTimeout(fetchDeliveries, 300)
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent w-64"
            />
          </div>
          
          {/* View Toggle */}
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'kanban'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Kanban View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="WAITING">Waiting</option>
              <option value="READY">Ready</option>
              <option value="DONE">Done</option>
              <option value="CANCELED">Canceled</option>
            </select>
            
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Vendor Name"
              value={filters.vendorName || ''}
              onChange={(e) => setFilters({ ...filters, vendorName: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            />
            
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
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Delivery Order' : 'Create New Delivery Order'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-generated</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    required
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="WAITING">Waiting</option>
                    <option value="READY">Ready</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELED">Canceled</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From (Warehouse) <span className="text-red-500">*</span>
                </label>
                <select
                  name="fromWarehouseId"
                  value={formData.fromWarehouseId}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To (Vendor) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="toVendor"
                  value={formData.toVendor}
                  onChange={handleInputChange}
                  placeholder="e.g., Azure Interior"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Date
                </label>
                <input
                  type="date"
                  name="scheduleDate"
                  value={formData.scheduleDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update' : 'Create'} Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading deliveries...</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No deliveries found. Create your first delivery order.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Schedule Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveries.map((delivery) => (
                    <tr 
                      key={delivery.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => navigate(`/deliveries/${delivery.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {delivery.deliveryNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {delivery.warehouse?.name || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            ({delivery.warehouse?.code || 'N/A'})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {(() => {
                            // Check if this is an internal transfer delivery
                            const isInternalTransfer = delivery.notes && delivery.notes.includes('Internal Transfer:');
                            if (isInternalTransfer) {
                              // Extract destination from notes or show "Internal Transfer"
                              const match = delivery.notes.match(/to (.+?)(?:\n|$)/);
                              return match ? match[1] : 'Internal Transfer';
                            }
                            // Normal delivery - show customer name
                            return delivery.customer?.name || delivery.shippingAddress?.replace('Vendor: ', '') || 'Customer';
                          })()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {delivery.scheduledDate 
                            ? new Date(delivery.scheduledDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(delivery.status)}`}>
                          {getStatusLabel(delivery.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(delivery)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit delivery"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(delivery.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cancel delivery"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED'].map(status => (
            <div key={status} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getStatusLabel(status)}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                  {groupedByStatus[status]?.length || 0}
                </span>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {groupedByStatus[status]?.map(delivery => (
                    <div
                      key={delivery.id}
                      onClick={() => navigate(`/deliveries/${delivery.id}`)}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {delivery.deliveryNumber || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {delivery.warehouse?.code || 'N/A'} → {delivery.customer?.name || delivery.shippingAddress?.replace('Vendor: ', '') || 'N/A'}
                    </div>
                    {delivery.scheduledDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(delivery.scheduledDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
                {(!groupedByStatus[status] || groupedByStatus[status].length === 0) && (
                  <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                    No deliveries
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

