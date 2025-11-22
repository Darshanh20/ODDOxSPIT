import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { AlertCircle, Check, X } from 'lucide-react'

export default function ResetPassword() {
  const location = useLocation()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    isLengthValid: false,
  })
  const navigate = useNavigate()
  const emailOrPhone = location.state?.emailOrPhone || ''

  useEffect(() => {
    // Check if reset token exists
    const resetToken = localStorage.getItem('resetToken')
    if (!resetToken) {
      navigate('/forgot-password')
    }
  }, [navigate])

  // Validate password requirements
  const validatePassword = (pwd) => {
    const strength = {
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      isLengthValid: pwd.length >= 8,
    }
    setPasswordStrength(strength)
    return Object.values(strength).every(v => v)
  }

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

    // Validate password in real-time
    if (name === 'password') {
      validatePassword(value)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, special character and be 8+ characters'
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const resetToken = localStorage.getItem('resetToken')
      if (!resetToken) {
        setErrors({ submit: 'Reset token not found. Please request a new OTP.' })
        return
      }

      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone,
          password: formData.password,
          resetToken: resetToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.message || 'Failed to reset password' })
        return
      }

      // Clear reset token and redirect to login
      localStorage.removeItem('resetToken')
      navigate('/login', { state: { message: 'Password reset successful! Please login with your new password.' } })
    } catch (err) {
      console.error(err)
      setErrors({ submit: err.message || 'Failed to reset password. Please try again.' })
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h2>
          <p className="text-gray-600">Create a strong password for your account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your new password"
                className={`w-full px-4 py-3 border rounded-lg transition-all focus:outline-none ${
                  errors.password
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                }`}
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {passwordStrength.isLengthValid ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.isLengthValid ? 'text-green-600' : 'text-gray-500'}`}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasUpper ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasUpper ? 'text-green-600' : 'text-gray-500'}`}>
                      Uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasLower ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasLower ? 'text-green-600' : 'text-gray-500'}`}>
                      Lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasNumber ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                      Number (0-9)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasSpecial ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                      Special character (!@#$%^&* etc.)
                    </span>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter your new password"
                className={`w-full px-4 py-3 border rounded-lg transition-all focus:outline-none ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.confirmPassword}
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
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>

          {/* Back to Login Link */}
          <p className="text-center text-gray-600 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

