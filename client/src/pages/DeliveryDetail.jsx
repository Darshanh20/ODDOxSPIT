import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Truck, Plus, Save, X, Trash2, Check, AlertCircle, Printer, 
  FileX, ArrowLeft, Calendar, MapPin, User, Package
} from 'lucide-react'

export default function DeliveryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [stockData, setStockData] = useState({}) // { productId: { available, reserved } }
  
  const [formData, setFormData] = useState({
    reference: '',
    deliveryAddress: '',
    scheduleDate: '',
    responsible: '',
    operationType: 'STANDARD',
    warehouseId: '',
    status: 'DRAFT'
  })
  
  const [items, setItems] = useState([]) // [{ productId, product, quantity, isInStock, stockAvailable }]

  useEffect(() => {
    fetchWarehouses()
    fetchProducts()
    if (!isNew) {
      fetchDelivery()
    } else {
      setLoading(false)
    }
  }, [id])

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

  const fetchStock = async (warehouseId) => {
    if (!warehouseId) return
    
    try {
      const token = localStorage.getItem('token')
      // Fetch stock for all products in the warehouse
      const productIds = items.map(item => item.productId).filter(Boolean)
      if (productIds.length === 0) return
      
      // For each product, check stock using product stock endpoint
      const stockPromises = productIds.map(async (productId) => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/products/${productId}/stock/warehouse?warehouseId=${warehouseId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          if (response.ok) {
            const responseData = await response.json()
            
            // API returns { stockByWarehouse: [...], rawStock: [...] }
            let stockData = null
            
            if (responseData.stockByWarehouse && Array.isArray(responseData.stockByWarehouse)) {
              // Find the warehouse in stockByWarehouse array
              const warehouseStock = responseData.stockByWarehouse.find(
                sw => sw.warehouse && sw.warehouse.id === warehouseId
              )
              if (warehouseStock) {
                stockData = {
                  available: warehouseStock.totalAvailable || 0,
                  reserved: warehouseStock.totalReserved || 0,
                  quantity: warehouseStock.totalQuantity || 0
                }
              }
            }
            
            // If not found in stockByWarehouse, try rawStock
            if (!stockData && responseData.rawStock && Array.isArray(responseData.rawStock)) {
              // Aggregate rawStock by warehouse
              const warehouseStockRecords = responseData.rawStock.filter(
                s => s.warehouseId === warehouseId
              )
              if (warehouseStockRecords.length > 0) {
                const totalAvailable = warehouseStockRecords.reduce((sum, s) => sum + (s.available || 0), 0)
                const totalReserved = warehouseStockRecords.reduce((sum, s) => sum + (s.reserved || 0), 0)
                const totalQuantity = warehouseStockRecords.reduce((sum, s) => sum + (s.quantity || 0), 0)
                stockData = {
                  available: totalAvailable,
                  reserved: totalReserved,
                  quantity: totalQuantity
                }
              }
            }
            
            // Fallback to direct array or object
            if (!stockData) {
              if (Array.isArray(responseData)) {
                stockData = responseData.find(s => s.warehouseId === warehouseId)
              } else if (responseData.available !== undefined) {
                stockData = responseData
              }
            }
            
            return { productId, stock: stockData }
          }
        } catch (err) {
          console.error(`Error fetching stock for product ${productId}:`, err)
        }
        return { productId, stock: null }
      })
      
      const stockResults = await Promise.all(stockPromises)
      const stockMap = {}
      stockResults.forEach(({ productId, stock }) => {
        if (stock) {
          stockMap[productId] = {
            available: stock.available || 0,
            reserved: stock.reserved || 0,
            quantity: stock.quantity || 0
          }
        } else {
          stockMap[productId] = { available: 0, reserved: 0, quantity: 0 }
        }
      })
      setStockData(stockMap)
    } catch (err) {
      console.error('Error fetching stock:', err)
    }
  }

  const fetchDelivery = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/deliveries/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const delivery = await response.json()
        setFormData({
          reference: delivery.deliveryNumber || '',
          deliveryAddress: delivery.shippingAddress || '',
          scheduleDate: delivery.scheduledDate 
            ? new Date(delivery.scheduledDate).toISOString().split('T')[0] 
            : '',
          responsible: delivery.notes?.includes('Responsible:') 
            ? delivery.notes.split('Responsible:')[1].trim() 
            : '',
          operationType: 'STANDARD',
          warehouseId: delivery.warehouseId || '',
          status: delivery.status || 'DRAFT'
        })
        
        // Set items
        if (delivery.items && delivery.items.length > 0) {
          const mappedItems = delivery.items.map(item => ({
            id: item.id,
            productId: item.productId,
            product: item.product,
            quantity: item.quantityOrdered || 0,
            isInStock: true,
            stockAvailable: 0
          }))
          setItems(mappedItems)
          
          // Fetch stock for each product when warehouse is available
          if (delivery.warehouseId) {
            // Fetch stock for all products in parallel
            const stockPromises = mappedItems
              .filter(item => item.productId)
              .map(item => fetchProductStock(item.productId, delivery.warehouseId))
            await Promise.all(stockPromises)
          }
        }
      } else {
        throw new Error('Failed to fetch delivery')
      }
    } catch (err) {
      console.error('Error fetching delivery:', err)
      setError(err.message || 'Failed to load delivery')
    } finally {
      setLoading(false)
    }
  }

  const generateReference = async (warehouseCode) => {
    if (!warehouseCode) return ''
    const warehousePrefix = warehouseCode.includes('/') 
      ? warehouseCode.split('/')[0] 
      : warehouseCode.split('-')[0] || 'WH'
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/deliveries', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const deliveries = data.deliveries || data
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
          sequence = Math.max(...sequences) + 1
        }
        
        return `${warehousePrefix}/OUT/${String(sequence).padStart(4, '0')}`
      }
    } catch (err) {
      console.error('Error generating reference:', err)
    }
    
    return `${warehousePrefix}/OUT/0001`
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Auto-generate reference when warehouse changes (only for new deliveries)
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
    
    // Fetch stock when warehouse changes
    if (name === 'warehouseId' && value) {
      // Fetch stock for all existing products
      const productIds = items.map(item => item.productId).filter(Boolean)
      if (productIds.length > 0) {
        const stockPromises = productIds.map(productId => fetchProductStock(productId, value))
        await Promise.all(stockPromises)
        
        // Update items with stock availability after fetching
        setTimeout(() => {
          setItems(prevItems => prevItems.map(item => {
            if (!item.productId) return item
            const stock = stockData[item.productId]
            const available = stock ? (stock.available || stock.totalAvailable || 0) : 0
            return {
              ...item,
              stockAvailable: available,
              isInStock: available >= item.quantity
            }
          }))
        }, 200)
      }
    }
  }

  const handleAddProduct = () => {
    setItems([...items, {
      productId: '',
      product: null,
      quantity: 1,
      isInStock: true,
      stockAvailable: 0
    }])
  }

  const handleRemoveProduct = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleProductChange = async (index, productId) => {
    const product = products.find(p => p.id === productId)
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId,
      product,
      quantity: newItems[index].quantity || 1
    }
    setItems(newItems)
    
    // Fetch stock for this specific product if warehouse is selected
    if (productId && formData.warehouseId) {
      await fetchProductStock(productId, formData.warehouseId)
      // Stock will be updated in fetchProductStock via setStockData callback
    } else if (productId && !formData.warehouseId) {
      // If no warehouse selected, set stock to 0
      setStockData(prev => ({
        ...prev,
        [productId]: { available: 0, reserved: 0, quantity: 0 }
      }))
      const updatedItems = [...newItems]
      updatedItems[index] = {
        ...updatedItems[index],
        stockAvailable: 0,
        isInStock: false
      }
      setItems(updatedItems)
    }
  }

  const fetchProductStock = async (productId, warehouseId) => {
    if (!productId || !warehouseId) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `http://localhost:5000/api/products/${productId}/stock/warehouse?warehouseId=${warehouseId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (response.ok) {
        const responseData = await response.json()
        
        // API returns { stockByWarehouse: [...], rawStock: [...] }
        let stockDataItem = null
        
        if (responseData.stockByWarehouse && Array.isArray(responseData.stockByWarehouse)) {
          // Find the warehouse in stockByWarehouse array
          const warehouseStock = responseData.stockByWarehouse.find(
            sw => sw.warehouse && sw.warehouse.id === warehouseId
          )
          if (warehouseStock) {
            stockDataItem = {
              available: warehouseStock.totalAvailable || 0,
              reserved: warehouseStock.totalReserved || 0,
              quantity: warehouseStock.totalQuantity || 0
            }
          }
        }
        
        // If not found in stockByWarehouse, try rawStock
        if (!stockDataItem && responseData.rawStock && Array.isArray(responseData.rawStock)) {
          // Aggregate rawStock by warehouse
          const warehouseStockRecords = responseData.rawStock.filter(
            s => s.warehouseId === warehouseId
          )
          if (warehouseStockRecords.length > 0) {
            const totalAvailable = warehouseStockRecords.reduce((sum, s) => sum + (s.available || 0), 0)
            const totalReserved = warehouseStockRecords.reduce((sum, s) => sum + (s.reserved || 0), 0)
            const totalQuantity = warehouseStockRecords.reduce((sum, s) => sum + (s.quantity || 0), 0)
            stockDataItem = {
              available: totalAvailable,
              reserved: totalReserved,
              quantity: totalQuantity
            }
          }
        }
        
        // Fallback to direct array or object
        if (!stockDataItem) {
          if (Array.isArray(responseData)) {
            const warehouseStock = responseData.find(s => s.warehouseId === warehouseId)
            if (warehouseStock) {
              stockDataItem = {
                available: warehouseStock.available || 0,
                reserved: warehouseStock.reserved || 0,
                quantity: warehouseStock.quantity || 0
              }
            }
          } else if (responseData.available !== undefined) {
            stockDataItem = {
              available: responseData.available || 0,
              reserved: responseData.reserved || 0,
              quantity: responseData.quantity || 0
            }
          }
        }
        
        if (stockDataItem) {
          setStockData(prev => {
            const updated = {
              ...prev,
              [productId]: stockDataItem
            }
            // Update items with stock availability immediately
            setItems(prevItems => prevItems.map(item => {
              if (item.productId === productId) {
                const available = stockDataItem.available || stockDataItem.totalAvailable || 0
                return {
                  ...item,
                  stockAvailable: available,
                  isInStock: available >= item.quantity
                }
              }
              return item
            }))
            return updated
          })
        } else {
          // No stock record found, set to 0
          setStockData(prev => ({
            ...prev,
            [productId]: { available: 0, reserved: 0, quantity: 0 }
          }))
          // Update items to show 0 stock
          setItems(prevItems => prevItems.map(item => {
            if (item.productId === productId) {
              return {
                ...item,
                stockAvailable: 0,
                isInStock: false
              }
            }
            return item
          }))
        }
      } else {
        // API error, set stock to 0
        const errorText = await response.text()
        console.error(`Error fetching stock for product ${productId}:`, errorText)
        setStockData(prev => ({
          ...prev,
          [productId]: { available: 0, reserved: 0, quantity: 0 }
        }))
      }
    } catch (err) {
      console.error(`Error fetching stock for product ${productId}:`, err)
      setStockData(prev => ({
        ...prev,
        [productId]: { available: 0, reserved: 0, quantity: 0 }
      }))
    }
  }

  const handleQuantityChange = (index, quantity) => {
    const newItems = [...items]
    newItems[index].quantity = parseFloat(quantity) || 0
    setItems(newItems)
  }

  const checkStockAvailability = () => {
    const updatedItems = items.map(item => {
      if (!item.productId || !formData.warehouseId) {
        return { ...item, isInStock: true, stockAvailable: 0 }
      }
      
      const stock = stockData[item.productId]
      const available = stock ? (stock.available || stock.totalAvailable || 0) : 0
      const isInStock = available >= item.quantity
      
      return {
        ...item,
        isInStock,
        stockAvailable: available
      }
    })
    
    setItems(updatedItems)
    return updatedItems.every(item => item.isInStock)
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    
    // Validation
    if (!formData.deliveryAddress) {
      setError('Delivery address is required')
      return
    }
    if (!formData.scheduleDate) {
      setError('Schedule date is required')
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
    if (!formData.warehouseId) {
      setError('Warehouse is required')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const payload = {
        warehouseId: formData.warehouseId,
        customerId: null,
        scheduledDate: formData.scheduleDate,
        shippingAddress: formData.deliveryAddress,
        notes: formData.responsible ? `Responsible: ${formData.responsible}` : null,
        status: 'DRAFT',
        items: items.map(item => ({
          productId: item.productId,
          quantityOrdered: item.quantity
        }))
      }

      const url = isNew 
        ? 'http://localhost:5000/api/deliveries'
        : `http://localhost:5000/api/deliveries/${id}`
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
        throw new Error(data.message || 'Failed to save delivery')
      }

      const savedDelivery = await response.json()
      setSuccess('Delivery saved successfully!')
      
      // Navigate to the saved delivery
      if (isNew) {
        navigate(`/deliveries/${savedDelivery.id}`, { replace: true })
        window.location.reload() // Reload to fetch the saved delivery
      } else {
        await fetchDelivery()
      }
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving delivery:', err)
      setError(err.message || 'Failed to save delivery')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    setError('')
    setSuccess('')
    
    if (isNew) {
      setError('Please save the delivery first before validating')
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
    
    // If status is READY, validate (mark as DONE and update stock)
    if (formData.status === 'READY') {
      try {
        setSaving(true)
        const token = localStorage.getItem('token')
        
        const response = await fetch(`http://localhost:5000/api/deliveries/${id}/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            items: items.map(item => ({
              itemId: item.id,
              quantityDelivered: item.quantity
            })),
            checkStock: false // Don't check stock, just mark as DONE
          })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || 'Failed to validate delivery')
        }

        const updated = await response.json()
        setFormData(prev => ({ ...prev, status: updated.status }))
        setSuccess('Delivery validated! Stock has been updated.')
        await fetchDelivery()
        setTimeout(() => setSuccess(''), 5000)
      } catch (err) {
        console.error('Error validating delivery:', err)
        setError(err.message || 'Failed to validate delivery')
      } finally {
        setSaving(false)
      }
      return
    }
    
    // If status is DRAFT or WAITING, check stock and set to WAITING or READY
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`http://localhost:5000/api/deliveries/${id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(item => ({
            itemId: item.id,
            quantityDelivered: item.quantity
          })),
          checkStock: true // Check stock and set status
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to validate delivery')
      }

      const updated = await response.json()
      setFormData(prev => ({ ...prev, status: updated.status }))
      
      if (updated.status === 'WAITING') {
        setSuccess('Delivery status updated to WAITING. Some products are out of stock.')
        // Show which products are out of stock
        if (updated.outOfStockItems && updated.outOfStockItems.length > 0) {
          const productNames = updated.outOfStockItems.map(item => item.productName).join(', ')
          setError(`Products out of stock: ${productNames}`)
        }
      } else if (updated.status === 'READY') {
        setSuccess('Delivery validated! Status updated to READY. Stock has been reserved. Click Validate to complete delivery.')
      }
      
      await fetchDelivery()
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 5000)
    } catch (err) {
      console.error('Error validating delivery:', err)
      setError(err.message || 'Failed to validate delivery')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this delivery?')) {
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/deliveries/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to cancel delivery')
      }

      setFormData(prev => ({ ...prev, status: 'CANCELED' }))
      setSuccess('Delivery canceled successfully!')
      await fetchDelivery()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error canceling delivery:', err)
      setError(err.message || 'Failed to cancel delivery')
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
            onClick={() => navigate('/deliveries')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/deliveries/new')}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Delivery
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
              ['WAITING', 'READY', 'DONE'].includes(formData.status) 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
            }`}>
              Waiting
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
                  onClick={handleValidate}
                  disabled={saving || isLocked}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Mark as Done
                </button>
              )}
              {formData.status === 'WAITING' && (
                <button
                  onClick={handleValidate}
                  disabled={saving || isLocked}
                  className="px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Check Stock Again
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
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-300 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
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
              Schedule Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="scheduleDate"
              value={formData.scheduleDate}
              onChange={handleInputChange}
              disabled={isLocked}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Delivery Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="deliveryAddress"
            value={formData.deliveryAddress}
            onChange={handleInputChange}
            disabled={isLocked}
            placeholder="Enter delivery address"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Responsible
            </label>
            <input
              type="text"
              name="responsible"
              value={formData.responsible}
              onChange={handleInputChange}
              disabled={isLocked}
              placeholder="Person responsible for delivery"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operation Type
            </label>
            <select
              name="operationType"
              value={formData.operationType}
              onChange={handleInputChange}
              disabled={isLocked}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="STANDARD">Standard</option>
              <option value="URGENT">Urgent</option>
              <option value="EXPRESS">Express</option>
            </select>
          </div>
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
                Add Product
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No products added. Click "Add Product" to add items.
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stock Available
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item, index) => {
                    const stock = stockData[item.productId] || { available: 0, quantity: 0 }
                    const stockAvailable = stock ? (stock.available || stock.totalAvailable || 0) : 0
                    const isOutOfStock = stockAvailable === 0
                    const isInsufficient = stockAvailable < item.quantity && stockAvailable > 0
                    const isSufficient = stockAvailable >= item.quantity && stockAvailable > 0
                    
                    // Determine row class and stock display class
                    let rowClass = ''
                    let stockClass = 'text-sm text-gray-600 dark:text-gray-300'
                    
                    if (isOutOfStock) {
                      rowClass = 'bg-red-50 dark:bg-red-900/20'
                      stockClass = 'text-sm font-medium text-red-600 dark:text-red-400'
                    } else if (isInsufficient) {
                      rowClass = 'bg-yellow-50 dark:bg-yellow-900/20'
                      stockClass = 'text-sm font-medium text-red-600 dark:text-red-400'
                    } else if (isSufficient) {
                      stockClass = 'text-sm font-medium text-green-600 dark:text-green-400'
                    }
                    
                    return (
                      <tr key={index} className={rowClass}>
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
                          {isOutOfStock && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Out of stock
                            </p>
                          )}
                          {isInsufficient && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                              Insufficient stock (Available: {stockAvailable})
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity || ''}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            disabled={isLocked}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isInsufficient || isOutOfStock
                                ? 'border-red-300 dark:border-red-700'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={stockClass}>
                            {stockAvailable}
                          </span>
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
                    )
                  })}
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

