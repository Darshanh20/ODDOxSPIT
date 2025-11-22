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
  LogOut,
  Bell,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col h-screen overflow-hidden">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 flex-shrink-0 transition-colors">
        <div className="flex items-center justify-between w-full">
          {/* Left: Hamburger menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Center: Site Name */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-gray-900 font-bold text-sm">SM</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">StockMaster</span>
          </div>

          {/* Right side: Dark mode toggle + Notifications + Avatar */}
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

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
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/profile')}
            >
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

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden flex flex-col`}
        >
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
                  <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                    {settingsSubmenu.map((subItem) => {
                      const SubIcon = subItem.icon
                      const subActive = isActive(subItem.path)
                      return (
                        <li key={subItem.path}>
                          <Link
                            to={subItem.path}
                            onClick={() => {
                              setSettingsDropdownOpen(false)
                            }}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                              subActive
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
              title={!sidebarOpen ? 'Logout' : ''}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}

