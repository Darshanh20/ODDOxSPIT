import React, { useState, useEffect } from 'react'
import { FileText, Truck, Clock, Package } from 'lucide-react'

export default function Home() {
  const [receiptStats, setReceiptStats] = useState({
    toReceive: 4,
    late: 1,
    operations: 6,
  })
  const [deliveryStats, setDeliveryStats] = useState({
    toDeliver: 4,
    late: 1,
    waiting: 2,
    operations: 6,
  })

  // Fetch dashboard data on mount
  useEffect(() => {
    // TODO: Replace with actual API call
    // fetchDashboardStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your inventory operations</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Receipt</h2>
            </div>
          </div>

          {/* To Receive Button */}
          <button className="w-full mb-4 bg-blue-600 dark:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-lg">
            {receiptStats.toReceive} to receive
          </button>

          {/* Statistics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600 dark:text-red-400 font-medium">
                {receiptStats.late} Late
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Schedule date &lt; today&apos;s date
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {receiptStats.operations} Operations
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Schedule date &gt; today&apos;s date
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery</h2>
            </div>
          </div>

          {/* To Deliver Button */}
          <button className="w-full mb-4 bg-green-600 dark:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-lg">
            {deliveryStats.toDeliver} to Deliver
          </button>

          {/* Statistics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600 dark:text-red-400 font-medium">
                {deliveryStats.late} Late
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Schedule date &lt; today&apos;s date
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {deliveryStats.waiting} Waiting
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Waiting for the stocks
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {deliveryStats.operations} Operations
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Schedule date &gt; today&apos;s date
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">0</p>
            </div>
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Receipts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{receiptStats.toReceive}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Deliveries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{deliveryStats.toDeliver}</p>
            </div>
            <Truck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Late Operations</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {receiptStats.late + deliveryStats.late}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
