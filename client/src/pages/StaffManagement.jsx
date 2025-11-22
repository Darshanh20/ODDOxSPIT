import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, Plus, Search, Edit, UserX, UserCheck, Key, 
  Mail, Phone, MapPin, Calendar, Briefcase, X, Save, Eye, EyeOff
} from 'lucide-react'

export default function StaffManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [staffMembers, setStaffMembers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [filters, setFilters] = useState({
    warehouseId: '',
    status: ''
  })
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    warehouseId: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    username: '',
    password: '',
    confirmPassword: '',
    autoGeneratePassword: false,
    employeeId: '',
    canReceipt: true,
    canDelivery: true,
    canTransfer: true,
    canAdjust: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchWarehouses()
    fetchStaffMembers()
  }, [filters, search])

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

  const fetchStaffMembers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams()
      if (filters.warehouseId) queryParams.append('warehouseId', filters.warehouseId)
      if (filters.status) queryParams.append('status', filters.status)
      if (search) queryParams.append('search', search)

      const response = await fetch(`http://localhost:5000/api/staff-management?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStaffMembers(data)
      }
    } catch (err) {
      console.error('Error fetching staff members:', err)
      setError('Failed to fetch staff members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      warehouseId: '',
      designation: '',
      joiningDate: new Date().toISOString().split('T')[0],
      username: '',
      password: '',
      confirmPassword: '',
      autoGeneratePassword: false,
      employeeId: '',
      canReceipt: true,
      canDelivery: true,
      canTransfer: true,
      canAdjust: false
    })
    setError('')
    setSuccess('')
    setShowAddModal(true)
  }

  const handleEditStaff = (staff) => {
    setSelectedStaff(staff)
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      warehouseId: staff.warehouseId || '',
      designation: staff.designation || '',
      status: staff.status || 'active',
      canReceipt: staff.staffPermissions?.canReceipt ?? true,
      canDelivery: staff.staffPermissions?.canDelivery ?? true,
      canTransfer: staff.staffPermissions?.canTransfer ?? true,
      canAdjust: staff.staffPermissions?.canAdjust ?? false
    })
    setError('')
    setSuccess('')
    setShowEditModal(true)
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.autoGeneratePassword && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!formData.autoGeneratePassword && formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      // Prepare request body
      const requestBody = {
        name: formData.name?.trim(),
        email: formData.email?.trim(),
        phone: formData.phone?.trim() || null,
        warehouseId: formData.warehouseId?.trim(),
        designation: formData.designation?.trim() || null,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        username: formData.username?.trim() || formData.email?.trim(),
        employeeId: formData.employeeId?.trim() || null,
        canReceipt: formData.canReceipt ?? true,
        canDelivery: formData.canDelivery ?? true,
        canTransfer: formData.canTransfer ?? true,
        canAdjust: formData.canAdjust ?? false
      }
      
      // Only include password if not auto-generating
      if (!formData.autoGeneratePassword && formData.password) {
        requestBody.password = formData.password
        requestBody.autoGeneratePassword = false
      } else {
        requestBody.autoGeneratePassword = true
      }
      
      const response = await fetch('http://localhost:5000/api/staff-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create staff member')
      }
      
      // Show success message with password if auto-generated
      let successMsg = data.message || 'Staff member created successfully'
      if (data.password) {
        successMsg += `\n\nPassword: ${data.password}\n\nPlease share this with the staff member.`
        alert(successMsg)
      }
      
      setSuccess(data.message || 'Staff member created successfully')
      setShowAddModal(false)
      fetchStaffMembers()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('Error creating staff:', err)
      setError(err.message || 'Failed to create staff member. Please check all fields and try again.')
    }
  }

  const handleUpdateStaff = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/staff-management/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update staff member')
      }

      setSuccess('Staff member updated successfully')
      setShowEditModal(false)
      fetchStaffMembers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update staff member')
    }
  }

  const handleToggleStatus = async (staff) => {
    if (!window.confirm(`Are you sure you want to ${staff.status === 'active' ? 'disable' : 'enable'} this staff account?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const newStatus = staff.status === 'active' ? 'inactive' : 'active'
      const response = await fetch(`http://localhost:5000/api/staff-management/${staff.id}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update status')
      }

      setSuccess(`Staff account ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`)
      fetchStaffMembers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update status')
    }
  }

  const handleResetPassword = (staff) => {
    setSelectedStaff(staff)
    setFormData({ newPassword: '', confirmPassword: '', autoGenerate: true })
    setError('')
    setSuccess('')
    setShowPasswordModal(true)
  }

  const handleSubmitPasswordReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.autoGenerate && formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!formData.autoGenerate && formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/staff-management/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: formData.autoGenerate ? undefined : formData.newPassword,
          autoGenerate: formData.autoGenerate
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to reset password')
      }

      const data = await response.json()
      setSuccess(data.message || 'Password reset successfully')
      if (data.password) {
        alert(`New password: ${data.password}\n\nPlease share this with the staff member.`)
      }
      setShowPasswordModal(false)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    }
  }

  const formatLastLogin = (date) => {
    if (!date) return 'Never'
    const now = new Date()
    const loginDate = new Date(date)
    const diffMs = now - loginDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 30) return `${diffDays} days ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8" />
            Staff Management
          </h1>
        </div>
        <button
          onClick={handleAddStaff}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Staff
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
          </div>
          <div className="min-w-[200px]">
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters(prev => ({ ...prev, warehouseId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[150px]">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No staff members found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {staffMembers.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {staff.employeeId || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {staff.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {staff.email || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {staff.phone || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {staff.warehouse?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        staff.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {staff.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatLastLogin(staff.lastLogin)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditStaff(staff)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className={`p-2 rounded-lg transition-colors ${
                            staff.status === 'active'
                              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                              : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                          title={staff.status === 'active' ? 'Disable' : 'Enable'}
                        >
                          {staff.status === 'active' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleResetPassword(staff)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Staff Account</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Employee ID (Auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder="EMP-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          email: e.target.value,
                          username: prev.username || e.target.value
                        }))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Work Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assigned Warehouse *
                    </label>
                    <select
                      required
                      value={formData.warehouseId}
                      onChange={(e) => setFormData(prev => ({ ...prev, warehouseId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder="Warehouse Associate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Account Credentials */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Credentials</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder="Auto-filled with email"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoGeneratePassword"
                      checked={formData.autoGeneratePassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, autoGeneratePassword: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor="autoGeneratePassword" className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-generate Password
                    </label>
                  </div>
                  {!formData.autoGeneratePassword && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm Password *
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                          minLength={8}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h3>
                <div className="space-y-2">
                  {[
                    { key: 'canReceipt', label: 'Can Accept Receipts' },
                    { key: 'canDelivery', label: 'Can Process Deliveries' },
                    { key: 'canTransfer', label: 'Can Do Transfers' },
                    { key: 'canAdjust', label: 'Can Adjust Stock' }
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={perm.key}
                        checked={formData[perm.key]}
                        onChange={(e) => setFormData(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor={perm.key} className="text-sm text-gray-700 dark:text-gray-300">
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Staff Account</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateStaff} className="p-6 space-y-6">
              {/* Read-only fields */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Employee ID
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">{selectedStaff.employeeId || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedStaff.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Joining Date
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedStaff.joiningDate ? new Date(selectedStaff.joiningDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assigned Warehouse *
                  </label>
                  <select
                    required
                    value={formData.warehouseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, warehouseId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h3>
                <div className="space-y-2">
                  {[
                    { key: 'canReceipt', label: 'Can Accept Receipts' },
                    { key: 'canDelivery', label: 'Can Process Deliveries' },
                    { key: 'canTransfer', label: 'Can Do Transfers' },
                    { key: 'canAdjust', label: 'Can Adjust Stock' }
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-${perm.key}`}
                        checked={formData[perm.key]}
                        onChange={(e) => setFormData(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`edit-${perm.key}`} className="text-sm text-gray-700 dark:text-gray-300">
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitPasswordReset} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reset password for <strong>{selectedStaff.name}</strong> ({selectedStaff.email})
              </p>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  checked={formData.autoGenerate}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoGenerate: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="autoGenerate" className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-generate Password
                </label>
              </div>

              {!formData.autoGenerate && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                      minLength={8}
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

