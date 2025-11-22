import React from 'react'
import { Edit2, Trash2, Printer, CheckCircle } from 'lucide-react'

export default function ReceiptKanbanView({ receipts, onEdit, onValidate, onPrint, onDelete }) {
  const statuses = ['DRAFT', 'READY', 'DONE']

  const getReceiptsByStatus = (status) => receipts.filter(r => r.status === status)

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return { bg: 'bg-gray-50 dark:bg-gray-700', border: 'border-gray-200 dark:border-gray-600', icon: '📋' }
      case 'READY':
        return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', icon: '✅' }
      case 'DONE':
        return { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', icon: '🎯' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', icon: '•' }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {statuses.map(status => {
        const statusConfig = getStatusColor(status)
        const statusReceipts = getReceiptsByStatus(status)

        return (
          <div
            key={status}
            className={`border rounded-lg p-4 ${statusConfig.border} ${statusConfig.bg}`}
          >
            {/* Column Header */}
            <div className="mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{statusConfig.icon}</span>
                <span>{status}</span>
                <span className="ml-auto bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {statusReceipts.length}
                </span>
              </h3>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-96">
              {statusReceipts.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-center text-gray-500 dark:text-gray-400 text-sm">No receipts</p>
                </div>
              ) : (
                statusReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{receipt.receiptNumber}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEdit(receipt)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Vendor:</p>
                        <p className="text-gray-900 dark:text-white font-medium">{receipt.supplier?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Warehouse:</p>
                        <p className="text-gray-900 dark:text-white font-medium">{receipt.warehouse?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Scheduled:</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {receipt.scheduledDate ? new Date(receipt.scheduledDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Items:</p>
                        <p className="text-gray-900 dark:text-white font-medium">{receipt.items?.length || 0} items</p>
                      </div>
                    </div>

                    {/* Card Footer - Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                      {status !== 'DONE' && (
                        <button
                          onClick={() => onValidate(receipt.id)}
                          className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                        >
                          Validate
                        </button>
                      )}
                      {status === 'DONE' && (
                        <button
                          onClick={() => onPrint(receipt.id)}
                          className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors flex items-center justify-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Print
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(receipt.id)}
                        className="px-2 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
