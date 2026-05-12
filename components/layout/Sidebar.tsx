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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/listings', label: 'Listings', icon: Briefcase },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/audit-log', label: 'Audit Log', icon: ClipboardList },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="font-bold text-lg tracking-tight">FittMatch</h1>
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
    </aside>
  )
}
