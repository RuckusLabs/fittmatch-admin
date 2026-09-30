'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Flag,
  Users,
  Briefcase,
  CreditCard,
  ClipboardList,
  BadgeCheck,
  Ban,
  Megaphone,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/listings', label: 'Listings', icon: Briefcase },
  { href: '/verifications', label: 'Verifications', icon: BadgeCheck },
  { href: '/blocks', label: 'Blocks', icon: Ban },
  { href: '/broadcast', label: 'Broadcast', icon: Megaphone },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/promo-codes', label: 'Promo Codes', icon: Ticket },
  { href: '/audit-log', label: 'Audit Log', icon: ClipboardList },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-card border-r border-border hidden md:flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <p className="font-serif text-2xl font-bold tracking-tight leading-none">
          Fitt<span className="text-primary">Match</span>
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mt-1.5">Admin Console</p>
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
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
