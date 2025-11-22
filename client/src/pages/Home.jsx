import React from 'react'

export default function Home(){
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Home</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Welcome! This is your home page.</p>
        </div>
      </div>
    </div>
  )
}
