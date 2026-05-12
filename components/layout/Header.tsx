'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/reports': 'Reports',
  '/users': 'Users',
  '/listings': 'Listings',
  '/subscriptions': 'Subscriptions',
  '/audit-log': 'Audit Log',
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/reports/')) return 'Report Detail'
  if (pathname.startsWith('/users/')) return 'User Detail'
  return 'Admin'
}

export function Header({ adminRole }: { adminRole: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const title = getTitle(pathname)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="capitalize">
          {adminRole}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-gray-500 hover:text-gray-900"
        >
          <LogOut size={16} className="mr-1.5" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
