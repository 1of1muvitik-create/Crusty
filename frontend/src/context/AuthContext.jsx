import React, { createContext, useState, useEffect } from 'react'
import axios from 'axios'
import api from '../services/api'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  // Load user from localStorage on init
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      // Verify token is still valid
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // If we have a token but no user, try to restore user from localStorage
      if (!user) {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      }
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      console.log('[AuthContext] --- LOGIN FUNCTION STARTED ---')
      console.log('[AuthContext] Making login request to:', api.defaults.baseURL)
      console.log('[AuthContext] Request payload:', { email, timestamp: new Date().toISOString() })
      const response = await api.post('/api/auth/login', { email, password })
      console.log('[AuthContext] Backend response received:', response.status, response.statusText)
      const { access_token, user: userData } = response.data
      console.log('[AuthContext] Extracted response data:', { userData, hasToken: !!access_token })

      console.log('[AuthContext] Saving token to localStorage...')
      localStorage.setItem('token', access_token)
      // Also save user data for persistence across refreshes
      localStorage.setItem('user', JSON.stringify(userData))
      console.log('[AuthContext] Token and user saved successfully')
      
      console.log('[AuthContext] Updating React state - setToken(access_token)')
      setToken(access_token)
      console.log('[AuthContext] Updating React state - setUser(userData)')
      setUser(userData)
      
      console.log('[AuthContext] Setting Authorization header with Bearer token')
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      console.log('[AuthContext] Final state update complete:', { 
        userRole: userData.role, 
        userName: userData.name,
        userEmail: userData.email,
        hasToken: !!access_token,
        timestamp: new Date().toISOString()
      })
      console.log('[AuthContext] Login function returning user data')

      return userData
    } catch (error) {
      console.error('[AuthContext] --- LOGIN ERROR ---')
      console.error('[AuthContext] Auth login error:', error)
      console.error('[AuthContext] Error response:', error.response?.data)
      console.error('[AuthContext] Error message:', error.message)
      throw error.response?.data || error.message
    }
  }

  const register = async (email, name, phone, password) => {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        name,
        phone,
        password
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }

  const confirmPasswordReset = async (email, code, newPassword) => {
    try {
      const response = await api.post('/api/auth/reset-password-token', {
        email,
        token: code,
        new_password: newPassword
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    delete api.defaults.headers.common['Authorization']
  }

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

const requestPasswordReset = async (email) => {
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data
}
  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  )
}