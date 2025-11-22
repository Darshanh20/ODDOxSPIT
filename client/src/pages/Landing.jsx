import React, { useState, useEffect } from 'react'
import { Package, BarChart3, Lock, Zap, Users, AlertCircle } from 'lucide-react'
/* DASHBOARD SNAPSHOT - toggle on production as needed | Design ref: /mnt/data/StockMaster.pdf */
import DashboardSnapshot from '../components/DashboardSnapshot'

export default function Landing() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h2 className={`text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            Smart Inventory<br />Management System
          </h2>
          
          <p className={`text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            StockMaster is a smart, modern Inventory Management System designed to digitize and simplify all your stock operations in one powerful platform. Whether you're receiving goods, delivering orders, transferring items across locations, or performing stock counts, StockMaster keeps everything organized, accurate, and effortless.
          </p>
          
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <a 
              href="/signup" 
              className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              Get Started Free
            </a>
            <a 
              href="/login" 
              className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 hover:shadow-lg"
            >
              Sign In
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div 
              key={index}
              className={`p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-lg hover:-translate-y-2 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: isVisible ? `${300 + index * 100}ms` : '0ms'
              }}
            >
              {index === 0 && <Package className="w-8 h-8 text-gray-900 dark:text-white mb-4" />}
              {index === 1 && <BarChart3 className="w-8 h-8 text-gray-900 dark:text-white mb-4" />}
              {index === 2 && <Users className="w-8 h-8 text-gray-900 dark:text-white mb-4" />}
              {index === 3 && <AlertCircle className="w-8 h-8 text-gray-900 dark:text-white mb-4" />}
              {index === 4 && <Package className="w-8 h-8 text-gray-900 dark:text-white mb-4" />}
              {index === 5 && <Lock className="w-8 h-8 text-gray-900 dark:text-white mb-4" />}
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {index === 0 && 'Centralized Operations'}
                {index === 1 && 'Real-Time Dashboards'}
                {index === 2 && 'Role-Based Access'}
                {index === 3 && 'Intelligent Alerts'}
                {index === 4 && 'Multi-Warehouse Support'}
                {index === 5 && 'Secure & Reliable'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {index === 0 && 'Manage goods receiving, order deliveries, inter-location transfers, and stock counts all in one place.'}
                {index === 1 && 'View live inventory insights and stock levels across all your warehouses at a glance.'}
                {index === 2 && 'Dedicated workflows for Inventory Managers and Warehouse Staff with appropriate permissions.'}
                {index === 3 && 'Get notified about low stock, pending orders, and critical inventory events in real-time.'}
                {index === 4 && 'Seamlessly manage inventory across multiple locations with unified reporting and control.'}
                {index === 5 && 'Enterprise-grade security and reliability to keep your inventory data safe and always available.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* DASHBOARD SNAPSHOT - toggle on production as needed */}
      <DashboardSnapshot />

      {/* CTA Section */}
      <section className={`bg-gray-900 dark:bg-gray-800 text-white py-16 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        transitionDelay: '600ms'
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">Say goodbye to manual registers and scattered Excel sheets</h3>
          <p className="text-lg text-gray-300 dark:text-gray-400 mb-8">
            Bring your entire stock workflow into a single, seamless, and reliable system.
          </p>
          <a 
            href="/signup" 
            className="inline-block px-8 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 hover:shadow-lg hover:scale-105"
          >
            Start Your Free Trial
          </a>
        </div>
      </section>

      <style>{`
        .delay-200 {
          transition-delay: 200ms;
        }

        .delay-300 {
          transition-delay: 300ms;
        }
      `}</style>
    </div>
  )
}
