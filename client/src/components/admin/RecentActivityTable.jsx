import React from 'react'
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react'

export default function RecentActivityTable({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No recent activities</p>
      </div>
    )
  }

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'IN':
        return <ArrowUp className="w-4 h-4 text-green-600" />
      case 'OUT':
        return <ArrowDown className="w-4 h-4 text-red-600" />
      default:
        return <TrendingUp className="w-4 h-4 text-blue-600" />
    }
  }

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'IN':
        return 'Inbound'
      case 'OUT':
        return 'Outbound'
      case 'ADJUST':
        return 'Adjustment'
      case 'TRANSFER':
        return 'Transfer'
      default:
        return type
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getTransactionIcon(activity.transactionType)}
                  <span className="font-medium text-gray-900">
                    {getTransactionLabel(activity.transactionType)}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-gray-700">{activity.product?.name}</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className={`font-semibold ${
                  activity.transactionType === 'IN' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {activity.transactionType === 'OUT' ? '-' : '+'}{Math.abs(activity.quantityChange)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {activity.referenceType}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-500">
                {new Date(activity.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
