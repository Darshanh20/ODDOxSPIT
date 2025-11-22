import React, { useState, useEffect } from 'react'
import { Package, AlertCircle, TrendingUp, Warehouse, FileText, AlertTriangle } from 'lucide-react'
import KPICard from '../components/admin/KPICard'
import AlertCard from '../components/admin/AlertCard'
import StockOverviewChart from '../components/admin/StockOverviewChart'
import DocumentStatusChart from '../components/admin/DocumentStatusChart'
import RecentActivityTable from '../components/admin/RecentActivityTable'

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const [kpisRes, alertsRes] = await Promise.all([
        fetch('http://localhost:5000/api/dashboard/kpis', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/dashboard/alerts', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (!kpisRes.ok || !alertsRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const kpisData = await kpisRes.json()
      const alertsData = await alertsRes.json()

      setDashboardData(kpisData)
      setAlerts(alertsData)
      setError(null)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const kpis = dashboardData?.kpis || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Inventory management & system overview</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Products"
            value={kpis.totalProductsInStock}
            icon={Package}
            color="blue"
            change="+12%"
          />
          <KPICard
            title="Low Stock Alerts"
            value={kpis.lowStockCount}
            icon={AlertTriangle}
            color="yellow"
            change={kpis.lowStockCount > 0 ? "Needs attention" : "All clear"}
          />
          <KPICard
            title="Pending Receipts"
            value={kpis.pendingReceipts}
            icon={TrendingUp}
            color="green"
          />
          <KPICard
            title="Pending Deliveries"
            value={kpis.pendingDeliveries}
            icon={FileText}
            color="purple"
          />
        </div>

        {/* Additional KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Pending Transfers"
            value={kpis.scheduledTransfers}
            icon={Warehouse}
            color="indigo"
          />
          <KPICard
            title="Out of Stock"
            value={kpis.outOfStockCount}
            icon={AlertCircle}
            color="red"
          />
          <KPICard
            title="Total Stock Value"
            value={`$${(kpis.totalStockValue || 0).toFixed(2)}`}
            icon={TrendingUp}
            color="emerald"
          />
        </div>

        {/* Critical Alerts */}
        {alerts?.summary?.critical > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Critical Alerts</h2>
            <div className="space-y-3">
              {alerts.alerts
                ?.filter(a => a.severity === 'CRITICAL')
                .slice(0, 3)
                .map((alert, idx) => (
                  <AlertCard key={idx} alert={alert} />
                ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Document Status Overview</h2>
            <DocumentStatusChart data={dashboardData?.statusBreakdown} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top Warnings</h2>
            <div className="space-y-3">
              {alerts?.alerts
                ?.slice(0, 5)
                .map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500' :
                      alert.severity === 'HIGH' ? 'bg-orange-500' :
                      alert.severity === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.type}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Stock Movements</h2>
          <RecentActivityTable activities={dashboardData?.recentActivities || []} />
        </div>
      </div>
    </div>
  )
}
