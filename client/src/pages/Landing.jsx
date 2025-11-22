import React from 'react'
import { Sparkles, Zap, Shield, ArrowRight } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Main Hero Content */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>Now with React, Vite & Modern UI</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in-up">
              Welcome to{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                New App
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
              Build faster, ship smarter. Your minimal starter kit for creating amazing web experiences.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-400">
              <a 
                href="/signup" 
                className="group inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-md hover:shadow-lg border border-gray-200"
              >
                Login
              </a>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600">Built with Vite for blazing fast development and optimized production builds.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Modern Stack</h3>
              <p className="text-gray-600">Powered by React with a beautiful, minimal UI that's ready to customize.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-600">Built with best practices and security in mind for production-ready apps.</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: backwards;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: backwards;
        }
      `}</style>
    </div>
  )
}
