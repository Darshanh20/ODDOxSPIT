import React from 'react'

export default function StockOverviewChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No stock data available</p>
      </div>
    )
  }

  const topProducts = data.slice(0, 5)
  const maxQuantity = Math.max(...topProducts.map(p => p.totalQuantity))

  return (
    <div className="space-y-4">
      {topProducts.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 truncate">{item.product?.name}</span>
            <span className="text-xs font-semibold text-gray-500">{item.totalQuantity} units</span>
          </div>
          <div className="flex gap-1">
            <div className="flex-1 bg-gray-200 rounded h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-full"
                style={{
                  width: `${(item.totalQuantity / maxQuantity) * 100}%`
                }}
              ></div>
            </div>
            <div className="text-xs font-semibold text-gray-500 w-12 text-right pt-1">
              {((item.totalQuantity / maxQuantity) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="flex gap-2 mt-1 text-xs text-gray-500">
            <span>Available: {item.totalAvailable}</span>
            <span>Reserved: {item.totalReserved}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
