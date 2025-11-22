import React, { useState, useEffect } from 'react'
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, X, Save, AlertCircle, Check } from 'lucide-react'

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: ''
  })

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/warehouses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch warehouses')
      }

      const data = await response.json()
      setWarehouses(data)
      setError('')
    } catch (err) {
      console.error('Error fetching warehouses:', err)
      setError(err.message || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  const generateShortCode = (name) => {
    if (!name || !name.trim()) return ''
    
    // Get first two letters from the name (remove spaces and special characters)
    const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    
    // Take first two letters, if less than 2, pad with X
    let letters = cleaned.substring(0, 2)
    if (letters.length < 2) {
      letters = letters.padEnd(2, 'X')
    }
    
    // Generate 3 random digits
    const randomDigits = Math.floor(100 + Math.random() * 900) // Generates 100-999
    
    // Format: WH/XX/XXX
    return `WH/${letters}/${randomDigits}`
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      
      // Auto-generate short code from name when not editing
      if (name === 'name' && !isEditing) {
        updated.code = generateShortCode(value)
      }
      
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and Short Code are required')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = isEditing
        ? `http://localhost:5000/api/warehouses/${editingId}`
        : 'http://localhost:5000/api/warehouses'
      
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
          address: formData.address.trim() || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to save warehouse')
      }

      setSuccess(isEditing ? 'Warehouse updated successfully!' : 'Warehouse created successfully!')
      resetForm()
      fetchWarehouses()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving warehouse:', err)
      setError(err.message || 'Failed to save warehouse')
    }
  }

  const handleEdit = (warehouse) => {
    setFormData({
      name: warehouse.name || '',
      code: warehouse.code || '',
      address: warehouse.address || ''
    })
    setIsEditing(true)
    setEditingId(warehouse.id)
    setError('')
    setSuccess('')
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warehouse?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/warehouses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete warehouse')
      }

      setSuccess('Warehouse deleted successfully!')
      fetchWarehouses()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting warehouse:', err)
      setError(err.message || 'Failed to delete warehouse')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: ''
    })
    setIsEditing(false)
    setEditingId(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <WarehouseIcon className="w-8 h-8" />
            Warehouse
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your warehouse locations</p>
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

      {/* Add/Edit Warehouse Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Warehouse' : 'Add New Warehouse'}
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
                placeholder="e.g., Main Warehouse, Warehouse A"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                required
              />
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
                placeholder="Auto-generated from name"
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
                  Code will be generated automatically from the warehouse name
                </p>
              )}
            </div>
          </div>

          {/* Address Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address of warehouse location"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent resize-none"
            />
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
                  Update Warehouse
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Warehouse
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Warehouses</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-8 text-center">
            <WarehouseIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No warehouses found. Add your first warehouse above.</p>
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
                    Address
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
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {warehouse.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {warehouse.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                        {warehouse.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {warehouse.address || <span className="text-gray-400 dark:text-gray-500 italic">Not provided</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        warehouse.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit warehouse"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(warehouse.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete warehouse"
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

