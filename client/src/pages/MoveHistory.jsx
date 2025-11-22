import React, { useState, useEffect } from 'react'
import { Plus, Search, List, Grid } from 'lucide-react'
import InternalTransferModal from '../components/InternalTransferModal'

export default function MoveHistory() {
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchMoveHistory()
  }, [debouncedSearch, statusFilter, typeFilter])

  const fetchMoveHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams()
      if (debouncedSearch) queryParams.append('search', debouncedSearch)
      if (statusFilter) queryParams.append('status', statusFilter)
      if (typeFilter) queryParams.append('type', typeFilter)

      const response = await fetch(`http://localhost:5000/api/moves?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMoves(data.moves || [])
      }
    } catch (error) {
      console.error('Error fetching move history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
      case 'READY':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
      case 'WAITING':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      case 'CANCELED':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const getRowColor = (movementDirection) => {
    if (movementDirection === 'IN') {
      return 'bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500'
    } else if (movementDirection === 'OUT') {
      return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500'
    }
    return 'bg-white dark:bg-gray-800'
  }

  // Group moves by status for kanban view
  const groupedByStatus = moves.reduce((acc, move) => {
    // Normalize status to uppercase to handle any case variations
    const status = (move.status || 'DRAFT').toUpperCase()
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(move)
    return acc
  }, {})

  // Define status columns in order
  const statusColumns = ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']
  
  // Get all unique statuses from moves (in case there are others)
  const allStatuses = [...new Set(moves.map(m => (m.status || 'DRAFT').toUpperCase()))]
  
  // Combine defined columns with any additional statuses found
  const displayColumns = [...new Set([...statusColumns, ...allStatuses])]

  const handleTransferSuccess = (toastData) => {
    if (typeof toastData === 'string') {
      // Backward compatibility
      setToast({ message: toastData, type: 'success' })
    } else {
      setToast(toastData)
    }
    fetchMoveHistory() // Refresh the list
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            NEW
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Move History</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by reference or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 w-64"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Kanban View"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="WAITING">Waiting</option>
              <option value="READY">Ready</option>
              <option value="DONE">Done</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUST">Adjustment</option>
            </select>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading move history...</div>
            ) : moves.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No move history found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {moves.map((move) => (
                    <tr
                      key={move.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${getRowColor(move.movementDirection)}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {move.reference}
                        </div>
                        {move.product && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {move.product.name} ({move.product.sku})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {new Date(move.date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {move.contact}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {move.from}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {move.to}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {move.quantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(move.status)}`}>
                          {move.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading move history...</div>
          ) : moves.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No move history found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {moves.map((move) => {
                // Determine block color based on movement direction - using light colors like list view
                let blockClasses = ''
                let borderClasses = ''
                if (move.movementDirection === 'IN') {
                  blockClasses = 'bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500'
                  borderClasses = 'border-gray-200 dark:border-gray-700'
                } else if (move.movementDirection === 'OUT') {
                  blockClasses = 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500'
                  borderClasses = 'border-gray-200 dark:border-gray-700'
                } else if (move.movementDirection === 'TRANSFER') {
                  blockClasses = 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500'
                  borderClasses = 'border-gray-200 dark:border-gray-700'
                } else {
                  blockClasses = 'bg-white dark:bg-gray-800 border-l-4 border-gray-300 dark:border-gray-600'
                  borderClasses = 'border-gray-200 dark:border-gray-700'
                }

                return (
                  <div
                    key={move.id}
                    className={`${blockClasses} ${borderClasses} border-t border-r border-b rounded-lg p-4 cursor-pointer transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {move.reference}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(move.status)}`}>
                        {move.status}
                      </span>
                    </div>
                    
                    {move.product && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 mb-2 font-medium">
                        {move.product.name}
                        {move.product.sku && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">({move.product.sku})</span>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">From:</span>
                        <span>{move.from}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-medium">To:</span>
                        <span>{move.to}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        Qty: {move.quantity.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(move.date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {move.contact && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {move.contact}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Internal Transfer Modal */}
      <InternalTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={handleTransferSuccess}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <p className="font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  )
}

