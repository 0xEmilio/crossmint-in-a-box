import './globals.css';
import type { Metadata } from 'next';
import { AppThemeProvider, NO_FLASH_THEME_SCRIPT } from '@/lib/theme/AppThemeProvider';

export const metadata: Metadata = {
  title: 'Crossmint Auth Demo',
  description: 'A demo application showcasing Crossmint authentication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  )
}
