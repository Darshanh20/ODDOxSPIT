import React, { useState, useEffect } from 'react'
import { Plus, Search, Download, AlertCircle, Edit2, Trash2, X, FileText, Calendar, Warehouse, User, LayoutGrid, List, CheckCircle, Printer } from 'lucide-react'
import ReceiptListView from '../components/receipt/ReceiptListView'
import ReceiptFormView from '../components/receipt/ReceiptFormView'
import ReceiptKanbanView from '../components/receipt/ReceiptKanbanView'

export default function Receipt() {
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [showForm, setShowForm] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [warehouseCode, setWarehouseCode] = useState('WH1') // Should be fetched from user's warehouse

  useEffect(() => {
    getCurrentUser()
    fetchReceipts()
  }, [])

  useEffect(() => {
    filterReceipts()
  }, [receipts, searchTerm])

  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      setCurrentUser(payload)
    } catch (err) {
      console.error('Error parsing user:', err)
    }
  }

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/receipts', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to fetch receipts')

      const data = await response.json()
      setReceipts(data.receipts || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching receipts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterReceipts = () => {
    let filtered = receipts

    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.supplier?.contact?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredReceipts(filtered)
  }

  const handleCreateNew = () => {
    setSelectedReceipt(null)
    setShowForm(true)
  }

  const handleEdit = (receipt) => {
    setSelectedReceipt(receipt)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedReceipt(null)
  }

  const handleFormSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token')
      const method = selectedReceipt ? 'PUT' : 'POST'
      const url = selectedReceipt
        ? `http://localhost:5000/api/receipts/${selectedReceipt.id}`
        : 'http://localhost:5000/api/receipts'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save receipt')

      fetchReceipts()
      handleFormClose()
    } catch (err) {
      console.error('Error saving receipt:', err)
      setError(err.message)
    }
  }

  const handleValidate = async (receiptId) => {
    try {
      const token = localStorage.getItem('token')
      const receipt = receipts.find(r => r.id === receiptId)
      
      // Determine next status
      let nextStatus = 'READY'
      if (receipt.status === 'READY') {
        nextStatus = 'DONE'
      }

      const response = await fetch(`http://localhost:5000/api/receipts/${receiptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...receipt, status: nextStatus })
      })

      if (!response.ok) throw new Error('Failed to validate receipt')

      fetchReceipts()
    } catch (err) {
      console.error('Error validating receipt:', err)
      setError(err.message)
    }
  }

  const handlePrint = (receiptId) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (!receipt) return

    // Create a print window
    const printWindow = window.open('', '', 'height=500,width=800')
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; }
          .details { margin-bottom: 20px; }
          .details p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Receipt ${receipt.receiptNumber}</h1>
          <p>Status: ${receipt.status}</p>
        </div>
        <div class="details">
          <p><strong>Supplier:</strong> ${receipt.supplier?.name || 'N/A'}</p>
          <p><strong>Warehouse:</strong> ${receipt.warehouse?.name || 'N/A'}</p>
          <p><strong>Scheduled Date:</strong> ${new Date(receipt.scheduledDate).toLocaleDateString()}</p>
          <p><strong>Notes:</strong> ${receipt.notes || 'N/A'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.items?.map(item => `
              <tr>
                <td>${item.product?.name || item.productId}</td>
                <td>${item.quantityOrdered}</td>
                <td>$${item.unitPrice}</td>
                <td>$${(item.quantityOrdered * item.unitPrice).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Printed on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  const handleDelete = async (receiptId) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/receipts/${receiptId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to cancel receipt')

      fetchReceipts()
    } catch (err) {
      console.error('Error deleting receipt:', err)
      setError(err.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'READY':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'DONE':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'CANCELED':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading receipts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Receipts</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage goods receipt operations</p>
              </div>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              New Receipt
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form View */}
        {showForm ? (
          <ReceiptFormView
            receipt={selectedReceipt}
            warehouseCode={warehouseCode}
            currentUser={currentUser}
            onSubmit={handleFormSubmit}
            onClose={handleFormClose}
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by reference or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="text-sm font-medium">List</span>
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                      viewMode === 'kanban'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm font-medium">Kanban</span>
                  </button>
                </div>

                {/* Export */}
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Views */}
            {viewMode === 'list' ? (
              <ReceiptListView
                receipts={filteredReceipts}
                onEdit={handleEdit}
                onValidate={handleValidate}
                onPrint={handlePrint}
                onDelete={handleDelete}
              />
            ) : (
              <ReceiptKanbanView
                receipts={filteredReceipts}
                onEdit={handleEdit}
                onValidate={handleValidate}
                onPrint={handlePrint}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
