import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Outfit, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

// Same typefaces as the mobile app: Outfit for UI text, Playfair Display for headings.
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], variable: '--font-playfair' })
const fontVars = `${outfit.variable} ${playfair.variable}`

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
      <html lang="en" className={fontVars}>
        <body className="min-h-screen bg-background flex items-center justify-center">
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className={fontVars}>
      <body>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header adminRole={adminRole} />
            <main className="flex-1 overflow-y-auto p-6 bg-background">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
