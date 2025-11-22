import React, { useState, useEffect } from 'react'
import { Plus, Search, X, Edit, Eye, CheckCircle } from 'lucide-react'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productMovements, setProductMovements] = useState([])
  const [editingStock, setEditingStock] = useState(null)
  const [stockUpdateData, setStockUpdateData] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unitOfMeasure: 'Units',
    initialStock: 0,
    initialWarehouseId: '',
    unitPrice: 0,
    minStock: 0,
    maxStock: '',
    reorderPoint: 0,
    reorderQuantity: 0,
  })
  const [formErrors, setFormErrors] = useState({})
  const [loadingSKU, setLoadingSKU] = useState(false)

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [searchTerm])

  const fetchNextSKU = async () => {
    setLoadingSKU(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/products/next-sku', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, sku: data.sku }))
      }
    } catch (error) {
      console.error('Error fetching next SKU:', error)
    } finally {
      setLoadingSKU(false)
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
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, initialWarehouseId: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append('search', searchTerm)
      queryParams.append('isActive', 'true')

      const response = await fetch(`http://localhost:5000/api/products?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductMovements = async (productId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/adjustments/ledger/history?productId=${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setProductMovements(data.ledger || data || [])
      }
    } catch (error) {
      console.error('Error fetching product movements:', error)
      setProductMovements([])
    }
  }

  const handleProductClick = async (product) => {
    setSelectedProduct(product)
    await fetchProductMovements(product.id)
    setShowMovementModal(true)
  }

  const handleViewDetails = async (product) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/products/${product.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedProduct(data)
        setShowDetailModal(true)
      }
    } catch (error) {
      console.error('Error fetching product details:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = {}

    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (formData.initialStock > 0 && !formData.initialWarehouseId) {
      errors.initialWarehouseId = 'Warehouse is required when setting initial stock'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku, // Send the pre-generated SKU
          unitOfMeasure: formData.unitOfMeasure,
          unitPrice: formData.unitPrice || 0,
          minStock: formData.minStock || 0,
          maxStock: formData.maxStock ? parseFloat(formData.maxStock) : null,
          reorderPoint: formData.reorderPoint || 0,
          reorderQuantity: formData.reorderQuantity || 0,
          initialStock: formData.initialStock || 0,
          initialWarehouseId: formData.initialStock > 0 ? (formData.initialWarehouseId || null) : null,
          initialLocationId: null, // Can be added later if needed
        })
      })

      if (response.ok) {
        setShowNewForm(false)
        setFormData({
          name: '',
          sku: '',
          unitOfMeasure: 'Units',
          initialStock: 0,
          initialWarehouseId: warehouses.length > 0 ? warehouses[0].id : '',
          unitPrice: 0,
        })
        setFormErrors({})
        fetchProducts()
      } else {
        const data = await response.json()
        setFormErrors({ submit: data.message || 'Failed to create product' })
      }
    } catch (error) {
      console.error('Error creating product:', error)
      setFormErrors({ submit: 'Failed to create product' })
    }
  }

  // Calculate stock totals for a product
  const getProductStock = (product) => {
    const totalOnHand = product.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0
    const totalAvailable = product.stock?.reduce((sum, s) => sum + (s.available || 0), 0) || 0
    return { totalOnHand, totalAvailable }
  }

  const handleStockEdit = (product, stockItem) => {
    setEditingStock(`${product.id}-${stockItem?.id || 'new'}`)
    setStockUpdateData({
      productId: product.id,
      warehouseId: stockItem?.warehouseId || warehouses[0]?.id || '',
      locationId: stockItem?.locationId || null,
      quantity: stockItem?.quantity || 0,
      stockId: stockItem?.id || null
    })
  }

  const handleStockSave = async () => {
    if (!stockUpdateData.warehouseId) {
      alert('Please select a warehouse')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/stock/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: stockUpdateData.productId,
          warehouseId: stockUpdateData.warehouseId,
          locationId: stockUpdateData.locationId || null,
          quantity: parseFloat(stockUpdateData.quantity) || 0
        })
      })

      if (response.ok) {
        setEditingStock(null)
        setStockUpdateData({})
        fetchProducts()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to update stock')
      }
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock')
    }
  }

  const handleStockCancel = () => {
    setEditingStock(null)
    setStockUpdateData({})
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your product inventory</p>
        </div>
        <button
          onClick={() => {
            setShowNewForm(true)
            fetchNextSKU()
          }}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search products by name, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No products found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Per Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    On Hand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Free to Use
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => {
                  const { totalOnHand, totalAvailable } = getProductStock(product)
                  const isEditing = editingStock?.startsWith(`${product.id}-`)
                  const primaryStock = product.stock?.[0] // Get first stock entry for editing
                  
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            SKU: {product.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.unitPrice ? `${product.unitPrice.toLocaleString()} Rs` : '0 Rs'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={stockUpdateData.quantity}
                              onChange={(e) => setStockUpdateData(prev => ({ ...prev, quantity: e.target.value }))}
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                              autoFocus
                            />
                            <button
                              onClick={handleStockSave}
                              className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              title="Save"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleStockCancel}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => handleStockEdit(product, primaryStock)}
                            title="Click to edit stock"
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300">
                              {totalOnHand.toLocaleString()}
                            </span>
                            <Edit className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {totalAvailable.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Product Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Product</h2>
              <button
                onClick={() => {
                  setShowNewForm(false)
                  setFormData({
                    name: '',
                    sku: '',
                    unitOfMeasure: 'Units',
                    initialStock: 0,
                    initialWarehouseId: warehouses.length > 0 ? warehouses[0].id : '',
                    unitPrice: 0,
                    minStock: 0,
                    maxStock: '',
                    reorderPoint: 0,
                    reorderQuantity: 0,
                  })
                  setFormErrors({})
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                    if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }))
                  }}
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500`}
                  placeholder="Enter product name"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  SKU <span className="text-gray-500 dark:text-gray-400 text-xs">(Auto-generated)</span>
                </label>
                {loadingSKU ? (
                  <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    <span className="text-sm">Generating SKU...</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.sku}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white cursor-not-allowed font-mono"
                    placeholder="Loading SKU..."
                  />
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  SKU is automatically generated and cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Unit of Measure (UOM)
                </label>
                <input
                  type="text"
                  value={formData.unitOfMeasure}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitOfMeasure: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  placeholder="e.g., Units, Kg, L"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Initial Warehouse <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.initialWarehouseId}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, initialWarehouseId: e.target.value }))
                      if (formErrors.initialWarehouseId) setFormErrors(prev => ({ ...prev, initialWarehouseId: '' }))
                    }}
                    className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      formErrors.initialWarehouseId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500`}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.initialWarehouseId && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.initialWarehouseId}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Unit Price (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  placeholder="0.00"
                />
              </div>

              {formErrors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{formErrors.submit}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Create Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(false)
                    setFormData({
                      name: '',
                      sku: '',
                      unitOfMeasure: 'Units',
                      initialStock: 0,
                      initialWarehouseId: warehouses.length > 0 ? warehouses[0].id : '',
                      unitPrice: 0,
                      minStock: 0,
                      maxStock: '',
                      reorderPoint: 0,
                      reorderQuantity: 0,
                    })
                    fetchNextSKU() // Generate new SKU for next product
                    setFormErrors({})
                  }}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {/* Product Movement Modal */}
      {showMovementModal && selectedProduct && (
        <ProductMovementModal
          product={selectedProduct}
          movements={productMovements}
          onClose={() => {
            setShowMovementModal(false)
            setSelectedProduct(null)
            setProductMovements([])
          }}
        />
      )}
    </div>
  )
}

// Product Detail Modal Component
function ProductDetailModal({ product, onClose }) {
  const [stockByWarehouse, setStockByWarehouse] = useState([])
  const [stockByLocation, setStockByLocation] = useState([])

  useEffect(() => {
    if (product.stock) {
      // Group by warehouse
      const warehouseMap = {}
      product.stock.forEach(stock => {
        const warehouseId = stock.warehouse?.id || 'unknown'
        if (!warehouseMap[warehouseId]) {
          warehouseMap[warehouseId] = {
            warehouse: stock.warehouse,
            totalQuantity: 0,
            totalAvailable: 0,
            totalReserved: 0,
          }
        }
        warehouseMap[warehouseId].totalQuantity += stock.quantity || 0
        warehouseMap[warehouseId].totalAvailable += stock.available || 0
        warehouseMap[warehouseId].totalReserved += stock.reserved || 0
      })
      setStockByWarehouse(Object.values(warehouseMap))

      // Group by location
      const locationMap = {}
      product.stock.forEach(stock => {
        if (stock.location) {
          const locationId = stock.location.id
          if (!locationMap[locationId]) {
            locationMap[locationId] = {
              location: stock.location,
              warehouse: stock.warehouse,
              quantity: 0,
              available: 0,
              reserved: 0,
            }
          }
          locationMap[locationId].quantity += stock.quantity || 0
          locationMap[locationId].available += stock.available || 0
          locationMap[locationId].reserved += stock.reserved || 0
        }
      })
      setStockByLocation(Object.values(locationMap))
    }
  }, [product])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{product.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">SKU</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unit of Measure (UOM)</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{product.unitOfMeasure || 'Units'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unit Price</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {product.unitPrice ? `${product.unitPrice.toLocaleString()} Rs` : '0 Rs'}
                </p>
              </div>
              {product.description && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                  <p className="text-base text-gray-900 dark:text-white">{product.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reorder Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reorder Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Min Stock</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {product.minStock?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Stock</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {product.maxStock ? product.maxStock.toLocaleString() : '∞'}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">Reorder Point</p>
                <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300 mt-1">
                  {product.reorderPoint?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">Reorder Quantity</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                  {product.reorderQuantity?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            {(() => {
              const totalAvailable = stockByWarehouse.reduce((sum, item) => sum + item.totalAvailable, 0)
              const reorderPoint = product.reorderPoint || 0
              const isLowStock = totalAvailable > 0 && totalAvailable <= reorderPoint
              const isOutOfStock = totalAvailable === 0
              
              const statusBg = isOutOfStock 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : isLowStock 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              
              const statusText = isOutOfStock 
                ? 'text-red-700 dark:text-red-400'
                : isLowStock 
                ? 'text-yellow-700 dark:text-yellow-400'
                : 'text-green-700 dark:text-green-400'
              
              const statusTitle = isOutOfStock 
                ? 'text-red-900 dark:text-red-300'
                : isLowStock 
                ? 'text-yellow-900 dark:text-yellow-300'
                : 'text-green-900 dark:text-green-300'
              
              return (
                <div className={`mt-4 p-4 rounded-lg border-2 ${statusBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${statusText}`}>
                        Stock Status
                      </p>
                      <p className={`text-2xl font-bold ${statusTitle} mt-1`}>
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Available</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {totalAvailable.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Stock by Warehouse */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock by Warehouse</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">On Hand</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Available</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reserved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stockByWarehouse.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                        No stock data available
                      </td>
                    </tr>
                  ) : (
                    stockByWarehouse.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.warehouse?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.totalQuantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.totalAvailable.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.totalReserved.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock by Location */}
          {stockByLocation.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock by Location</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">On Hand</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stockByLocation.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.warehouse?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.location?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.available.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Product Movement Modal Component
function ProductMovementModal({ product, movements, onClose }) {
  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'IN':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'OUT':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      case 'TRANSFER':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      case 'ADJUST':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
    }
  }

  const getReferenceLabel = (referenceType, referenceId) => {
    // This would typically fetch the actual reference, but for now return a label
    return `${referenceType}-${referenceId?.slice(0, 8) || 'N/A'}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Movement History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.name} ({product.sku})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No movement history available for this product
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Before</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {movements.map((movement, index) => {
                    const isIn = movement.transactionType === 'IN'
                    const isOut = movement.transactionType === 'OUT'
                    return (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          isIn ? 'bg-green-50/50 dark:bg-green-900/10' : isOut ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(movement.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMovementTypeColor(movement.transactionType)}`}>
                            {movement.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {getReferenceLabel(movement.referenceType, movement.referenceId)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {movement.warehouse?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {movement.location?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {movement.quantityBefore?.toLocaleString() || '0'}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${
                          isIn ? 'text-green-600 dark:text-green-400' : isOut ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {isIn ? '+' : isOut ? '-' : ''}{Math.abs(movement.quantityChange || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {movement.quantityAfter?.toLocaleString() || '0'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

