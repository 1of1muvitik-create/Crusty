import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Enter your email address')
      return
    }
    setLoading(true)
    try {
      await auth.requestPasswordReset(email)
      toast.success('Verification code sent if that email is registered')
      setSent(true)
    } catch (error) {
      toast.error(error.detail || error.message || 'Failed to send password reset email')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="max-w-md w-full p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your email to receive a verification code, then continue to reset your password.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Only registered Crusties users will receive a reset code.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-green-600 font-semibold">Check your inbox for the verification code.</p>
            <Button variant="primary" className="w-full" onClick={() => navigate('/reset-password')}>
              Continue to reset password
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/login')}>
              Back to login
            </Button>
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
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset code'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/login')}>
              Back to login
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
