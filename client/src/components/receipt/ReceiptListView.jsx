import React from 'react'
import { Edit2, Trash2, Printer, CheckCircle } from 'lucide-react'

export default function ReceiptListView({ receipts, onEdit, onValidate, onPrint, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
      case 'READY':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
      case 'DONE':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
      case 'CANCELED':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'DRAFT':
        return '📋'
      case 'READY':
        return '✅'
      case 'DONE':
        return '🎯'
      case 'CANCELED':
        return '❌'
      default:
        return '•'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Reference</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">From (Vendor)</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Warehouse</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Scheduled Date</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No receipts found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">Create a new receipt to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 dark:text-white">{receipt.receiptNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{receipt.supplier?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{receipt.supplier?.contact || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{receipt.warehouse?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {receipt.scheduledDate ? new Date(receipt.scheduledDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(receipt.status)}`}>
                      {getStatusEmoji(receipt.status)} {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(receipt)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {receipt.status !== 'DONE' && (
                        <button
                          onClick={() => onValidate(receipt.id)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Validate"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {receipt.status === 'DONE' && (
                        <button
                          onClick={() => onPrint(receipt.id)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(receipt.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
