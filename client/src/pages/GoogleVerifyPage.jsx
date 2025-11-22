import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, Mail, Loader } from 'lucide-react'
import GoogleLoginButton from '../components/GoogleLoginButton'

export default function GoogleVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [verificationState, setVerificationState] = useState('initial') // initial, loading, success, error
  const email = location.state?.email || ''

  useEffect(() => {
    // Check if already logged in via Google
    const accessToken = localStorage.getItem('googleAccessToken')
    const user = localStorage.getItem('googleUser')
    
    if (accessToken && user) {
      handleGoogleSuccess({ accessToken, user: JSON.parse(user) })
    }
  }, [])

  const handleGoogleSuccess = async (response) => {
    setLoading(true)
    setVerificationState('loading')
    
    try {
      // Send Google auth data to backend
      const result = await fetch('http://localhost:5000/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: response.user?.email || response.email,
          name: response.user?.name || response.name,
          googleId: response.user?.sub || response.id,
          accessToken: response.accessToken
        })
      })

      const data = await result.json()

      if (result.ok && data.success) {
        // Store tokens in localStorage
        localStorage.setItem('token', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('googleVerified', 'true')
        localStorage.setItem('googleVerifiedEmail', data.user.email)

        setVerificationState('success')
        
        // Redirect to reset password page after 1 second
        setTimeout(() => {
          navigate('/forgot-password/reset', { 
            state: { 
              email: data.user.email,
              googleVerified: true,
              userId: data.user.id
            }
          })
        }, 1000)
      } else {
        setErrors({ submit: data.message || 'Google verification failed' })
        setVerificationState('error')
      }
    } catch (err) {
      console.error('Google verification error:', err)
      setErrors({ submit: 'Failed to verify with Google. Please try again.' })
      setVerificationState('error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setErrors({ submit: 'Google authentication failed. Please try again.' })
    setVerificationState('error')
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Identity</h2>
          <p className="text-gray-600 dark:text-gray-400">Sign in with Google to continue</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-8">
          {verificationState === 'initial' || verificationState === 'error' ? (
            <div className="space-y-6">
              {/* Info Message */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  To reset your password securely, we'll verify your identity using your Google account.
                </p>
              </div>

              {/* Email Display */}
              {email && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Email to verify:</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white break-all">{email}</p>
                </div>
              )}

              {/* Google Login Button */}
              <GoogleLoginButton 
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                isLoading={loading}
              />

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-300">{errors.submit}</span>
                </div>
              )}

              {/* Alternative Link */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>Don't have a Google account?{' '}
                  <button 
                    onClick={() => navigate('/forgot-password')}
                    className="text-gray-900 dark:text-white font-semibold hover:underline"
                  >
                    Try another method
                  </button>
                </p>
              </div>
            </div>
          ) : verificationState === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Verifying with Google...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Verification successful!</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to password reset...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
