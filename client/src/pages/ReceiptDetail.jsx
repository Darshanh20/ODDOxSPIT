import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FileText, Plus, Save, X, Trash2, Check, AlertCircle, Printer, 
  FileX, ArrowLeft, Calendar, User, Package, CheckCircle
} from 'lucide-react'

export default function ReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  
  const [formData, setFormData] = useState({
    reference: '',
    receiveFrom: '',
    scheduleDate: '',
    responsible: '',
    warehouseId: '',
    status: 'DRAFT'
  })
  
  const [items, setItems] = useState([]) // [{ productId, product, quantity }]

  useEffect(() => {
    fetchProducts()
    fetchWarehouses()
    getCurrentUser()
    if (!isNew) {
      fetchReceipt()
    } else {
      setLoading(false)
    }
  }, [id])

  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      // Fetch full user details
      const response = await fetch(`http://localhost:5000/api/users/${payload.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const user = await response.json()
        setCurrentUser(user)
        if (isNew) {
          setFormData(prev => ({
            ...prev,
            responsible: user.name || user.username || ''
          }))
        }
      } else {
        setCurrentUser({ name: payload.name || payload.username || 'User' })
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      setCurrentUser({ name: 'User' })
    }
  }

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

  const generateReference = async (warehouseCode) => {
    if (!warehouseCode) return ''
    const warehousePrefix = warehouseCode.includes('/') 
      ? warehouseCode.split('/')[0] 
      : warehouseCode.split('-')[0] || 'WH'
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/receipts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const receipts = data.receipts || data
        const matchingReceipts = receipts.filter(r => {
          if (!r.receiptNumber) return false
          const parts = r.receiptNumber.split('/')
          return parts.length === 3 && parts[0] === warehousePrefix && parts[1] === 'IN'
        })
        
        let sequence = 1
        if (matchingReceipts.length > 0) {
          const sequences = matchingReceipts.map(r => {
            const seq = parseInt(r.receiptNumber.split('/')[2])
            return isNaN(seq) ? 0 : seq
          })
          sequence = Math.max(...sequences) + 1
        }
        
        return `${warehousePrefix}/IN/${String(sequence).padStart(4, '0')}`
      }
    } catch (err) {
      console.error('Error generating reference:', err)
    }
    
    return `${warehousePrefix}/IN/0001`
  }

  const fetchReceipt = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/receipts/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const receipt = await response.json()
        setFormData({
          reference: receipt.receiptNumber || '',
          receiveFrom: receipt.supplier?.name || receipt.notes?.replace('Vendor: ', '') || '',
          scheduleDate: receipt.scheduledDate 
            ? new Date(receipt.scheduledDate).toISOString().split('T')[0] 
            : '',
          responsible: receipt.createdBy?.name || receipt.createdBy?.username || '',
          warehouseId: receipt.warehouseId || '',
          status: receipt.status || 'DRAFT'
        })
        
        // Set items
        if (receipt.items && receipt.items.length > 0) {
          setItems(receipt.items.map(item => ({
            id: item.id,
            productId: item.productId,
            product: item.product,
            quantity: item.quantityOrdered || 0
          })))
        }
      } else {
        throw new Error('Failed to fetch receipt')
      }
    } catch (err) {
      console.error('Error fetching receipt:', err)
      setError(err.message || 'Failed to load receipt')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Auto-generate reference when warehouse changes (only for new receipts)
      if (name === 'warehouseId' && isNew && !prev.reference) {
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

  const handleAddProduct = () => {
    setItems([...items, {
      productId: '',
      product: null,
      quantity: 1
    }])
  }

  const handleRemoveProduct = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === productId)
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId,
      product,
      quantity: newItems[index].quantity || 1
    }
    setItems(newItems)
  }

  const handleQuantityChange = (index, quantity) => {
    const newItems = [...items]
    newItems[index].quantity = parseFloat(quantity) || 0
    setItems(newItems)
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    
    // Validation
    if (!formData.receiveFrom) {
      setError('Receive From (Vendor) is required')
      return
    }
    if (!formData.warehouseId) {
      setError('Warehouse is required')
      return
    }
    if (items.length === 0) {
      setError('At least one product is required')
      return
    }
    if (items.some(item => !item.productId || item.quantity <= 0)) {
      setError('All products must have a valid product and quantity > 0')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const payload = {
        warehouseId: formData.warehouseId,
        supplierId: null, // Will be handled separately if needed
        scheduledDate: formData.scheduleDate || null,
        notes: formData.receiveFrom ? `Vendor: ${formData.receiveFrom}` : null,
        status: 'DRAFT',
        items: items.map(item => ({
          productId: item.productId,
          quantityOrdered: item.quantity
        }))
      }

      const url = isNew 
        ? 'http://localhost:5000/api/receipts'
        : `http://localhost:5000/api/receipts/${id}`
      const method = isNew ? 'POST' : 'PUT'

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
        throw new Error(data.message || 'Failed to save receipt')
      }

      const savedReceipt = await response.json()
      setSuccess('Receipt saved successfully!')
      
      // Navigate to the saved receipt
      if (isNew) {
        navigate(`/receipts/${savedReceipt.id}`, { replace: true })
        window.location.reload() // Reload to fetch the saved receipt
      } else {
        await fetchReceipt()
      }
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving receipt:', err)
      setError(err.message || 'Failed to save receipt')
    } finally {
      setSaving(false)
    }
  }

  const handleToDo = async () => {
    setError('')
    setSuccess('')
    
    if (isNew) {
      setError('Please save the receipt first')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`http://localhost:5000/api/receipts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'READY'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update receipt status')
      }

      setFormData(prev => ({ ...prev, status: 'READY' }))
      setSuccess('Receipt status updated to READY!')
      await fetchReceipt()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error updating receipt:', err)
      setError(err.message || 'Failed to update receipt status')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    setError('')
    setSuccess('')
    
    if (isNew) {
      setError('Please save the receipt first before validating')
      return
    }
    
    if (formData.status !== 'READY') {
      setError('Receipt must be in READY status to validate')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      // Validate the receipt (this will update stock)
      const response = await fetch(`http://localhost:5000/api/receipts/${id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(item => ({
            itemId: item.id,
            quantityReceived: item.quantity
          }))
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to validate receipt')
      }

      const updated = await response.json()
      setFormData(prev => ({ ...prev, status: updated.status }))
      setSuccess('Receipt validated! Stock has been increased.')
      await fetchReceipt()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('Error validating receipt:', err)
      setError(err.message || 'Failed to validate receipt')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this receipt?')) {
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/receipts/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to cancel receipt')
      }

      setFormData(prev => ({ ...prev, status: 'CANCELED' }))
      setSuccess('Receipt canceled successfully!')
      await fetchReceipt()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error canceling receipt:', err)
      setError(err.message || 'Failed to cancel receipt')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
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

  const isLocked = formData.status === 'DONE' || formData.status === 'CANCELED'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/receipts')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/receipts/new')}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Receipt
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Progress */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${getStatusColor(formData.status)}`}>
              {getStatusLabel(formData.status)}
            </span>
            <span className="text-gray-400 dark:text-gray-500">→</span>
            <span className={`px-3 py-1 rounded-full font-medium ${
              ['READY', 'DONE'].includes(formData.status) 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
            }`}>
              Ready
            </span>
            <span className="text-gray-400 dark:text-gray-500">→</span>
            <span className={`px-3 py-1 rounded-full font-medium ${
              formData.status === 'DONE' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
            }`}>
              Done
            </span>
          </div>
          
          {/* Action Buttons */}
          {!isNew && (
            <>
              {formData.status === 'DRAFT' && (
                <button
                  onClick={handleToDo}
                  disabled={saving || isLocked}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  To Do
                </button>
              )}
              {formData.status === 'READY' && (
                <button
                  onClick={handleValidate}
                  disabled={saving || isLocked}
                  className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Validate
                </button>
              )}
              {formData.status === 'DONE' && (
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-300 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              )}
              {formData.status !== 'DONE' && formData.status !== 'CANCELED' && (
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileX className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </>
          )}
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

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <select
              name="warehouseId"
              value={formData.warehouseId}
              onChange={handleInputChange}
              disabled={isLocked}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Receive From (Vendor) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="receiveFrom"
              value={formData.receiveFrom}
              onChange={handleInputChange}
              disabled={isLocked}
              placeholder="Enter vendor name"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isLocked}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Responsible
          </label>
          <input
            type="text"
            name="responsible"
            value={formData.responsible}
            onChange={handleInputChange}
            disabled
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
          />
        </div>

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products
            </h2>
            {!isLocked && (
              <button
                onClick={handleAddProduct}
                className="px-3 py-1.5 text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Product
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No products added. Click "New Product" to add items.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          disabled={isLocked}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              [{product.sku}] {product.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity || ''}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          disabled={isLocked}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          required
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isLocked && (
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Save Button */}
        {!isLocked && (
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

