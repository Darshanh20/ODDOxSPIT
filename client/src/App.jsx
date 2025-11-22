import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import Receipt from './pages/Receipt'
import Warehouse from './pages/Warehouse'
import Location from './pages/Location'
import Products from './pages/Products'
import Delivery from './pages/Delivery'
import DeliveryDetail from './pages/DeliveryDetail'
import StockAdjustment from './pages/StockAdjustment'
import MoveHistory from './pages/MoveHistory'
import ReceiptDetail from './pages/ReceiptDetail'
import StaffDashboard from './pages/StaffDashboard'
import StaffManagement from './pages/StaffManagement'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { useTheme } from './contexts/ThemeContext'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  // const [theme, setTheme] = useState('dark')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const isLandingPage = location.pathname === '/'

  // Check authentication status and user role on mount and location change
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserRole(payload.role)
      } catch (err) {
        console.error('Failed to parse token:', err)
        setUserRole(null)
      }
    } else {
      setIsLoggedIn(false)
      setUserRole(null)
    }
  }, [location.pathname])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Redirect to appropriate dashboard if user is logged in and tries to access login/signup
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && (location.pathname === '/login' || location.pathname === '/signup')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.role === 'ADMIN' || payload.role === 'MANAGER') {
          navigate('/admin/dashboard')
        } else if (payload.role === 'STAFF') {
          navigate('/staff/dashboard')
        } else {
          navigate('/home')
        }
      } catch (err) {
        navigate('/home')
      }
    }
  }, [location.pathname, navigate])

  // Handle logo click
  const handleLogoClick = (e) => {
    if (isLoggedIn) {
      e.preventDefault()
      if (userRole === 'ADMIN' || userRole === 'MANAGER') {
        navigate('/admin/dashboard')
      } else if (userRole === 'STAFF') {
        navigate('/staff/dashboard')
      } else {
        navigate('/home')
      }
    }
  }

  // Only show navbar on landing page, not on auth pages or when logged in (Layout handles that)
  const showNavbar = isLandingPage && !isLoggedIn

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-gray-200 dark:border-gray-700 shadow-sm' : 'border-b border-gray-100 dark:border-gray-800'
      } bg-white dark:bg-gray-900`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          

          
        </div>
      </header>

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
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
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
                   <Receipt />
                 </Layout>
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/receipts/:id" 
             element={
               <ProtectedRoute>
                 <Layout>
                   <ReceiptDetail />
                 </Layout>
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/deliveries" 
             element={
               <ProtectedRoute>
                 <Layout>
                   <Delivery />
                 </Layout>
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/deliveries/:id" 
             element={
               <ProtectedRoute>
                 <Layout>
                   <DeliveryDetail />
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
                   <StockAdjustment />
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
                  <Warehouse />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/location" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Location />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staff-management" 
            element={
              <ProtectedRoute>
                <Layout>
                  <StaffManagement />
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
      `}</style>
    </div>
  )
}
