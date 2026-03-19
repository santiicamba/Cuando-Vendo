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
  manifest: '/manifest.json?v=2',
  icons: {
    icon: [
      {
        url: '/icon-192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: '/icon-192.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cuando Vendo?',
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
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png?v=2" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png?v=2" />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-TileImage" content="/icon-192.png?v=2" />
        <meta name="theme-color" content="#059669" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js?v=2').then(function(registration) {
                    console.log('ServiceWorker registration successful');
                  }).catch(function(err) {
                    console.log('ServiceWorker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
