import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Dialog, Tabs } from '../components/ui'
import { toast } from 'sonner'
import { Mail, Lock, User, Phone, LogIn, Eye, EyeOff } from 'lucide-react'

export const LoginPage = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const { login, register } = auth

  // pending navigation ensures we only navigate after AuthContext updates
  const [pendingDestination, setPendingDestination] = useState(null)
  const [pendingRole, setPendingRole] = useState(null)
  
  // Login tab
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Register tab
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  
  // Password reset dialog
  const [resetOpen, setResetOpen] = useState(false)
  const [resetStep, setResetStep] = useState(1)
  const [resetPhone, setResetPhone] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    console.log('[LoginPage] --- LOGIN PROCESS STARTED ---')
    console.log('[LoginPage] Login credentials entered:', { email: loginEmail, timestamp: new Date().toISOString() })
    setLoginLoading(true)
    try {
      console.log('[LoginPage] Calling login() function from AuthContext...')
      const user = await login(loginEmail, loginPassword)
      console.log('[LoginPage] Login success! User received from backend:', user)
      console.log('[LoginPage] User role detected:', user.role)
      toast.success('Login successful!')

      // Decide destination but defer navigation until AuthContext reflects the new auth state
      const destination = user.role === 'admin' ? '/admin' : user.role === 'manager' ? '/manager' : '/user/pos'
      console.log('[LoginPage] Deferring navigation to:', destination)
      setPendingDestination(destination)
      setPendingRole(user.role)
    } catch (error) {
      console.error('Login error details:', error)
      const errorMsg = typeof error === 'string' ? error : error?.detail || error?.message || 'Login failed'
      toast.error(errorMsg)
    }
    setLoginLoading(false)
  }

  // Wait for AuthContext to confirm authentication and user role, then navigate
  useEffect(() => {
    if (!pendingDestination) return
    if (auth.isAuthenticated && auth.user?.role === pendingRole) {
      console.log('[LoginPage] AuthContext confirmed. Navigating to pending destination:', pendingDestination)
      navigate(pendingDestination)
      setPendingDestination(null)
      setPendingRole(null)
    } else {
      console.log('[LoginPage] Waiting for AuthContext to update before navigating...', { pendingDestination, pendingRole, authState: { isAuthenticated: auth.isAuthenticated, role: auth.user?.role } })
    }
  }, [pendingDestination, pendingRole, auth.isAuthenticated, auth.user])

  const handleRegister = async (e) => {
    e.preventDefault()
    if (regPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setRegLoading(true)
    try {
      await register(regEmail, regName, regPhone, regPassword)
      toast.success('Registration successful! Awaiting admin approval.')
      setRegEmail('')
      setRegName('')
      setRegPhone('')
      setRegPassword('')
    } catch (error) {
      toast.error(error.detail || 'Registration failed')
    }
    setRegLoading(false)
  }

  const handleResetRequest = async () => {
    setResetLoading(true)
    try {
      await auth.requestPasswordReset?.(resetPhone)
      toast.success('Verification code sent!')
      setResetStep(2)
    } catch (error) {
      toast.error(error.detail || 'Failed to send code')
    }
    setResetLoading(false)
  }

  const handleVerifyCode = async () => {
    if (resetPassword !== resetConfirm) {
      toast.error('Passwords do not match')
      return
    }
    
    setResetLoading(true)
    try {
      await auth.verifyCode?.(resetPhone, resetCode, resetPassword)
      toast.success('Password reset successful!')
      setResetOpen(false)
      setResetStep(1)
      setResetPhone('')
      setResetCode('')
      setResetPassword('')
      setResetConfirm('')
    } catch (error) {
      toast.error(error.detail || 'Failed to reset password')
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden md:flex md:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative w-full h-full flex flex-col justify-center items-center text-white p-8">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4 font-outfit">Crusties</h1>
            <p className="text-xl mb-6">Sales & Stock Management System</p>
            <p className="text-base opacity-90">
              Manage your food vending business with ease. Real-time inventory tracking, sales analytics, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Forms */}
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
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      size="lg" 
                      className="w-full"
                      disabled={loginLoading}
                    >
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
              {
                label: 'Register',
                content: (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      icon={<Mail size={18} />}
                    />
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      icon={<User size={18} />}
                    />
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                      icon={<Phone size={18} />}
                    />
                    <div className="relative">
                      <Input
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="Password (min. 6 chars)"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        icon={<Lock size={18} />}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none"
                        title={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      size="lg" 
                      className="w-full"
                      disabled={regLoading}
                    >
                      {regLoading ? 'Registering...' : 'Register'}
                    </Button>
                    <p className="text-sm text-gray-600 text-center">
                      Accounts must be approved by an administrator
                    </p>
                  </form>
                )
              }
            ]}
          />
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset Password"
        className="max-w-md"
      >
        {resetStep === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your phone number to receive a verification code
            </p>
            <Input
              type="tel"
              placeholder="Your phone number"
              value={resetPhone}
              onChange={(e) => setResetPhone(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setResetOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResetRequest}
                className="flex-1"
                disabled={resetLoading || !resetPhone}
              >
                {resetLoading ? 'Sending...' : 'Send Code'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the code sent to your phone and your new password
            </p>
            <Input
              type="text"
              placeholder="Verification code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="New password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setResetStep(1)
                  setResetCode('')
                  setResetPassword('')
                  setResetConfirm('')
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleVerifyCode}
                className="flex-1"
                disabled={resetLoading || !resetCode || !resetPassword}
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
