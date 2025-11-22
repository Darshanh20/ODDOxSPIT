import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    // Validate username
    if (!formData.username.trim()) {
      newErrors.username = 'Login ID is required'
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.message || 'Login failed' })
        return
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        
        // Redirect based on user role
        if (data.role === 'ADMIN' || data.role === 'MANAGER') {
          window.location.href = '/admin/dashboard'
        } else {
          window.location.href = '/home'
        }
      }
    } catch (err) {
      console.error(err)
      setErrors({ submit: err.message || 'Login failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              SM
            </div>
            <span className="text-2xl font-bold text-gray-900">StockMaster</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">Sign in to your StockMaster account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Login ID Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Login ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="e.g., SM20251234"
                className={`w-full px-4 py-3 border rounded-lg transition-all focus:outline-none ${
                  errors.username
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                }`}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.username}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 border rounded-lg transition-all focus:outline-none ${
                  errors.password
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                }`}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.password}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">{errors.submit}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gray-900 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
