import React from 'react'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

export default function AlertCard({ alert }) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'HIGH':
        return 'bg-orange-50 border-orange-200 text-orange-700'
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return AlertCircle
      case 'HIGH':
        return AlertTriangle
      default:
        return Info
    }
  }

  const Icon = getSeverityIcon(alert.severity)

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${getSeverityColor(alert.severity)}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{alert.message}</p>
        <p className="text-xs opacity-75 mt-1">{alert.type}</p>
        {alert.currentStock !== undefined && (
          <p className="text-xs opacity-75 mt-1">
            Current: {alert.currentStock} | Reorder: {alert.reorderPoint}
          </p>
        )}
      </div>
    </div>
  )
}
