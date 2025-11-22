import React, { useEffect, useRef } from 'react'
import { Mail } from 'lucide-react'

export default function GoogleLoginButton({ onSuccess, onError, isLoading = false }) {
  const googleButtonRef = useRef(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // Load Google Identity Services library
    if (!window.google && !scriptLoaded.current) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        scriptLoaded.current = true
        initializeGoogleButton()
      }
      document.body.appendChild(script)
    } else if (window.google && !scriptLoaded.current) {
      scriptLoaded.current = true
      initializeGoogleButton()
    }
  }, [])

  const initializeGoogleButton = () => {
    if (!window.google || !googleButtonRef.current) return

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    
    if (!clientId) {
      console.error('Google Client ID not configured in .env')
      onError?.()
      return
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
    })

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'center',
      locale: 'en_US',
    })
  }

  const handleCredentialResponse = async (response) => {
    try {
      if (response.credential) {
        // Decode JWT token to get user info
        const decoded = JSON.parse(atob(response.credential.split('.')[1]))
        
        const userData = {
          email: decoded.email,
          name: decoded.name,
          id: decoded.sub,
          picture: decoded.picture,
        }

        // Store in localStorage for use in callback
        localStorage.setItem('googleAccessToken', response.credential)
        localStorage.setItem('googleUser', JSON.stringify(userData))

        onSuccess({
          accessToken: response.credential,
          user: userData
        })
      }
    } catch (error) {
      console.error('Error handling Google response:', error)
      onError?.()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Google Button Container */}
      <div
        ref={googleButtonRef}
        className="flex justify-center w-full"
        style={{ opacity: isLoading ? 0.6 : 1 }}
      />

      {/* Alternative: Custom Button (if Google button doesn't load) */}
      <button
        type="button"
        onClick={() => {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt()
          }
        }}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Mail className="w-5 h-5" />
        Continue with Google
      </button>
    </div>
  )
}
