import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FileText,
  Truck,
  ArrowRightLeft,
  RefreshCw,
  History,
  Settings,
  Warehouse,
  MapPin,
  User,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false)
  const [notifications] = useState([
    { id: 1, message: 'New receipt pending approval', time: '5m ago' },
    { id: 2, message: 'Low stock alert: Product XYZ', time: '1h ago' },
  ])
  const [showNotifications, setShowNotifications] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // Get user info from localStorage or token
  const [user, setUser] = useState({ name: 'User', email: '' })

  useEffect(() => {
    // Try to get user info from token (you can decode JWT or fetch from API)
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    // Decode JWT to get user ID
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      
      const decoded = JSON.parse(jsonPayload)
      
      // Fetch user data from server
      fetch(`http://localhost:5000/api/users/${decoded.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            setUser({
              name: data.name || data.username || 'User',
              email: data.email || ''
            })
          }
        })
        .catch((err) => {
          console.error('Error fetching user:', err)
          // Use default values if fetch fails
        })
    } catch (err) {
      console.error('Token decode error:', err)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/home' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: FileText, label: 'Receipts', path: '/receipts' },
    { icon: Truck, label: 'Delivery Orders', path: '/deliveries' },
    { icon: ArrowRightLeft, label: 'Internal Transfers', path: '/transfers' },
    { icon: RefreshCw, label: 'Adjustments', path: '/adjustments' },
    { icon: History, label: 'Move History', path: '/move-history' },
  ]

  const settingsSubmenu = [
    { icon: Warehouse, label: 'Warehouse', path: '/warehouse' },
    { icon: MapPin, label: 'Location', path: '/location' },
  ]

  const isActive = (path) => {
    return location.pathname === path
  }

  const isSettingsActive = () => {
    return location.pathname === '/warehouse' || location.pathname === '/location' || location.pathname === '/settings'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex h-screen overflow-hidden">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 dark:bg-gray-800 text-white fixed lg:static h-screen left-0 z-50 transition-all duration-300 ease-in-out flex-shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800 dark:border-gray-700">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 dark:text-white font-bold text-sm">SM</span>
                </div>
                <span className="text-xl font-bold">StockMaster</span>
              </div>
            )}
            {!sidebarOpen && (
              <div className="w-8 h-8 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center mx-auto">
                <span className="text-gray-900 dark:text-white font-bold text-sm">SM</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {sidebarOpen && (
                <button
                  onClick={toggleDarkMode}
                  className="p-1 rounded hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:block hidden p-1 rounded hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-90' : 'rotate-0'}`} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1 rounded hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-gray-800 dark:bg-gray-700 text-white'
                          : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white'
                      }`}
                      title={!sidebarOpen ? item.label : ''}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && <span className="font-medium">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
              
              {/* Settings with Dropdown */}
              <li>
                <button
                  onClick={() => {
                    setSettingsDropdownOpen(!settingsDropdownOpen)
                    if (sidebarOpen === false) {
                      setSidebarOpen(true)
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isSettingsActive()
                      ? 'bg-gray-800 dark:bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? 'Settings' : ''}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="font-medium">Settings</span>}
                  </div>
                  {sidebarOpen && (
                    settingsDropdownOpen ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    )
                  )}
                </button>
                
                {/* Settings Dropdown Submenu */}
                {settingsDropdownOpen && sidebarOpen && (
                  <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-700 dark:border-gray-600 pl-2">
                    {settingsSubmenu.map((subItem) => {
                      const SubIcon = subItem.icon
                      const subActive = isActive(subItem.path)
                      return (
                        <li key={subItem.path}>
                          <Link
                            to={subItem.path}
                            onClick={() => {
                              setMobileMenuOpen(false)
                              setSettingsDropdownOpen(false)
                            }}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                              subActive
                                ? 'bg-gray-800 dark:bg-gray-700 text-white'
                                : 'text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            <SubIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">{subItem.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
              
              {/* Profile */}
              <li>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/profile')
                      ? 'bg-gray-800 dark:bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white'
                  }`}
                  title={!sidebarOpen ? 'Profile' : ''}
                >
                  <User className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">Profile</span>}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-800 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors w-full"
              title={!sidebarOpen ? 'Logout' : ''}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Moon className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>

            {/* Desktop sidebar toggle - only show if sidebar is collapsed */}
            {!sidebarOpen && (
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? (
                    <Sun className="w-6 h-6 text-yellow-400" />
                  ) : (
                    <Moon className="w-6 h-6 text-gray-600" />
                  )}
                </button>
              </div>
            )}

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search products, receipts, deliveries..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right side: Notifications & Avatar */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {notifications.map((notif) => (
                              <li
                                key={notif.id}
                                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                              >
                                <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.time}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No notifications
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}

