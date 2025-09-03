import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
//
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import PWASetup from '@/components/PWASetup'
import { Toaster } from 'sonner'
import ThemeToggle from '@/components/ThemeToggle'
import DropGuard from '@/components/DropGuard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'iCloudEZ - Your Personal iCloud',
  description: 'Secure, private cloud storage with real-time sync across all devices. Like iCloud but completely under your control.',
  keywords: 'cloud storage, documents, secure, private, personal, sync, iCloud alternative, file management',
  authors: [{ name: 'iCloudEZ Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'iCloudEZ'
  },
  openGraph: {
    title: 'iCloudEZ - Your Personal iCloud',
    description: 'Secure, private cloud storage with real-time sync across all devices',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iCloudEZ - Your Personal iCloud',
    description: 'Secure, private cloud storage with real-time sync across all devices'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="iCloudEZ" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100`}>
        <AuthProvider>
          <PWASetup />
          <DropGuard />
          {/* Global Home link removed to rely on brand click in headers */}
          <div className="fixed bottom-4 right-4 z-50">
            <ThemeToggle />
          </div>
          {children}
          <Toaster 
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
