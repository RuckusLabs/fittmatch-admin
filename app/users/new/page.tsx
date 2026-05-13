'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUser } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<'coach' | 'client'>('coach')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const fullName = fd.get('full_name') as string
    const selectedRole = fd.get('role') as 'coach' | 'client'
    const companyName = (fd.get('company_name') as string) || undefined
    const companyType = (fd.get('company_type') as string) || undefined

    const result = await createUser(email, fullName, selectedRole, {
      company_name: companyName,
      company_type: companyType,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/users/${result.userId}`)
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/users"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">Create User</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="user@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Jane Smith"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Role <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-3">
                {(['coach', 'client'] as const).map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="accent-primary"
                    />
                    <span className="text-sm capitalize">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Client-only fields */}
            {role === 'client' && (
              <div className="space-y-4 rounded-md border border-dashed p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Studio / Company
                </p>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="company_name">
                    Company Name
                  </label>
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    placeholder="Acme Fitness"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="company_type">
                    Company Type
                  </label>
                  <select
                    id="company_type"
                    name="company_type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Select type —</option>
                    <option value="gym">Gym</option>
                    <option value="studio">Studio</option>
                    <option value="corporate">Corporate Wellness</option>
                    <option value="sports_team">Sports Team</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/users">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The user will receive a magic-link email to set their password and activate their account.
      </p>
    </div>
  )
}
