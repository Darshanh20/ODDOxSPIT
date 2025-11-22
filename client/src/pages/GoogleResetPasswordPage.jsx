import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { AlertCircle, Check, X, Lock } from 'lucide-react'

export default function GoogleResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
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

  const googleVerified = location.state?.googleVerified || false
  const email = location.state?.email || ''

  useEffect(() => {
    // Check if user came from Google verification
    const googleVerifiedToken = localStorage.getItem('googleVerified')
    const token = localStorage.getItem('token')

    if (!googleVerifiedToken || !token) {
      navigate('/forgot-password')
      return
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
      const token = localStorage.getItem('token')
      if (!token) {
        setErrors({ submit: 'Authentication token not found. Please verify again.' })
        return
      }

      const response = await fetch('http://localhost:5000/api/auth/reset-password-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.message || 'Failed to reset password' })
        return
      }

      // Clear verification data
      localStorage.removeItem('googleVerified')
      localStorage.removeItem('googleVerifiedEmail')
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')

      // Redirect to login with success message
      navigate('/login', { 
        state: { 
          message: 'Password reset successful! Please login with your new password.' 
        } 
      })
    } catch (err) {
      console.error(err)
      setErrors({ submit: err.message || 'Failed to reset password. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-gray-900 text-sm font-bold">
              SM
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">StockMaster</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Set New Password</h2>
          <p className="text-gray-600 dark:text-gray-400">Create a strong password for your account</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-8">
          {/* Verified Email Display */}
          {email && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Verified as: <strong>{email}</strong>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your new password"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:outline-none ${
                    errors.password
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                />
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {passwordStrength.isLengthValid ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.isLengthValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasUpper ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasUpper ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasLower ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasLower ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasNumber ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Number (0-9)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasSpecial ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className={`text-xs ${passwordStrength.hasSpecial ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter your new password"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:outline-none ${
                    errors.confirmPassword
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{errors.submit}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 border-t-white dark:border-t-gray-900 rounded-full animate-spin"></div>
                  Resetting password...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Reset Password
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-gray-900 dark:text-white font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
