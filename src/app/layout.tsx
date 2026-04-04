import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

export const metadata = {
  title: 'Argus — The Seer',
  description: 'See everything. Miss nothing. Manage projects, modules, tasks, and team performance with all-seeing intelligence.',
  keywords: ['LMS', 'project management', 'AI coordinator', 'production tracking'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body><div id="app-root">{children}</div></body>
    </html>
  )
}
