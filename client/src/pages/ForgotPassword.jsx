import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle, Mail, Phone } from 'lucide-react'

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    usePhone: false,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const navigate = useNavigate()

  // Validate email
  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(email)
  }

  // Validate phone
  const validatePhone = (phone) => {
    const phonePattern = /^[\d\s\-\+\(\)]{10,}$/
    return phonePattern.test(phone.replace(/\s/g, ''))
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
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const newErrors = {}

    // Validate email/phone
    if (!formData.emailOrPhone.trim()) {
      newErrors.emailOrPhone = 'Email or phone number is required'
    } else if (!validateEmail(formData.emailOrPhone) && !validatePhone(formData.emailOrPhone)) {
      newErrors.emailOrPhone = 'Please enter a valid email or phone number'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: formData.emailOrPhone.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.message || 'Failed to send OTP' })
        return
      }

      setOtpSent(true)
    } catch (err) {
      console.error(err)
      setErrors({ submit: err.message || 'Failed to send OTP. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!otp.trim()) {
      newErrors.otp = 'OTP is required'
    } else if (otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: formData.emailOrPhone.trim(),
          otp: otp.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.message || 'Invalid OTP' })
        return
      }

      // Store reset token and navigate to reset password page
      localStorage.setItem('resetToken', data.resetToken)
      navigate('/reset-password', { state: { emailOrPhone: formData.emailOrPhone } })
    } catch (err) {
      console.error(err)
      setErrors({ submit: err.message || 'OTP verification failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp: '' }))
    }
  }

  if (otpSent) {
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h2>
            <p className="text-gray-600">Enter the OTP sent to {formData.emailOrPhone}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="000000"
                  maxLength={6}
                  className={`w-full px-4 py-3 border rounded-lg transition-all focus:outline-none text-center text-2xl tracking-widest font-mono ${
                    errors.otp
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                  }`}
                />
                {errors.otp && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.otp}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Didn't receive OTP?{' '}
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="text-gray-900 font-semibold hover:underline"
                    disabled={loading}
                  >
                    Resend
                  </button>
                </p>
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
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            {/* Back Link */}
            <p className="text-center text-gray-600 mt-6">
              <button
                onClick={() => {
                  setOtpSent(false)
                  setOtp('')
                  setErrors({})
                }}
                className="text-gray-900 font-semibold hover:underline"
              >
                ← Back
              </button>
            </p>
          </div>
        </div>
      </div>
    )
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600">Enter your email or phone to receive OTP</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <form onSubmit={handleSendOTP} className="space-y-6">
            {/* Email/Phone Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email or Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="emailOrPhone"
                value={formData.emailOrPhone}
                onChange={handleInputChange}
                placeholder="your@email.com or +1234567890"
                className={`w-full px-4 py-3 border rounded-lg transition-all focus:outline-none ${
                  errors.emailOrPhone
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
                }`}
              />
              {errors.emailOrPhone && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.emailOrPhone}
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
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>

          {/* Back to Login Link */}
          <p className="text-center text-gray-600 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline">
              Sign In
            </Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-8 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-500">Or</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Google OAuth Alternative */}
          <Link
            to="/forgot-password-new"
            className="block w-full text-center px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-300"
          >
            🔐 Reset via Google Authentication
          </Link>
        </div>
      </div>
    </div>
  )
}

