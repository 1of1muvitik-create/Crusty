import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Dialog, Tabs } from '../components/ui'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export const LoginPage = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const { login } = auth

  const [pendingDestination, setPendingDestination] = useState(null)
  const [pendingRole, setPendingRole] = useState(null)

  // Login tab
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)


  // Forgot password dialog — email based
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const user = await login(loginEmail, loginPassword)
      toast.success('Login successful!')
      const destination =
        user.role === 'admin' ? '/admin' :
        user.role === 'manager' ? '/manager' : '/user/pos'
      setPendingDestination(destination)
      setPendingRole(user.role)
    } catch (error) {
      const errorMsg =
        typeof error === 'string' ? error :
        error?.detail || error?.message || 'Login failed'
      toast.error(errorMsg)
    }
    setLoginLoading(false)
  }

  useEffect(() => {
    if (!pendingDestination) return
    if (auth.isAuthenticated && auth.user?.role === pendingRole) {
      navigate(pendingDestination)
      setPendingDestination(null)
      setPendingRole(null)
    }
  }, [pendingDestination, pendingRole, auth.isAuthenticated, auth.user])


  const handleResetRequest = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address')
      return
    }
    setResetLoading(true)
    try {
      await auth.requestPasswordReset?.(resetEmail)
      setResetSent(true)
    } catch (error) {
      toast.error(error.detail || 'Failed to send reset email')
    }
    setResetLoading(false)
  }

  const handleCloseReset = () => {
    setResetOpen(false)
    setResetEmail('')
    setResetSent(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side */}
      <div className="hidden md:flex md:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative w-full h-full flex flex-col justify-center items-center text-white p-8">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4 font-outfit">Crusties</h1>
            <p className="text-xl mb-6">Sales & Stock Management System</p>
            <p className="text-base opacity-90">
              Manage your food vending business with ease. Real-time inventory
              Tracking, sales analytics, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-6 md:px-12 py-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center font-outfit">Welcome</h2>
          <Tabs
            defaultTab={0}
            tabs={[
              {
                label: 'Login',
                content: (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      icon={<Mail size={18} />}
                    />
                    <div className="relative">
                      <Input
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        icon={<Lock size={18} />}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none"
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loginLoading}>
                      {loginLoading ? 'Logging in...' : 'Login'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setResetOpen(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </form>
                )
              },
              ]}
          />
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={handleCloseReset} title="Reset Password" className="max-w-md">
        {resetSent ? (
          <div className="space-y-4 text-center">
            <div className="text-4xl">📧</div>
            <p className="font-semibold text-gray-800">Check your email</p>
            <p className="text-sm text-gray-600">
              If <strong>{resetEmail}</strong> is registered, you'll receive a
              verification code by email. The code expires in 15 minutes.
            </p>
            <p className="text-xs text-gray-400">Don't see it? Check your spam folder.</p>
            <Button variant="primary" onClick={() => navigate('/reset-password')} className="w-full">
              Enter code and reset password
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your account email and we'll send you a verification code to reset your password.
            </p>
            <Input
              type="email"
              placeholder="Your email address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              icon={<Mail size={18} />}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleCloseReset} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResetRequest}
                className="flex-1"
                disabled={resetLoading || !resetEmail}
              >
                {resetLoading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

