import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle, Mail, Send } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const validateEmail = (emailValue) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(emailValue)
  }

  const handleInputChange = (e) => {
    const { value } = e.target
    setEmail(value)
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }))
    }
    setSuccessMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Please proceed with Google authentication to reset your password.')
        setEmail('')
        // Redirect to Google verification page after 2 seconds
        setTimeout(() => {
          navigate('/forgot-password/google-verify', { state: { email } })
        }, 1500)
      } else {
        setErrors({ submit: data.message || 'Failed to process forgot password request' })
      }
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'An error occurred. Please try again.' })
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password?</h2>
          <p className="text-gray-600 dark:text-gray-400">Enter your email to verify your identity</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:outline-none ${
                    errors.email
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.email}
                </p>
              )}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">{successMessage}</span>
              </div>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
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
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-white dark:border-t-gray-900 rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Continue with Email
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
