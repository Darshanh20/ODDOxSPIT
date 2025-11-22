import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Plus, Search, List, LayoutGrid, Edit2, Trash2, 
  Calendar, Filter, AlertCircle, Check, Warehouse as WarehouseIcon, User, MapPin
} from 'lucide-react'

export default function Receipt() {
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState({}) // { warehouseId: [locations] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    warehouseId: '',
    supplierId: '',
    vendorName: '',
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    fetchWarehouses()
    fetchSuppliers()
    fetchReceipts()
  }, [filters])

  useEffect(() => {
    // Fetch locations for all warehouses
    warehouses.forEach(wh => {
      fetchLocations(wh.id)
    })
  }, [warehouses])

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

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/partners/suppliers?isActive=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers || data || [])
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    }
  }

  const fetchLocations = async (warehouseId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `http://localhost:5000/api/warehouses/${warehouseId}/locations?isActive=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setLocations(prev => ({ ...prev, [warehouseId]: data }))
      }
    } catch (err) {
      console.error(`Error fetching locations for warehouse ${warehouseId}:`, err)
    }
  }

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters.supplierId) params.append('supplierId', filters.supplierId)

      const response = await fetch(`http://localhost:5000/api/receipts?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        let receiptsList = data.receipts || data || []
        
        // Apply additional filters
        if (filters.vendorName) {
          receiptsList = receiptsList.filter(rec => {
            const vendorName = rec.supplier?.name || rec.notes?.replace('Vendor: ', '') || ''
            return vendorName.toLowerCase().includes(filters.vendorName.toLowerCase())
          })
        }
        
        if (filters.dateFrom) {
          receiptsList = receiptsList.filter(rec => {
            if (!rec.scheduledDate) return false
            return new Date(rec.scheduledDate) >= new Date(filters.dateFrom)
          })
        }
        
        if (filters.dateTo) {
          receiptsList = receiptsList.filter(rec => {
            if (!rec.scheduledDate) return false
            return new Date(rec.scheduledDate) <= new Date(filters.dateTo)
          })
        }
        
        // Apply search query
        if (searchQuery) {
          receiptsList = receiptsList.filter(rec => {
            const vendorName = rec.supplier?.name || rec.notes?.replace('Vendor: ', '') || ''
            return rec.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rec.supplier?.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
          })
        }
        
        setReceipts(receiptsList)
      } else {
        throw new Error('Failed to fetch receipts')
      }
      
      setError('')
    } catch (err) {
      console.error('Error fetching receipts:', err)
      setError(err.message || 'Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this receipt?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/receipts/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to cancel receipt')
      }

      setSuccess('Receipt canceled successfully!')
      fetchReceipts()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error canceling receipt:', err)
      setError(err.message || 'Failed to cancel receipt')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      READY: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      DONE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      CANCELED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    }
    return colors[status] || colors.DRAFT
  }

  const getStatusLabel = (status) => {
    const labels = {
      DRAFT: 'Draft',
      READY: 'Ready',
      DONE: 'Done',
      CANCELED: 'Canceled'
    }
    return labels[status] || status
  }

  const groupedByStatus = {
    DRAFT: receipts.filter(r => r.status === 'DRAFT'),
    READY: receipts.filter(r => r.status === 'READY'),
    DONE: receipts.filter(r => r.status === 'DONE')
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/receipts/new')}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            NEW
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Receipts
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by reference or contact..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setTimeout(fetchReceipts, 300)
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
              <option value="READY">Ready</option>
              <option value="DONE">Done</option>
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
            
            <select
              value={filters.supplierId}
              onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
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
        )}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading receipts...</p>
            </div>
          ) : receipts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No receipts found. Create your first receipt.</p>
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
                      Contact
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
                  {receipts.map((receipt) => (
                    <tr 
                      key={receipt.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => navigate(`/receipts/${receipt.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {receipt.receiptNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {receipt.supplier?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {receipt.warehouse?.name || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            ({receipt.warehouse?.code || 'N/A'})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {receipt.supplier?.contactPerson || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {receipt.scheduledDate 
                            ? new Date(receipt.scheduledDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(receipt.status)}`}>
                          {getStatusLabel(receipt.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/receipts/${receipt.id}`)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit receipt"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {receipt.status !== 'DONE' && receipt.status !== 'CANCELED' && (
                            <button
                              onClick={() => handleDelete(receipt.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Cancel receipt"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['DRAFT', 'READY', 'DONE'].map(status => (
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
                {groupedByStatus[status]?.map(receipt => (
                  <div
                    key={receipt.id}
                    onClick={() => navigate(`/receipts/${receipt.id}`)}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {receipt.receiptNumber || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {receipt.supplier?.name || 'N/A'} → {receipt.warehouse?.code || 'N/A'}
                    </div>
                    {receipt.scheduledDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(receipt.scheduledDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
                {(!groupedByStatus[status] || groupedByStatus[status].length === 0) && (
                  <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                    No receipts
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warehouse Locations Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Locations of Warehouses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(warehouse => (
            <div key={warehouse.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <WarehouseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {warehouse.name} ({warehouse.code})
                </h3>
              </div>
              {locations[warehouse.id] && locations[warehouse.id].length > 0 ? (
                <div className="space-y-1">
                  {locations[warehouse.id].map(location => (
                    <div key={location.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {location.name} ({location.code})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-500">No locations</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
