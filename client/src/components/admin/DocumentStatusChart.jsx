import React from 'react'

export default function DocumentStatusChart({ data }) {
  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data available</p>
      </div>
    )
  }

  const documentTypes = [
    { key: 'receipts', label: 'Receipts' },
    { key: 'deliveries', label: 'Deliveries' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'adjustments', label: 'Adjustments' }
  ]

  const statuses = ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']
  const statusColors = {
    DRAFT: 'bg-gray-200',
    WAITING: 'bg-blue-200',
    READY: 'bg-yellow-200',
    DONE: 'bg-green-200',
    CANCELED: 'bg-red-200'
  }

  return (
    <div className="space-y-4">
      {documentTypes.map(({ key, label }) => {
        const typeData = data[key] || []
        const total = typeData.reduce((sum, item) => sum + item._count, 0)

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-xs font-semibold text-gray-500">{total}</span>
            </div>
            <div className="flex gap-1 h-6">
              {statuses.map(status => {
                const item = typeData.find(d => d.status === status)
                const count = item?._count || 0
                const percentage = total > 0 ? (count / total) * 100 : 0

                return (
                  <div
                    key={status}
                    className={`${statusColors[status]} rounded flex items-center justify-center text-xs font-semibold relative group`}
                    style={{ width: `${percentage}%`, minWidth: percentage > 5 ? 'auto' : '0' }}
                    title={`${status}: ${count}`}
                  >
                    {percentage > 10 && <span className="text-gray-700">{count}</span>}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {statuses.map(status => {
                const item = typeData.find(d => d.status === status)
                const count = item?._count || 0
                if (count === 0) return null
                return (
                  <span key={status} className="text-xs text-gray-500">
                    {status}: {count}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
