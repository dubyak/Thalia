import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { RootLayoutProviders } from '@/components/RootLayoutProviders'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Tala MSME',
  description: 'Tala MSME Agent — Mexico',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tala'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#083032'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-MX" className={jakarta.variable}>
      <body className="min-h-dvh bg-[#1f1c2f] flex justify-center items-start">
        {/* Mobile frame — centers the 390px app on desktop */}
        <div
          className="relative w-full bg-[#f5f6f0] min-h-dvh overflow-hidden"
          style={{ maxWidth: 'var(--app-max-width)' }}
        >
          <RootLayoutProviders>{children}</RootLayoutProviders>
        </div>
      </body>
    </html>
  )
}
