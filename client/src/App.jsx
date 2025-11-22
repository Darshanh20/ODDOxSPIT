import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import Home from './pages/Home'
import Products from './pages/Products'
import MoveHistory from './pages/MoveHistory'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isLandingPage = location.pathname === '/'

  // Check authentication status on mount and location change
  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [location.pathname])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Redirect to home if user is logged in and tries to access login/signup
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && (location.pathname === '/login' || location.pathname === '/signup')) {
      navigate('/home')
    }
  }, [location.pathname, navigate])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Handle logo click
  const handleLogoClick = (e) => {
    if (isLoggedIn) {
      e.preventDefault()
      // Refresh the current page
      window.location.reload()
    }
  }

  // Only show navbar on landing page, not on auth pages or when logged in (Layout handles that)
  const showNavbar = isLandingPage && !isLoggedIn

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {showNavbar && (
        <header className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b border-gray-200 shadow-sm' : 'border-b border-gray-100'
        } bg-white`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link 
                to="/" 
                className="flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  SM
                </div>
                <span>StockMaster</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <Link 
                  to="/login" 
                  className="text-gray-700 font-medium hover:text-gray-900 transition-colors relative group"
                >
                  Login
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-900 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link 
                  to="/signup" 
                  className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-300 hover:shadow-md"
                >
                  Sign Up
                </Link>
              </nav>

              {/* Mobile menu button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-100 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <nav className="flex flex-col gap-3">
                  <Link 
                    to="/login"
                    className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/signup"
                    className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Sign Up
                  </Link>
                </nav>
              </div>
            )}
          </div>
        </header>
      )}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } 
          />
          {/* Placeholder routes for sidebar items */}
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/receipts" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
                    <p className="text-gray-600 mt-2">Receipts page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/deliveries" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900">Delivery Orders</h1>
                    <p className="text-gray-600 mt-2">Delivery Orders page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transfers" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900">Internal Transfers</h1>
                    <p className="text-gray-600 mt-2">Internal Transfers page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adjustments" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900">Adjustments</h1>
                    <p className="text-gray-600 mt-2">Adjustments page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/move-history" 
            element={
              <ProtectedRoute>
                <Layout>
                  <MoveHistory />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/warehouse" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900">Warehouse</h1>
                    <p className="text-gray-600 mt-2">Warehouse page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600 mt-2">Settings page coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: slideIn 0.2s ease-out;
        }

        .fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .slide-in-from-top-2 {
          animation: slideInFromTop 0.2s ease-out;
        }

        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
