import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: '¿Cuándo Vendo? - CEDEAR Investment Tracker',
  description: 'Seguí el rendimiento de tus CEDEARs en tiempo real. Calculá el retorno real considerando el precio del activo, tipo de cambio CCL y ratio de conversión.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '¿Cuándo Vendo?',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#10B981',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cuando Vendo?" />
        <meta name="apple-mobile-web-app-icon-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <meta name="theme-color" content="#059669" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
