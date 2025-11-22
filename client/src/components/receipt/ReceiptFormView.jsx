import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calendar } from 'lucide-react'

export default function ReceiptFormView({ receipt, warehouseCode, currentUser, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    receiptNumber: '',
    supplierName: '',
    supplierId: '',
    scheduledDate: '',
    notes: '',
    items: [{ productId: '', productName: '', quantity: '', unitPrice: '' }]
  })

  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  // Auto-generate receipt reference
  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString().slice(-4)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${warehouseCode}/IN/${random}`
  }

  // Initialize form
  useEffect(() => {
    if (receipt) {
      // Edit mode
      setFormData({
        receiptNumber: receipt.receiptNumber,
        supplierName: receipt.supplier?.name || '',
        supplierId: receipt.supplierId,
        scheduledDate: receipt.scheduledDate?.split('T')[0] || '',
        notes: receipt.notes || '',
        items: receipt.items?.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })) || [{ productId: '', productName: '', quantity: '', unitPrice: '' }]
      })
    } else {
      // Create mode - generate new receipt number
      setFormData(prev => ({
        ...prev,
        receiptNumber: generateReceiptNumber()
      }))
    }

    // Fetch suppliers and products
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        const [suppliersRes, productsRes] = await Promise.all([
          fetch('/api/partners', { headers }),
          fetch('/api/products', { headers })
        ])

        if (suppliersRes.ok) {
          const data = await suppliersRes.json()
          setSuppliers(data.filter(p => p.type === 'supplier'))
        }
        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [receipt, warehouseCode])

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'supplierName' && {
        supplierId: suppliers.find(s => s.name === value)?.id || ''
      })
    }))
  }

  // Handle item change
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    if (field === 'productName') {
      const product = products.find(p => p.name === value)
      newItems[index] = {
        ...newItems[index],
        productId: product?.id || '',
        productName: value,
        unitPrice: product?.costPrice || ''
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value
      }
    }
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  // Add item row
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', productName: '', quantity: '', unitPrice: '' }]
    }))
  }

  // Remove item row
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Calculate total
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0))
    }, 0)
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.supplierName || !formData.scheduledDate) {
      alert('Please fill in all required fields')
      return
    }
    if (formData.items.some(item => !item.productId || !item.quantity)) {
      alert('Please fill in all item fields')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        receiptNumber: formData.receiptNumber,
        supplierId: formData.supplierId,
        warehouseId: warehouseCode,
        scheduledDate: formData.scheduledDate,
        notes: formData.notes,
        items: formData.items.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        })),
        status: 'DRAFT'
      }

      const method = receipt ? 'PUT' : 'POST'
      const url = receipt ? `/api/receipts/${receipt.id}` : '/api/receipts'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        onSubmit(payload)
      } else {
        alert('Failed to save receipt')
      }
    } catch (error) {
      console.error('Error saving receipt:', error)
      alert('An error occurred while saving')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {receipt ? 'Edit Receipt' : 'New Receipt'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Receipt Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Receipt Reference
            </label>
            <input
              type="text"
              value={formData.receiptNumber}
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-generated reference</p>
          </div>

          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Vendor <span className="text-red-500">*</span>
            </label>
            <select
              name="supplierName"
              value={formData.supplierName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Select a vendor</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.name}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Responsible Person */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Responsible Person
            </label>
            <input
              type="text"
              value={currentUser?.name || 'Not logged in'}
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Scheduled Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Item
              </button>
            </div>

            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="px-2 py-2 text-left text-gray-900 dark:text-white font-semibold">Product</th>
                    <th className="px-2 py-2 text-left text-gray-900 dark:text-white font-semibold">Qty</th>
                    <th className="px-2 py-2 text-left text-gray-900 dark:text-white font-semibold">Unit Price</th>
                    <th className="px-2 py-2 text-left text-gray-900 dark:text-white font-semibold">Total</th>
                    <th className="px-2 py-2 text-center text-gray-900 dark:text-white font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-2 py-2">
                        <select
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                          required
                        >
                          <option value="">Select product</option>
                          {products.map(product => (
                            <option key={product.id} value={product.name}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="1"
                          className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                          placeholder="0"
                          required
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                          placeholder="0"
                          required
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">
                        {(parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any additional notes..."
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : receipt ? 'Update' : 'Create'} Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
