'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Flag,
  Users,
  Briefcase,
  CreditCard,
  ClipboardList,
  Menu,
  BadgeCheck,
  Ticket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/listings', label: 'Listings', icon: Briefcase },
  { href: '/verifications', label: 'Verifications', icon: BadgeCheck },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/promo-codes', label: 'Promo Codes', icon: Ticket },
  { href: '/audit-log', label: 'Audit Log', icon: ClipboardList },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="p-1.5 text-gray-500 hover:text-gray-900"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 bg-slate-900 text-white w-60 border-slate-700">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="px-6 py-5 border-b border-slate-700">
            <h1 className="font-bold text-lg tracking-tight text-white">FittMatch</h1>
            <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
