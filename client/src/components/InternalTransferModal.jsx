import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Package } from 'lucide-react'

export default function InternalTransferModal({ isOpen, onClose, onSuccess }) {
  const [warehouses, setWarehouses] = useState([])
  const [fromLocations, setFromLocations] = useState([])
  const [toLocations, setToLocations] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    fromLocationId: '',
    toWarehouseId: '',
    toLocationId: '',
    items: [{ productId: '', quantity: 0 }]
  })

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses()
      // Reset form
      setFormData({
        fromWarehouseId: '',
        fromLocationId: '',
        toWarehouseId: '',
        toLocationId: '',
        items: [{ productId: '', quantity: 0 }]
      })
      setErrors({})
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.fromWarehouseId) {
      fetchLocations(formData.fromWarehouseId, 'from')
      fetchProductsWithStock(formData.fromWarehouseId, formData.fromLocationId)
    } else {
      setFromLocations([])
      setProducts([])
    }
  }, [formData.fromWarehouseId, formData.fromLocationId])

  useEffect(() => {
    if (formData.toWarehouseId) {
      fetchLocations(formData.toWarehouseId, 'to')
    } else {
      setToLocations([])
    }
  }, [formData.toWarehouseId])

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
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const fetchLocations = async (warehouseId, type) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/warehouses/${warehouseId}/locations?isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (type === 'from') {
          setFromLocations(data)
        } else {
          setToLocations(data)
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchProductsWithStock = async (warehouseId, locationId = null) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      // Fetch all products with stock in the source warehouse
      const response = await fetch(`http://localhost:5000/api/products?isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const productsList = data.products || data || []
        
        // Filter products that have stock in the source warehouse/location
        const productsWithStock = productsList.filter(product => {
          if (!product.stock || product.stock.length === 0) return false
          return product.stock.some(stock => {
            const matchesWarehouse = stock.warehouseId === warehouseId
            const matchesLocation = locationId 
              ? stock.locationId === locationId 
              : stock.locationId === null
            return matchesWarehouse && matchesLocation && stock.available > 0
          })
        })
        
        setProducts(productsWithStock)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAvailableStock = (productId) => {
    const product = products.find(p => p.id === productId)
    if (!product || !product.stock) return 0
    
    const stock = product.stock.find(s => {
      const matchesWarehouse = s.warehouseId === formData.fromWarehouseId
      const matchesLocation = formData.fromLocationId
        ? s.locationId === formData.fromLocationId
        : s.locationId === null
      return matchesWarehouse && matchesLocation
    })
    
    return stock ? stock.available : 0
  }

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 0 }]
    }))
  }

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value }
        }
        return item
      })
    }))
    
    // Clear errors for this item
    if (errors[`item_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`item_${index}`]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!formData.fromWarehouseId) newErrors.fromWarehouseId = 'From warehouse is required'
    if (!formData.toWarehouseId) newErrors.toWarehouseId = 'To warehouse is required'
    if (formData.fromWarehouseId === formData.toWarehouseId && 
        formData.fromLocationId === formData.toLocationId) {
      newErrors.toWarehouseId = 'Source and destination cannot be the same'
    }

    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item_${index}`] = 'Product is required'
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}`] = 'Quantity must be greater than 0'
      }
      if (item.productId) {
        const available = getAvailableStock(item.productId)
        if (item.quantity > available) {
          newErrors[`item_${index}`] = `Insufficient stock. Available: ${available}`
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/moves/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fromWarehouseId: formData.fromWarehouseId,
          fromLocationId: formData.fromLocationId || null,
          toWarehouseId: formData.toWarehouseId,
          toLocationId: formData.toLocationId || null,
          items: formData.items.map(item => ({
            productId: item.productId,
            quantityRequested: parseFloat(item.quantity)
          }))
        })
      })

      if (response.ok) {
        const transfer = await response.json()
        
        // Auto-validate the transfer
        try {
          const validateResponse = await fetch(`http://localhost:5000/api/moves/internal/${transfer.id}/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              items: transfer.items.map(item => ({
                itemId: item.id,
                quantityTransferred: item.quantityRequested
              }))
            })
          })

          if (validateResponse.ok) {
            onSuccess({ message: 'Internal Transfer created and validated successfully', type: 'success' })
            onClose()
          } else {
            const errorData = await validateResponse.json()
            onSuccess({ message: 'Transfer created but validation failed: ' + (errorData.message || 'Insufficient stock'), type: 'error' })
            onClose() // Close modal even if validation fails - transfer is created
          }
        } catch (validateError) {
          console.error('Error validating transfer:', validateError)
          onSuccess({ message: 'Internal Transfer created, but validation failed', type: 'error' })
          onClose() // Close modal even if validation fails - transfer is created
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Failed to create transfer'
        setErrors({ submit: errorMessage })
        // Show error toast
        onSuccess({ message: errorMessage, type: 'error' })
      }
    } catch (error) {
      console.error('Error creating transfer:', error)
      setErrors({ submit: 'Failed to create transfer' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Internal Transfer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warehouse Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                From Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.fromWarehouseId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fromWarehouseId: e.target.value, fromLocationId: '' }))
                  if (errors.fromWarehouseId) setErrors(prev => ({ ...prev, fromWarehouseId: '' }))
                }}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.fromWarehouseId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500`}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              {errors.fromWarehouseId && (
                <p className="text-sm text-red-500 mt-1">{errors.fromWarehouseId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                From Location
              </label>
              <select
                value={formData.fromLocationId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fromLocationId: e.target.value }))
                  fetchProductsWithStock(formData.fromWarehouseId, e.target.value)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                disabled={!formData.fromWarehouseId}
              >
                <option value="">No Location (Warehouse Level)</option>
                {fromLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                To Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.toWarehouseId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, toWarehouseId: e.target.value, toLocationId: '' }))
                  if (errors.toWarehouseId) setErrors(prev => ({ ...prev, toWarehouseId: '' }))
                }}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.toWarehouseId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500`}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              {errors.toWarehouseId && (
                <p className="text-sm text-red-500 mt-1">{errors.toWarehouseId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                To Location
              </label>
              <select
                value={formData.toLocationId}
                onChange={(e) => setFormData(prev => ({ ...prev, toLocationId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                disabled={!formData.toWarehouseId}
              >
                <option value="">No Location (Warehouse Level)</option>
                {toLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Products <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="col-span-6">
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors[`item_${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500`}
                      disabled={!formData.fromWarehouseId || loading}
                    >
                      <option value="">Select Product</option>
                      {products.map(product => {
                        const available = getAvailableStock(product.id)
                        return (
                          <option key={product.id} value={product.id} disabled={available === 0}>
                            {product.name} ({product.sku}) - Available: {available}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors[`item_${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500`}
                      placeholder="Quantity"
                    />
                    {item.productId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Available: {getAvailableStock(item.productId)}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {errors[`item_${index}`] && (
                    <div className="col-span-12">
                      <p className="text-sm text-red-500">{errors[`item_${index}`]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Transfer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

