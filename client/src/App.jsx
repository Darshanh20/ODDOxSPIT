import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Home from './pages/Home'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const isLandingPage = location.pathname === '/'

  // Check authentication status on mount and location change
  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [location.pathname])

  // Redirect to home if user is logged in and tries to access login/signup
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && (location.pathname === '/login' || location.pathname === '/signup')) {
      navigate('/home')
    }
  }, [location.pathname, navigate])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              New App
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              {isLandingPage && !isLoggedIn ? (
                <>
                  <Link 
                    to="/login" 
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors relative group"
                  >
                    Login
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link 
                    to="/signup" 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                  >
                    Signup
                  </Link>
                </>
              ) : isLoggedIn ? (
                <>
                  <Link 
                    to="/home" 
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors relative group"
                  >
                    Home
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link 
                    to="/profile" 
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors relative group"
                  >
                    Profile
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/" 
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors relative group"
                  >
                    Landing
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link 
                    to="/login" 
                    className="text-gray-600 hover:text-blue-600 font-medium transition-colors relative group"
                  >
                    Login
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link 
                    to="/signup" 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                  >
                    Signup
                  </Link>
                </>
              )}
            </nav>
            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  )
}
