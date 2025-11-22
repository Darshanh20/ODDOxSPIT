import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'

export default function Profile(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    // Decode JWT to get user info (simple decode, not verification)
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      
      const decoded = JSON.parse(jsonPayload)
      
      // Fetch user data from server
      fetch(`http://localhost:5000/api/users/${decoded.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to fetch user data')
          const data = await res.json()
          setUser(data)
          setFormData({
            name: data.name || '',
            username: data.username || '',
            phone: data.phone || ''
          })
          setLoading(false)
        })
        .catch((err) => {
          console.error(err)
          setError(err.message)
          setLoading(false)
        })
    } catch (err) {
      console.error('Token decode error:', err)
      navigate('/login')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
    // Force a page reload to clear all state
    window.location.href = '/login'
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSaveChanges = async () => {
    const token = localStorage.getItem('token')
    try {
      const response = await fetch('http://localhost:5000/api/users/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsEditing(false)
        alert('Profile updated successfully!')
      } else {
        alert('Failed to update profile')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Error updating profile')
    }
  }

  const handleCancelEdit = () => {
    setFormData({
      name: user.name || '',
      username: user.username || '',
      phone: user.phone || ''
    })
    setIsEditing(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProfileImage(file)
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!profileImage) return
    
    const formData = new FormData()
    formData.append('profileImage', profileImage)
    
    const token = localStorage.getItem('token')
    try {
      const response = await fetch('http://localhost:5000/api/users/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('Profile image uploaded successfully!')
        // Update user data with new profile image
        setUser(data.user)
        setProfileImage(null)
        setImagePreview(null)
      } else {
        alert('Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error uploading image')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load profile'}</p>
          <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">Go to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile</h2>
            <button 
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
          
          {/* Profile Image Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : user.profileImage ? (
                  <img src={`http://localhost:5000${user.profileImage}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <label 
                htmlFor="profile-image-input" 
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-all duration-300 hover:scale-110"
              >
                <Camera size={20} />
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
              <button
                onClick={handleImageUpload}
                className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Upload Image
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">Name</p>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">{user.name || 'Not provided'}</p>
              )}
            </div>
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-lg font-semibold text-gray-900">{user.email}</p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">Username</p>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">{user.username || 'Not provided'}</p>
              )}
            </div>
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">{user.phone || 'Not provided'}</p>
              )}
            </div>
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600 mb-1">Member since</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(user.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
