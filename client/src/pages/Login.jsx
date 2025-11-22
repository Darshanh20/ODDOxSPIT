import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Login failed')
        if (data.token) {
          localStorage.setItem('token', data.token)
          // Force reload to update navbar
          window.location.href = '/home'
        }
      })
      .catch((err) => {
        console.error(err)
        alert(err.message || 'Login failed')
      })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
