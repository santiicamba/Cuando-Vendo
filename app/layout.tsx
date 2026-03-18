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
    apple: 'data:image/png;base64,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',
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
        <link rel="apple-touch-icon" href="data:image/png;base64,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" />
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
