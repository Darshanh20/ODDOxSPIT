import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, CheckCircle, Clock, Package, Truck, 
  ArrowRightLeft, FileText, TrendingUp, AlertCircle, Eye
} from 'lucide-react'

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pendingTasks: 0,
    acceptedToday: 0,
    deliveredToday: 0,
    totalCompleted: 0
  })
  const [pendingTasks, setPendingTasks] = useState([])
  const [activeTasks, setActiveTasks] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchUserInfo()
    fetchStats()
    fetchPendingTasks()
    fetchActiveTasks()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats()
      fetchPendingTasks()
      fetchActiveTasks()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      const response = await fetch(`http://localhost:5000/api/users/${payload.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const user = await response.json()
        setCurrentUser(user)
      }
    } catch (err) {
      console.error('Error fetching user info:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/staff/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/staff/tasks/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingTasks(data.tasks || data || [])
      }
    } catch (err) {
      console.error('Error fetching pending tasks:', err)
    }
  }

  const fetchActiveTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/staff/tasks/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setActiveTasks(data.tasks || data || [])
      }
    } catch (err) {
      console.error('Error fetching active tasks:', err)
    }
  }

  const handleAcceptTask = async (taskType, taskId) => {
    try {
      const token = localStorage.getItem('token')
      const endpoint = taskType === 'receipt' 
        ? `receipts/${taskId}/accept`
        : taskType === 'delivery'
        ? `deliveries/${taskId}/accept`
        : `transfers/${taskId}/accept`
      
      const response = await fetch(`http://localhost:5000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to accept task')
      }

      // Refresh tasks
      fetchPendingTasks()
      fetchActiveTasks()
      fetchStats()
    } catch (err) {
      console.error('Error accepting task:', err)
      alert(err.message || 'Failed to accept task')
    }
  }

  const handleViewTask = (taskType, taskId) => {
    if (taskType === 'receipt') {
      navigate(`/receipts/${taskId}`)
    } else if (taskType === 'delivery') {
      navigate(`/deliveries/${taskId}`)
    } else if (taskType === 'transfer') {
      navigate(`/transfers/${taskId}`)
    }
  }

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'receipt':
        return <FileText className="w-4 h-4" />
      case 'delivery':
        return <Truck className="w-4 h-4" />
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const getTaskTypeLabel = (type) => {
    switch (type) {
      case 'receipt':
        return 'Receipt'
      case 'delivery':
        return 'Delivery'
      case 'transfer':
        return 'Transfer'
      default:
        return type
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
      case 'LOW':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      case 'READY':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
      case 'DONE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard className="w-8 h-8" />
          Staff Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome back, {currentUser?.name || 'Staff'}! Manage your tasks and track your progress.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.pendingTasks}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Tasks waiting for action</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accepted Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.acceptedToday}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Tasks accepted today</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Delivered Today</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.deliveredToday}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Deliveries completed today</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Truck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalCompleted}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">All-time completed tasks</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Tasks Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Tasks</h2>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending tasks available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pendingTasks.map((task) => (
                  <tr key={`${task.type}-${task.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {task.reference || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTaskTypeIcon(task.type)}
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {getTaskTypeLabel(task.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {task.from || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {task.to || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {task.itemsCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAcceptTask(task.type, task.id)}
                          className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleViewTask(task.type, task.id)}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Active Tasks */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Active Tasks</h2>
        </div>

        {activeTasks.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No active tasks. Accept a task from pending tasks above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Accepted At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {activeTasks.map((task) => (
                  <tr key={`${task.type}-${task.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {task.reference || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTaskTypeIcon(task.type)}
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {getTaskTypeLabel(task.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {task.acceptedAt 
                          ? new Date(task.acceptedAt).toLocaleString()
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewTask(task.type, task.id)}
                          className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          {task.type === 'receipt' ? 'Validate' : task.type === 'delivery' ? 'Process' : 'Process'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

