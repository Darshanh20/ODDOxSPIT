import React, { useState, useEffect } from 'react'
import { MapPin, Plus, Edit2, Trash2, X, Save, AlertCircle, Check, Warehouse as WarehouseIcon, Filter } from 'lucide-react'

export default function Location() {
  const [locations, setLocations] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    warehouseId: ''
  })

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    if (warehouses.length > 0 || warehouseFilter) {
      fetchLocations()
    }
  }, [warehouseFilter, warehouses.length])

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

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (warehouseFilter) {
        // Fetch locations for specific warehouse
        const response = await fetch(`http://localhost:5000/api/warehouses/${warehouseFilter}/locations?isActive=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setLocations(data)
        } else {
          throw new Error('Failed to fetch locations')
        }
      } else {
        // Fetch locations from all warehouses
        const allLocations = []
        for (const warehouse of warehouses) {
          try {
            const response = await fetch(`http://localhost:5000/api/warehouses/${warehouse.id}/locations?isActive=true`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (response.ok) {
              const data = await response.json()
              allLocations.push(...data)
            }
          } catch (err) {
            console.error(`Error fetching locations for warehouse ${warehouse.id}:`, err)
          }
        }
        setLocations(allLocations)
      }
      
      setError('')
    } catch (err) {
      console.error('Error fetching locations:', err)
      setError(err.message || 'Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const generateLocationCode = (name, warehouseCode) => {
    if (!name || !name.trim() || !warehouseCode) return ''
    
    // Get first two letters from the location name
    const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    let letters = cleaned.substring(0, 2)
    if (letters.length < 2) {
      letters = letters.padEnd(2, 'X')
    }
    
    // Generate 3 random digits
    const randomDigits = Math.floor(100 + Math.random() * 900)
    
    // Extract warehouse prefix (if warehouse code is WH/XX/XXX, extract WH, otherwise use first part)
    let warehousePrefix = 'WH'
    if (warehouseCode.includes('/')) {
      warehousePrefix = warehouseCode.split('/')[0]
    } else if (warehouseCode.includes('-')) {
      warehousePrefix = warehouseCode.split('-')[0]
    } else {
      warehousePrefix = warehouseCode.length >= 2 ? warehouseCode.substring(0, 2) : warehouseCode
    }
    
    // Format: WH/XX/XXX (Warehouse Prefix + Location Letters + Random Digits)
    return `${warehousePrefix}/${letters}/${randomDigits}`
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      
      // Auto-generate location code when name or warehouse changes (only when not editing)
      if ((name === 'name' || name === 'warehouseId') && !isEditing) {
        const warehouse = warehouses.find(w => w.id === value) || warehouses.find(w => w.id === updated.warehouseId)
        if (updated.name && warehouse) {
          // Extract warehouse code (remove WH/ and /XXX parts if exists)
          const warehouseCode = warehouse.code.includes('/') 
            ? warehouse.code.split('/')[0] 
            : warehouse.code.split('-')[0] || 'WH'
          updated.code = generateLocationCode(updated.name, warehouseCode)
        }
      }
      
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim() || !formData.code.trim() || !formData.warehouseId) {
      setError('Name, Short Code, and Warehouse are required')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = isEditing
        ? `http://localhost:5000/api/locations/${editingId}`
        : 'http://localhost:5000/api/locations'
      
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim(),
          warehouseId: formData.warehouseId,
          type: 'SHELF' // Default type
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to save location')
      }

      setSuccess(isEditing ? 'Location updated successfully!' : 'Location created successfully!')
      resetForm()
      fetchLocations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving location:', err)
      setError(err.message || 'Failed to save location')
    }
  }

  const handleEdit = (location) => {
    setFormData({
      name: location.name || '',
      code: location.code || '',
      warehouseId: location.warehouseId || ''
    })
    setIsEditing(true)
    setEditingId(location.id)
    setError('')
    setSuccess('')
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/locations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete location')
      }

      setSuccess('Location deleted successfully!')
      fetchLocations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting location:', err)
      setError(err.message || 'Failed to delete location')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      warehouseId: ''
    })
    setIsEditing(false)
    setEditingId(null)
    setError('')
  }

  const filteredLocations = warehouseFilter
    ? locations.filter(loc => loc.warehouseId === warehouseFilter)
    : locations

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-8 h-8" />
            Location
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage locations within warehouses (rooms, racks, bins, shelves, etc.)</p>
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

      {/* Add/Edit Location Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Location' : 'Add New Location'}
          </h2>
          {isEditing && (
            <button
              onClick={resetForm}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warehouse Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                name="warehouseId"
                value={formData.warehouseId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Rack A, Bin 01, Production Floor"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Short Code Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Short Code <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Auto-generated)</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder="Auto-generated from warehouse and name"
              readOnly={!isEditing}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                isEditing 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' 
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed'
              } placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent`}
              required
            />
            {!isEditing && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Code will be generated automatically: Warehouse Code + Location Code (e.g., WH-PA-564)
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  Update Location
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Location
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Warehouse:</span>
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Locations</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading locations...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {warehouseFilter ? 'No locations found for selected warehouse.' : 'No locations found. Add your first location above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Short Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Warehouse
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
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {location.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {location.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                        {location.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <WarehouseIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {location.warehouse?.name || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          ({location.warehouse?.code || 'N/A'})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        location.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(location)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit location"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(location.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete location"
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
    </div>
  )
}

