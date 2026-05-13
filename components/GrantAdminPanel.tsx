'use client'

import { useState } from 'react'
import { grantAdminRole, revokeAdminRole } from '@/lib/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShieldCheck, ShieldOff } from 'lucide-react'

type Props = {
  userId: string
  isAdmin: boolean
  adminRole: string | null
}

export function GrantAdminPanel({ userId, isAdmin, adminRole }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('moderator')
  const [currentState, setCurrentState] = useState({ isAdmin, adminRole })

  async function handleGrant() {
    setLoading(true)
    setError(null)
    const result = await grantAdminRole(userId, selectedRole)
    if (result.error) {
      setError(result.error)
    } else {
      setCurrentState({ isAdmin: true, adminRole: selectedRole })
    }
    setLoading(false)
  }

  async function handleRevoke() {
    setLoading(true)
    setError(null)
    const result = await revokeAdminRole(userId)
    if (result.error) {
      setError(result.error)
    } else {
      setCurrentState({ isAdmin: false, adminRole: null })
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Admin Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentState.isAdmin ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current role:</span>
              <Badge variant="secondary" className="capitalize">
                {currentState.adminRole ?? 'admin'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleRevoke}
              className="text-destructive border-destructive/30 hover:bg-red-50 hover:text-destructive"
            >
              <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
              {loading ? 'Revoking…' : 'Revoke admin access'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This user does not have admin access.
            </p>
            <div className="flex items-center gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" disabled={loading} onClick={handleGrant}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                {loading ? 'Granting…' : 'Grant access'}
              </Button>
            </div>
          </>
        )}
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
