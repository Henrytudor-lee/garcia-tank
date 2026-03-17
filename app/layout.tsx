import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/src/components/Providers'

export const metadata: Metadata = {
  title: '坦克大战 - Battle City',
  description: '经典坦克大战 Web 复刻版',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
