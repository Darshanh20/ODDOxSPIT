import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedAdminRoute({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setIsAuthorized(false)
          return
        }

        // Decode JWT to check role (basic check)
        const payload = JSON.parse(atob(token.split('.')[1]))
        
        // Make API call to verify role
        const response = await fetch('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
          setIsAuthorized(false)
          return
        }

        const user = await response.json()
        setIsAuthorized(user.role === 'ADMIN')
      } catch (err) {
        console.error('Auth check error:', err)
        setIsAuthorized(false)
      }
    }

    checkAccess()
  }, [])

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <Navigate to="/home" replace />
  }

  return children
}
