import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, User, Mail, Hash, Phone, Calendar, Save, X, Check, AlertCircle } from 'lucide-react'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
  })
  const [tempValue, setTempValue] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      
      const decoded = JSON.parse(jsonPayload)
      
      const response = await fetch(`http://localhost:5000/api/users/${decoded.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch user data')
      const data = await response.json()
      setUser(data)
      setFormData({
        name: data.name || '',
        username: data.username || '',
        phone: data.phone || ''
      })
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleFieldEdit = (field, currentValue) => {
    setEditingField(field)
    setTempValue(currentValue || '')
    setUpdateError('')
    setUpdateSuccess('')
  }

  const handleFieldCancel = () => {
    setEditingField(null)
    setTempValue('')
    setUpdateError('')
  }

  const handleFieldSave = async (field) => {
    if (field === 'username' && tempValue.trim() && (tempValue.trim().length < 6 || tempValue.trim().length > 12)) {
      setUpdateError('Username must be between 6-12 characters')
      return
    }

    if (field === 'phone' && tempValue.trim()) {
      const phonePattern = /^[\d\s\-\+\(\)]{10,}$/
      if (!phonePattern.test(tempValue.replace(/\s/g, ''))) {
        setUpdateError('Please enter a valid phone number')
        return
      }
    }

    const token = localStorage.getItem('token')
    const updateData = { [field]: tempValue.trim() || null }

    try {
      const response = await fetch('http://localhost:5000/api/users/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update profile')
      }

      const data = await response.json()
      setUser(data.user)
      setFormData(prev => ({
        ...prev,
        [field]: data.user[field] || ''
      }))
      setEditingField(null)
      setTempValue('')
      setUpdateError('')
      setUpdateSuccess('Profile updated successfully!')
      setTimeout(() => setUpdateSuccess(''), 3000)
    } catch (error) {
      console.error('Update error:', error)
      setUpdateError(error.message || 'Failed to update profile')
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUpdateError('Image size must be less than 5MB')
        return
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUpdateError('Please select an image file')
        return
      }
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
      setUpdateError('')
    }
  }

  const handleImageUpload = async () => {
    if (!profileImage) return
    
    const formData = new FormData()
    formData.append('profileImage', profileImage)
    
    const token = localStorage.getItem('token')
    setUploading(true)
    setUpdateError('')
    
    try {
      const response = await fetch('http://localhost:5000/api/users/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to upload image')
      }

      const data = await response.json()
      setUser(data.user)
      setProfileImage(null)
      setImagePreview(null)
      setUpdateSuccess('Profile image uploaded successfully!')
      setTimeout(() => setUpdateSuccess(''), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setUpdateError(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Failed to load profile'}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="text-gray-900 dark:text-white font-semibold hover:underline"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const ProfileField = ({ icon: Icon, label, field, value, type = 'text', placeholder, readOnly = false }) => {
    const isEditing = editingField === field
    const displayValue = value || 'Not provided'

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
            </div>
            {isEditing && !readOnly ? (
              <div className="space-y-2">
                <input
                  type={type}
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFieldSave(field)}
                    className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleFieldCancel}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {displayValue}
                </p>
                {!readOnly && (
                  <button
                    onClick={() => handleFieldEdit(field, value)}
                    className="ml-4 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and profile information</p>
      </div>

      {/* Success/Error Messages */}
      {updateSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-400">{updateSuccess}</span>
        </div>
      )}

      {updateError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-400">{updateError}</span>
        </div>
      )}

      {/* Profile Image Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Picture</h2>
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-700">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : user.profileImage ? (
                <img src={`http://localhost:5000${user.profileImage}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <label 
              htmlFor="profile-image-input" 
              className="absolute bottom-0 right-0 bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-3 rounded-full cursor-pointer shadow-lg transition-all duration-300 hover:scale-110 hover:bg-gray-800 dark:hover:bg-gray-100"
              title="Change profile picture"
            >
              <Camera className="w-5 h-5" />
            </label>
            <input 
              id="profile-image-input"
              type="file" 
              accept="image/*" 
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          {profileImage && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleImageUpload}
                disabled={uploading}
                className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Upload Image
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setProfileImage(null)
                  setImagePreview(null)
                  setUpdateError('')
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
        
        <ProfileField
          icon={User}
          label="Full Name"
          field="name"
          value={user.name}
          placeholder="Enter your full name"
        />

        <ProfileField
          icon={Hash}
          label="Username (Login ID)"
          field="username"
          value={user.username}
          placeholder="Enter username (6-12 characters)"
        />

        <ProfileField
          icon={Mail}
          label="Email"
          field="email"
          value={user.email}
          placeholder="Email cannot be changed"
          readOnly
        />

        <ProfileField
          icon={Phone}
          label="Phone Number"
          field="phone"
          value={user.phone}
          type="tel"
          placeholder="Enter phone number"
        />

        {/* Member Since - Read Only */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Member Since</label>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {new Date(user.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
