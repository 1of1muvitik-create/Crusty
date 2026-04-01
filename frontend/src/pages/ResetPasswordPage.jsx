import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { Mail, Key, Lock, Eye, EyeOff } from 'lucide-react'

export const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !code || !password || !confirmPassword) {
      toast.error('Fill in all fields')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await auth.confirmPasswordReset(email, code, password)
      toast.success('Password reset successfully!')
      setSuccess(true)
    } catch (error) {
      toast.error(error.detail || error.message || 'Failed to reset password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="max-w-md w-full p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your email, the verification code sent to your inbox, and choose a new password.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <p className="text-green-600 font-semibold">Your password has been reset.</p>
            <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Sign in</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={<Mail size={18} />}
              required
            />
            <Input
              type="text"
              label="Verification Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              icon={<Key size={18} />}
              required
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                icon={<Lock size={18} />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[42px] text-gray-600 hover:text-gray-900"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                icon={<Lock size={18} />}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-[42px] text-gray-600 hover:text-gray-900"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/login')}>Back to login</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
