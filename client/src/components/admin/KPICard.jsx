import React from 'react'

export default function KPICard({ title, value, icon: Icon, color = 'blue', change }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  }

  const iconClasses = {
    blue: 'bg-blue-100',
    yellow: 'bg-yellow-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    red: 'bg-red-100',
    indigo: 'bg-indigo-100',
    emerald: 'bg-emerald-100',
  }

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            {change && <span className="text-xs font-semibold text-gray-500">{change}</span>}
          </div>
        </div>
        <div className={`${iconClasses[color]} rounded-lg p-3`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
