'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errorParam = searchParams.get('error')

  useEffect(() => {
    const updateCountdown = () => setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)))
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])

  async function sendCode() {
    if (loading || Date.now() < resendAt) return
    setLoading(true)
    setError(null)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const { error: authError } = await createClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          // Admin login must never create accounts in the shared production project.
          shouldCreateUser: false,
        },
      })
      if (authError) {
        setError(authError.message)
      } else {
        setEmail(normalizedEmail)
        setCode('')
        setSent(true)
        setResendSeconds(60)
        setResendAt(Date.now() + 60_000)
      }
    } catch {
      setError('Unable to send a code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sent) {
      await sendCode()
      return
    }
    if (loading) return
    if (!/^\d{8}$/.test(code)) {
      setError('Enter the eight-digit code from your email.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await createClient().auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })
      if (authError) {
        setError(authError.message)
      } else if (!data.session) {
        setError('Unable to sign in. Please request a new code.')
      } else {
        // A full navigation lets middleware validate the new session and admin role.
        window.location.assign('/')
      }
    } catch {
      setError('Unable to verify the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-serif text-3xl font-bold tracking-tight">
          Fitt<span className="text-primary">Match</span>
          <span className="block font-sans text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mt-2">Admin Console</span>
        </CardTitle>
        <CardDescription>
          Sign in with an eight-digit email code
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorParam === 'not_admin' && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Your account does not have admin access.
          </div>
        )}
        {errorParam === 'auth_error' && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Authentication failed. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {sent ? (
            <>
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700" role="status">
                <p className="font-medium">Check your email</p>
                <p className="mt-1">We sent a code to <strong>{email}</strong>. Enter it below within 10 minutes.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">Email code</label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  placeholder="Eight-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email address</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@fittmatch.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || (!sent && resendSeconds > 0)}>
            {loading ? (sent ? 'Signing in...' : 'Sending...') : (sent ? 'Sign in' : resendSeconds > 0 ? `Send code in ${resendSeconds}s` : 'Send email code')}
          </Button>
          {sent && (
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" disabled={loading || resendSeconds > 0} onClick={sendCode}>
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
              </Button>
              <Button type="button" variant="ghost" disabled={loading} onClick={() => {
                setSent(false)
                setCode('')
                setError(null)
              }}>
                Use a different email
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
