import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'FittMatch Admin',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const adminRole = headersList.get('x-admin-role')

  if (!adminRole) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50 flex items-center justify-center">
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header adminRole={adminRole} />
            <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
